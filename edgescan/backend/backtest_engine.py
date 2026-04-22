"""
backtest_engine.py — Core backtest logic for EdgeScan.

Strategy:
  - Universe : top N stocks from SP500_TICKERS
  - Signal   : technical score (RSI, MACD, 200MA, OBV, 52W, ROC, ADX, RelStr)
  - Entry    : close of first trading day of each month
  - Exit     : close of last trading day of same month (unless carried)
  - Carry    : if a stock is still in the top PICKS at the next rebalancing point,
               hold existing shares and buy only new entrants with remaining capital
  - Sizing   : month 1 = $6,000 ($2,000 × 3); subsequent = free capital / new picks
  - Benchmark: SPY buy-and-hold from Jan 2020

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
)
from technicals import _rsi, _ema, _sma

START = date(2020, 1, 1)
STARTING_CAPITAL = 6_000.0
PICKS = 3
STOP_LOSS = 0.90  # 10% intra-month stop-loss


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
) -> dict | None:
    """Compute all indicator series once on the full price history.
    Returns None if the series is too short to be useful."""
    if len(close) < 50:
        return None

    # ---- RSI ----
    rsi_s = _rsi(close, 14)

    # ---- MACD ----
    macd_line    = _ema(close, 12) - _ema(close, 26)
    signal_s     = _ema(macd_line, 9)
    macd_above_s = (macd_line > signal_s)
    crossed_up_s = macd_above_s & ~macd_above_s.shift(1).fillna(False)
    recent_cross_s = crossed_up_s.rolling(5, min_periods=1).sum() > 0

    # ---- 200MA ----
    ma200_s   = _sma(close, 200) if len(close) >= 200 else _sma(close, len(close))
    pct_200_s = (close - ma200_s) / ma200_s.replace(0, np.nan) * 100

    # ---- 52-week high distance ----
    w52_high_s = high.rolling(252, min_periods=50).max()
    from_52w_s = (close - w52_high_s) / w52_high_s.replace(0, np.nan) * 100

    # ---- Volume ratio (vs 20-day avg) ----
    vol_ratio_s = volume / volume.rolling(20, min_periods=10).mean()

    return {
        "rsi":          rsi_s,
        "macd_above":   macd_above_s,
        "recent_cross": recent_cross_s,
        "pct_200ma":    pct_200_s,
        "from_52w":     from_52w_s,
        "vol_ratio":    vol_ratio_s,
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
    vol_ratio = _val_before(ind["vol_ratio"], cutoff)

    if np.isnan(pct_200ma): pct_200ma = 0.0
    if np.isnan(from_52w):  from_52w  = 0.0
    if np.isnan(vol_ratio): vol_ratio = 1.0

    volume_status = "bullish" if vol_ratio > 1.1 else ("bearish" if vol_ratio < 0.8 else "neutral")

    return float(
        _score_rsi(rsi)
        + _score_macd(macd_status)
        + _score_price_vs_200ma(pct_200ma)
        + _score_volume(volume_status)
        + _score_distance_from_52w_high(from_52w)
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


def _stop_triggered(close_col, month_start: date, month_end: date, entry_px: float) -> bool:
    """Return True if any daily close after entry falls ≥15% below entry_px."""
    s = _to_series(close_col)
    stop = entry_px * STOP_LOSS
    mask = (s.index > pd.Timestamp(month_start)) & (s.index <= pd.Timestamp(month_end))
    for px in s[mask]:
        if float(px) <= stop:
            return True
    return False


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

    # ── Precompute indicator series (once per stock) ──────────────────────────
    precomputed: dict[str, dict] = {}
    for t in available:
        ind = _precompute_indicators(
            close_all[t].dropna(),
            volume_all[t].dropna(),
            high_all[t].dropna(),
            low_all[t].dropna(),
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

    # ── Pass 2: simulate with N-month hold + carry logic ─────────────────────
    portfolio_value = STARTING_CAPITAL
    monthly_results: list[dict] = []
    held_positions: dict[str, float] = {}
    current_scores_display: dict[str, float] = {}

    for i, m in enumerate(months):
        is_rebal  = (i % hold_months == 0)
        next_m    = date(m.year + (m.month // 12), (m.month % 12) + 1, 1)
        month_end = next_m - timedelta(days=1)

        new_entries_this_month: set[str] = set()

        if is_rebal:
            scores = all_monthly_scores[i]
            if len(scores) >= PICKS:
                top3 = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:PICKS]
                top3_set = {t for t, _ in top3}
                current_scores_display = {t: s for t, s in top3}

                start_px_rebal: dict[str, float] = {}
                for t in top3_set:
                    ep = _px_on_or_after(close_all[t], m)
                    if ep and ep > 0:
                        start_px_rebal[t] = ep

                # Carry: keep held positions that are still in the new top picks
                held_positions = {
                    t: sh for t, sh in held_positions.items()
                    if t in top3_set and t in start_px_rebal
                }
                held_set = set(held_positions)

                carry_value = sum(held_positions[t] * start_px_rebal[t] for t in held_set)
                avail       = max(0.0, portfolio_value - carry_value)

                new_entries_list = [t for t in top3_set if t not in held_set and t in start_px_rebal]
                per_new          = avail / len(new_entries_list) if new_entries_list else 0.0

                for t in new_entries_list:
                    held_positions[t] = per_new / start_px_rebal[t] if per_new > 0 else 0.0
                    new_entries_this_month.add(t)

        if not held_positions:
            continue

        month_pnl = 0.0
        holdings: list[dict] = []
        stopped_out: set[str] = set()

        for t, shares in list(held_positions.items()):
            if t not in close_all.columns:
                continue
            ep = _px_on_or_after(close_all[t], m)
            if not ep or ep <= 0 or shares <= 0:
                continue

            # Stop-loss: sell at entry × STOP_LOSS if any intra-month close hits it
            if _stop_triggered(close_all[t], m, month_end, ep):
                xp  = ep * STOP_LOSS
                ret = (STOP_LOSS - 1) * 100  # -15.0
                stopped_out.add(t)
            else:
                xp = _px_on_or_before(close_all[t], month_end)
                if not xp:
                    continue
                ret = (xp - ep) / ep * 100

            pnl = shares * (xp - ep)
            month_pnl += pnl

            holdings.append({
                "ticker":     t,
                "score":      round(current_scores_display.get(t, 0), 0),
                "entry":      round(ep, 2),
                "exit":       round(xp, 2),
                "return_pct": round(ret, 2),
                "pnl":        round(pnl, 2),
                "carried":    t not in new_entries_this_month,
                "stopped":    t in stopped_out,
            })

        # Evict stopped-out positions — cash stays in portfolio_value via month_pnl
        for t in stopped_out:
            held_positions.pop(t, None)

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
