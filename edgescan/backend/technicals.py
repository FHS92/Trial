"""
technicals.py — Technical indicator calculations for EdgeScan.
Implements RSI, MACD, SMA, volume signals, and 52W position
using only pandas and numpy (no pandas-ta dependency).
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


def compute_technicals(df: Optional[pd.DataFrame]) -> dict:
    """
    Given a yfinance OHLCV DataFrame (indexed by date),
    compute all technical indicators needed by the scoring engine.
    Returns a dict of signal values.
    """
    if df is None or len(df) < 50:
        return _empty_technicals()

    df = df.copy()
    # Normalise column names (yfinance can return 'close' or 'Close')
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
    }
