"""
backtest_engine.py — Core backtest logic for EdgeScan.

Strategy:
  - Universe  : top N stocks from SP500_TICKERS
  - Signal    : 8-indicator technical score
                (RSI, MACD, 200MA, OBV slope, 52W high, ROC-20, ADX, Rel-Str vs SPY)
  - Entry     : close of first trading day of each month
  - Exit      : close of last trading day of same month
  - Sizing    : portfolio_value / n_valid_picks (equal weight, full rebalance each period)
  - Hold      : 1 or 3 months between full rebalances
  - Benchmark : SPY buy-and-hold from Jan 2020

Performance note:
  Indicators are precomputed once per stock on the full time series, then sampled
  at each month boundary with searchsorted.  This is ~30x faster than the naive
  approach of rerunning compute_technicals for every (stock, month) pair.
"""

import warnings
from datetime import date, timedelta

import numpy as np
import pandas as pd
import yfinance as yf

warnings.filterwarnings("ignore")

from data_fetcher import SP500_TICKERS
from scanner import (
    _score_distance_from_52w_high,
    _score_macd,
    _score_price_vs_200ma,
    _score_rsi,
    _score_volume,
    _score_obv_slope,
    _score_roc_20,
    _score_adx,
    _score_relative_strength,
)
from technicals import _rsi, _ema, _sma, _adx, _obv, _roc

START = date(2020, 1, 1)
STARTING_CAPITAL = 6_000.0
PICKS = 3


def _month_list() -> list[date]:
    today = date.today()
    months, d = [], date(START.year, START.month, 1)
    while True:
        next_m = date(d.year + (d.month // 12), (d.month % 12) + 1, 1)
        if (next_m - timedelta(days=1)) >= today:
            break
        months.append(d)
        d = next_m
    return months


def _precompute_indicators(
    close: pd.Series,
    volume: pd.Series,
    high: pd.Series,
    low: pd.Series,
    spy_3m_s: pd.Series,
) -> dict | None:
    """Compute all indicator series once on the full price history.
    Returns None if the series is too short to be useful."""
    if len(close) < 50:
        return None

    # ---- RSI ----
    rsi_s = _rsi(close, 14)

    # ---- MACD ----
    macd_line      = _ema(close, 12) - _ema(close, 26)
    signal_s       = _ema(macd_line, 9)
    macd_above_s   = (macd_line > signal_s)
    crossed_up_s   = macd_above_s & ~macd_above_s.shift(1).fillna(False)
    recent_cross_s = crossed_up_s.rolling(5, min_periods=1).sum() > 0

    # ---- 200MA ----
    ma200_s   = _sma(close, 200) if len(close) >= 200 else _sma(close, len(close))
    pct_200_s = (close - ma200_s) / ma200_s.replace(0, np.nan) * 100

    # ---- 52-week high distance ----
    w52_high_s = high.rolling(252, min_periods=50).max()
    from_52w_s = (close - w52_high_s) / w52_high_s.replace(0, np.nan) * 100

    # ---- Volume status (directional: matches compute_technicals exactly) ----
    avg_vol_20    = volume.rolling(20, min_periods=10).mean()
    high_vol_day  = volume > avg_vol_20
    price_up      = close.diff() > 0
    up_hvol_s     = (price_up & high_vol_day).rolling(5, min_periods=1).sum()
    down_hvol_s   = (~price_up & high_vol_day).rolling(5, min_periods=1).sum()
    vol_status_s  = pd.Series(0.0, index=close.index)
    vol_status_s[up_hvol_s >= 2]   = 1.0   # bullish
    vol_status_s[down_hvol_s >= 2] = -1.0  # bearish

    # ---- OBV slope (20-day normalized change) ----
    obv_s       = _obv(close, volume)
    avg_vol_20  = volume.rolling(20, min_periods=10).mean().replace(0, np.nan)
    obv_slope_s = (obv_s - obv_s.shift(20)) / avg_vol_20 * 100

    # ---- ROC-20 ----
    roc_20_s = _roc(close, 20)

    # ---- ADX ----
    adx_s = _adx(high, low, close, 14)

    # ---- Relative strength vs SPY (63-day rolling) ----
    stock_3m_s  = close.pct_change(63) * 100
    spy_aligned = spy_3m_s.reindex(close.index, method="ffill")
    rs_vs_spy_s = stock_3m_s - spy_aligned

    return {
        "rsi":          rsi_s,
        "macd_above":   macd_above_s,
        "recent_cross": recent_cross_s,
        "pct_200ma":    pct_200_s,
        "from_52w":     from_52w_s,
        "vol_status":   vol_status_s,
        "obv_slope":    obv_slope_s,
        "roc_20":       roc_20_s,
        "adx":          adx_s,
        "rs_vs_spy":    rs_vs_spy_s,
        "close":        close,
    }


def _val_before(s: pd.Series, cutoff: pd.Timestamp) -> float:
    """Fast O(log n) lookup of the last value in s strictly before cutoff."""
    idx = s.index.searchsorted(cutoff, side="left") - 1
    if idx < 0:
        return np.nan
    v = s.iloc[idx]
    return float(v) if not pd.isna(v) else np.nan


def _score_at_cutoff(ind: dict, cutoff: pd.Timestamp) -> float:
    """Score a stock at a given cutoff date using its precomputed indicator dict."""
    rsi = _val_before(ind["rsi"], cutoff)
    if np.isnan(rsi):
        return 0.0

    macd_above   = bool(_val_before(ind["macd_above"],   cutoff))
    recent_cross = bool(_val_before(ind["recent_cross"], cutoff))
    macd_status  = "bullish_crossover" if recent_cross else ("above_signal" if macd_above else "below_signal")

    pct_200ma = _val_before(ind["pct_200ma"], cutoff)
    from_52w  = _val_before(ind["from_52w"],  cutoff)
    vol_raw   = _val_before(ind["vol_status"], cutoff)
    obv_slope = _val_before(ind["obv_slope"], cutoff)
    roc_20    = _val_before(ind["roc_20"],    cutoff)
    adx       = _val_before(ind["adx"],       cutoff)
    rs_vs_spy = _val_before(ind["rs_vs_spy"], cutoff)

    if np.isnan(pct_200ma): pct_200ma = 0.0
    if np.isnan(from_52w):  from_52w  = 0.0
    if np.isnan(vol_raw):   vol_raw   = 0.0
    if np.isnan(obv_slope): obv_slope = 0.0
    if np.isnan(roc_20):    roc_20    = 0.0
    if np.isnan(adx):       adx       = 20.0
    if np.isnan(rs_vs_spy): rs_vs_spy = 0.0

    volume_status = "bullish" if vol_raw >= 1.0 else ("bearish" if vol_raw <= -1.0 else "neutral")

    return float(
        _score_rsi(rsi)
        + _score_macd(macd_status)
        + _score_price_vs_200ma(pct_200ma)
        + _score_volume(volume_status)
        + _score_distance_from_52w_high(from_52w)
        + _score_obv_slope(obv_slope)
        + _score_roc_20(roc_20)
        + _score_adx(adx)
        + _score_relative_strength(rs_vs_spy)
    )


def _to_series(x) -> pd.Series:
    if isinstance(x, pd.DataFrame):
        return x.iloc[:, 0]
    return x


def _px_on_or_after(s, d: date):
    s = _to_series(s)
    sub = s[s.index >= pd.Timestamp(d)]
    if not len(sub):
        return None
    val = sub.iloc[0]
    return float(val.iloc[0]) if isinstance(val, pd.Series) else float(val)


def _px_on_or_before(s, d: date):
    s = _to_series(s)
    sub = s[s.index <= pd.Timestamp(d)]
    if not len(sub):
        return None
    val = sub.iloc[-1]
    return float(val.iloc[0]) if isinstance(val, pd.Series) else float(val)


def run_backtest(n_stocks: int = 100, hold_months: int = 1) -> dict:
    tickers = SP500_TICKERS[:n_stocks]
    months  = _month_list()

    # Download price data (extra year for MA200 warm-up)
    dl_start = f"{START.year - 1}-01-01"
    raw = yf.download(tickers, start=dl_start, auto_adjust=True, progress=False, threads=True)

    if isinstance(raw.columns, pd.MultiIndex):
        close_all  = raw["Close"].ffill()
        volume_all = raw["Volume"].ffill()
        high_all   = raw["High"].ffill()
        low_all    = raw["Low"].ffill()
    else:
        close_all  = raw[["Close"]].ffill().rename(columns={"Close": tickers[0]})
        volume_all = raw[["Volume"]].ffill().rename(columns={"Volume": tickers[0]})
        high_all   = raw[["High"]].ffill().rename(columns={"High": tickers[0]})
        low_all    = raw[["Low"]].ffill().rename(columns={"Low": tickers[0]})

    available = [t for t in tickers if t in close_all.columns]

    # SPY benchmark
    spy_raw   = yf.download("SPY", start=dl_start, auto_adjust=True, progress=False)
    spy_close = _to_series(spy_raw["Close"].ffill() if "Close" in spy_raw.columns else spy_raw.iloc[:, 0].ffill())
    spy_entry = _px_on_or_after(spy_close, START)
    spy_today = float(spy_close.iloc[-1])
    spy_total_ret = (spy_today - spy_entry) / spy_entry
    spy_final     = STARTING_CAPITAL * (1 + spy_total_ret)

    # SPY 63-day rolling return (for relative strength scoring)
    spy_3m_s = spy_close.pct_change(63) * 100

    # ── Precompute indicator series (once per stock) ──────────────────────────
    precomputed: dict[str, dict] = {}
    for t in available:
        ind = _precompute_indicators(
            close_all[t].dropna(),
            volume_all[t].dropna(),
            high_all[t].dropna(),
            low_all[t].dropna(),
            spy_3m_s,
        )
        if ind is not None:
            precomputed[t] = ind

    scored_tickers = list(precomputed.keys())

    # ── Pass 1: score all months using precomputed indicators ─────────────────
    all_monthly_scores: list[dict[str, float]] = []

    for m in months:
        cutoff = pd.Timestamp(m)
        scores: dict[str, float] = {}
        for t in scored_tickers:
            s = _score_at_cutoff(precomputed[t], cutoff)
            if s > 0:
                scores[t] = s
        all_monthly_scores.append(scores)

    # ── Pass 2: simulate — full equal-weight rebalance every hold_months ──────
    portfolio_value = STARTING_CAPITAL
    monthly_results: list[dict] = []
    held_positions: dict[str, float] = {}   # ticker -> shares
    held_scores:    dict[str, float] = {}

    for i, m in enumerate(months):
        is_rebal  = (i % hold_months == 0)
        next_m    = date(m.year + (m.month // 12), (m.month % 12) + 1, 1)
        month_end = next_m - timedelta(days=1)

        if is_rebal:
            scores = all_monthly_scores[i]
            if len(scores) >= PICKS:
                top3 = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:PICKS]
                held_scores = {t: s for t, s in top3}

                valid_entries: dict[str, float] = {}
                for t, _ in top3:
                    ep = _px_on_or_after(close_all[t], m)
                    if ep and ep > 0:
                        valid_entries[t] = ep

                if valid_entries:
                    alloc = portfolio_value / len(valid_entries)
                    held_positions = {t: alloc / ep for t, ep in valid_entries.items()}
                else:
                    held_positions = {}
            else:
                held_positions = {}

        if not held_positions:
            continue

        month_pnl = 0.0
        holdings: list[dict] = []

        for t, shares in held_positions.items():
            if t not in close_all.columns:
                continue
            ep = _px_on_or_after(close_all[t], m)
            xp = _px_on_or_before(close_all[t], month_end)
            if not ep or not xp or ep <= 0 or shares <= 0:
                continue

            ret = (xp - ep) / ep * 100
            pnl = shares * (xp - ep)
            month_pnl += pnl

            holdings.append({
                "ticker":     t,
                "score":      round(held_scores.get(t, 0), 0),
                "entry":      round(ep, 2),
                "exit":       round(xp, 2),
                "return_pct": round(ret, 2),
                "pnl":        round(pnl, 2),
            })

        if not holdings:
            continue

        port_ret        = month_pnl / portfolio_value * 100
        portfolio_value += month_pnl

        spy_ep  = _px_on_or_after(spy_close, m)
        spy_xp  = _px_on_or_before(spy_close, month_end)
        spy_ret = ((spy_xp - spy_ep) / spy_ep * 100) if (spy_ep and spy_xp) else None

        monthly_results.append({
            "month":           m.strftime("%Y-%m"),
            "holdings":        holdings,
            "port_return_pct": round(port_ret, 2),
            "portfolio_value": round(portfolio_value, 2),
            "spy_return_pct":  round(spy_ret, 2) if spy_ret is not None else None,
            "vs_spy_pct":      round(port_ret - spy_ret, 2) if spy_ret is not None else None,
        })

    if not monthly_results:
        return {"error": "No results computed"}

    # Yearly summary
    df = pd.DataFrame(monthly_results)
    df["year"] = df["month"].apply(lambda s: int(s[:4]))
    yearly = []
    for year, grp in df.groupby("year"):
        first_val = grp["portfolio_value"].iloc[0] / (1 + grp["port_return_pct"].iloc[0] / 100)
        last_val  = grp["portfolio_value"].iloc[-1]
        yr_port   = (last_val - first_val) / first_val * 100
        spy_rets  = grp["spy_return_pct"].dropna()
        yr_spy    = ((1 + spy_rets / 100).prod() - 1) * 100
        yearly.append({
            "year":               int(year),
            "port_return_pct":    round(yr_port, 2),
            "spy_return_pct":     round(yr_spy, 2),
            "outperformance_pct": round(yr_port - yr_spy, 2),
            "end_value":          round(last_val, 2),
        })

    final_val  = monthly_results[-1]["portfolio_value"]
    total_ret  = (final_val - STARTING_CAPITAL) / STARTING_CAPITAL * 100
    winners    = sum(1 for r in monthly_results if r["port_return_pct"] > 0)
    beat_spy   = sum(1 for r in monthly_results if r["vs_spy_pct"] is not None and r["vs_spy_pct"] > 0)
    n          = len(monthly_results)

    return {
        "monthly": monthly_results,
        "yearly":  yearly,
        "summary": {
            "start_date":           months[0].strftime("%Y-%m"),
            "end_date":             months[-1].strftime("%Y-%m"),
            "n_stocks":             n_stocks,
            "stocks_available":     len(scored_tickers),
            "months_traded":        n,
            "starting_capital":     STARTING_CAPITAL,
            "final_value":          round(final_val, 2),
            "total_return_pct":     round(total_ret, 2),
            "spy_final_value":      round(spy_final, 2),
            "spy_total_return_pct": round(spy_total_ret * 100, 2),
            "outperformance_pct":   round(total_ret - spy_total_ret * 100, 2),
            "winning_months":       winners,
            "winning_months_pct":   round(winners / n * 100, 1),
            "beat_spy_months":      beat_spy,
            "beat_spy_months_pct":  round(beat_spy / n * 100, 1),
            "hold_months":          hold_months,
        },
    }
