"""
technicals.py — Technical indicator calculations for EdgeScan v2.
Implements RSI, MACD, SMA, volume signals, 52W position,
ADX, OBV slope, and ROC using only pandas and numpy.

Copied exactly from v1 — pure pandas/numpy, no external dependencies.
"""

import pandas as pd
import numpy as np
from typing import Optional


def _sma(series: pd.Series, length: int) -> pd.Series:
    return series.rolling(window=length).mean()


def _ema(series: pd.Series, length: int) -> pd.Series:
    return series.ewm(span=length, adjust=False).mean()


def _rsi(series: pd.Series, length: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=length - 1, adjust=False).mean()
    avg_loss = loss.ewm(com=length - 1, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = _ema(series, fast)
    ema_slow = _ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = _ema(macd_line, signal)
    return macd_line, signal_line


def _adx(high: pd.Series, low: pd.Series, close: pd.Series, length: int = 14) -> pd.Series:
    up_move = high.diff()
    down_move = -low.diff()
    plus_dm = pd.Series(
        np.where((up_move > down_move) & (up_move > 0), up_move, 0.0),
        index=high.index,
    )
    minus_dm = pd.Series(
        np.where((down_move > up_move) & (down_move > 0), down_move, 0.0),
        index=high.index,
    )
    tr = pd.concat([
        high - low,
        (high - close.shift(1)).abs(),
        (low - close.shift(1)).abs(),
    ], axis=1).max(axis=1)
    atr = tr.ewm(com=length - 1, adjust=False).mean()
    plus_di = 100 * plus_dm.ewm(com=length - 1, adjust=False).mean() / atr
    minus_di = 100 * minus_dm.ewm(com=length - 1, adjust=False).mean() / atr
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    return dx.ewm(com=length - 1, adjust=False).mean()


def _obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    direction = np.sign(close.diff())
    direction.iloc[0] = 0
    return (direction * volume).cumsum()


def _roc(series: pd.Series, length: int = 20) -> pd.Series:
    return ((series - series.shift(length)) / series.shift(length).replace(0, np.nan)) * 100


def compute_technicals(df: Optional[pd.DataFrame]) -> dict:
    """
    Given a yfinance OHLCV DataFrame (indexed by date),
    compute all technical indicators needed by the scoring engine.
    Returns a dict of signal values.

    The DataFrame must have columns Open/High/Low/Close/Volume (title case)
    OR open/high/low/close/volume (lower case) — both are normalized internally.
    Requires at least 50 bars; returns empty_technicals() otherwise.
    """
    if df is None or len(df) < 50:
        return _empty_technicals()

    df = df.copy()
    # Normalize column names to title case (e.g. "close" → "Close")
    df.columns = [c.title() if isinstance(c, str) else c for c in df.columns]

    close = df["Close"].squeeze().astype(float)
    volume = df["Volume"].squeeze().astype(float)
    high = df["High"].squeeze().astype(float)
    low = df["Low"].squeeze().astype(float)

    # ---- RSI 14 ----
    rsi_series = _rsi(close, 14)
    rsi = float(rsi_series.iloc[-1]) if not rsi_series.empty else 50.0
    if np.isnan(rsi):
        rsi = 50.0

    # ---- MACD ----
    macd_line, signal_line = _macd(close)
    last_macd = float(macd_line.iloc[-1])
    last_signal = float(signal_line.iloc[-1])

    crossover = False
    if len(macd_line) >= 6:
        for i in range(-5, 0):
            prev_below = macd_line.iloc[i - 1] < signal_line.iloc[i - 1]
            curr_above = macd_line.iloc[i] >= signal_line.iloc[i]
            if prev_below and curr_above:
                crossover = True
                break

    if crossover:
        macd_status = "bullish_crossover"
    elif last_macd > last_signal:
        macd_status = "above_signal"
    else:
        macd_status = "below_signal"

    # ---- Moving averages ----
    ma50_series = _sma(close, 50)
    ma200_series = _sma(close, 200) if len(close) >= 200 else _sma(close, len(close))
    ma50 = float(ma50_series.iloc[-1])
    ma200 = float(ma200_series.iloc[-1])
    if np.isnan(ma50):
        ma50 = float(close.mean())
    if np.isnan(ma200):
        ma200 = float(close.mean())

    current_price = float(close.iloc[-1])
    pct_above_200ma = ((current_price - ma200) / ma200) * 100 if ma200 > 0 else 0.0

    # ---- 52-week high / low ----
    last_252 = min(252, len(close))
    week52_high = float(high.iloc[-last_252:].max())
    week52_low = float(low.iloc[-last_252:].min())
    from_52w_high = ((current_price - week52_high) / week52_high) * 100

    # ---- Volume confirmation (last 5 days vs 20-day avg) ----
    avg_volume = float(volume.iloc[-20:].mean()) if len(volume) >= 20 else float(volume.mean())
    last_5_vol = volume.iloc[-5:]
    last_5_close = close.iloc[-5:]
    last_5_prev = close.iloc[-6:-1]

    up_on_high_vol = 0
    down_on_high_vol = 0
    for i in range(min(5, len(last_5_vol), len(last_5_prev))):
        day_vol = float(last_5_vol.iloc[i])
        day_chg = float(last_5_close.iloc[i]) - float(last_5_prev.iloc[i])
        if day_vol > avg_volume:
            if day_chg > 0:
                up_on_high_vol += 1
            else:
                down_on_high_vol += 1

    if up_on_high_vol >= 2:
        volume_status = "bullish"
    elif down_on_high_vol >= 2:
        volume_status = "bearish"
    else:
        volume_status = "neutral"

    # ---- ADX (trend strength) ----
    if len(close) >= 30:
        adx_series = _adx(high, low, close, 14)
        adx = float(adx_series.iloc[-1])
        if np.isnan(adx):
            adx = 20.0
    else:
        adx = 20.0

    # ---- OBV slope (20-day, normalised by avg daily volume) ----
    obv_series = _obv(close, volume)
    if len(obv_series) >= 20:
        y = obv_series.iloc[-20:].values.astype(float)
        slope = float(np.polyfit(np.arange(20, dtype=float), y, 1)[0])
        avg_vol_20 = float(volume.iloc[-20:].mean())
        obv_slope_pct = (slope / avg_vol_20 * 100) if avg_vol_20 > 0 else 0.0
        if np.isnan(obv_slope_pct):
            obv_slope_pct = 0.0
    else:
        obv_slope_pct = 0.0

    # ---- ROC-20 ----
    roc_series = _roc(close, 20)
    roc_20 = float(roc_series.iloc[-1]) if len(roc_series) > 20 else 0.0
    if np.isnan(roc_20):
        roc_20 = 0.0

    return {
        "rsi": round(rsi, 1),
        "macd_status": macd_status,
        "macd_value": round(last_macd, 4),
        "signal_value": round(last_signal, 4),
        "ma50": round(ma50, 2),
        "ma200": round(ma200, 2),
        "pct_above_200ma": round(pct_above_200ma, 2),
        "from_52w_high": round(from_52w_high, 2),
        "week52_high": round(week52_high, 2),
        "week52_low": round(week52_low, 2),
        "volume_status": volume_status,
        "avg_volume": int(avg_volume),
        "current_price": round(current_price, 2),
        "adx": round(adx, 1),
        "obv_slope_pct": round(obv_slope_pct, 3),
        "roc_20": round(roc_20, 2),
    }


def _empty_technicals() -> dict:
    return {
        "rsi": 50.0,
        "macd_status": "unknown",
        "macd_value": 0.0,
        "signal_value": 0.0,
        "ma50": 0.0,
        "ma200": 0.0,
        "pct_above_200ma": 0.0,
        "from_52w_high": 0.0,
        "week52_high": 0.0,
        "week52_low": 0.0,
        "volume_status": "neutral",
        "avg_volume": 0,
        "current_price": 0.0,
        "adx": 20.0,
        "obv_slope_pct": 0.0,
        "roc_20": 0.0,
    }
