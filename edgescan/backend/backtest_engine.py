"""
backtest_engine.py — Core backtest logic for EdgeScan.

Strategy:
  - Universe : top N stocks from SP500_TICKERS
  - Signal   : technical score only (RSI, MACD, 200MA, volume, 52W)
  - Entry    : close of first trading day of each month
  - Exit     : close of last trading day of same month
  - Sizing   : month 1 = $6,000 ($2,000 × 3); subsequent months = portfolio / 3 each
  - Benchmark: SPY buy-and-hold from Jan 2020
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
    _score_obv_slope,
    _score_roc_20,
    _score_adx,
    _score_relative_strength,
)
from technicals import compute_technicals

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


def _tech_score(
    close: pd.Series,
    volume: pd.Series,
    high: pd.Series,
    low: pd.Series,
    spy_return_3m: float = 0.0,
) -> float:
    if len(close) < 50:
        return 0.0
    n = min(len(close), len(volume), len(high), len(low))
    df = pd.DataFrame({
        "Close": close.iloc[-n:].values,
        "Volume": volume.iloc[-n:].values,
        "High": high.iloc[-n:].values,
        "Low": low.iloc[-n:].values,
        "Open": close.iloc[-n:].values,
    })
    sig = compute_technicals(df)
    if sig["current_price"] == 0:
        return 0.0

    # Relative strength: stock 3m return vs SPY 3m return
    if len(close) >= 63:
        stock_3m = float((close.iloc[-1] / close.iloc[-63] - 1) * 100)
        rs_vs_spy = stock_3m - spy_return_3m
    else:
        rs_vs_spy = 0.0

    return float(
        _score_rsi(sig["rsi"])
        + _score_macd(sig["macd_status"])
        + _score_price_vs_200ma(sig["pct_above_200ma"])
        + _score_obv_slope(sig["obv_slope_pct"])
        + _score_distance_from_52w_high(sig["from_52w_high"])
        + _score_roc_20(sig["roc_20"])
        + _score_adx(sig["adx"])
        + _score_relative_strength(rs_vs_spy)
    )


def _to_series(x) -> pd.Series:
    """Ensure we have a 1-D Series regardless of yfinance version."""
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


def run_backtest(n_stocks: int = 100) -> dict:
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
        # Single ticker — wrap in DataFrame so column access is consistent
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

    # Monthly simulation
    portfolio_value = STARTING_CAPITAL
    monthly_results = []

    for m in months:
        # Month end
        next_m   = date(m.year + (m.month // 12), (m.month % 12) + 1, 1)
        month_end = next_m - timedelta(days=1)
        cutoff    = pd.Timestamp(m)

        # SPY 3-month return as of month start (for relative strength scoring)
        spy_hist = spy_close[spy_close.index < cutoff]
        if len(spy_hist) >= 63:
            spy_return_3m = float((float(spy_hist.iloc[-1]) / float(spy_hist.iloc[-63]) - 1) * 100)
        else:
            spy_return_3m = 0.0

        # Score each ticker using data strictly before month start
        scores = {}
        for t in available:
            c  = close_all[t].loc[close_all.index < cutoff].dropna()
            v  = volume_all[t].loc[volume_all.index < cutoff].dropna()
            h  = high_all[t].loc[high_all.index < cutoff].dropna()
            lo = low_all[t].loc[low_all.index < cutoff].dropna()
            s  = _tech_score(c, v, h, lo, spy_return_3m)
            if s > 0:
                scores[t] = s

        if len(scores) < PICKS:
            continue

        top3 = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:PICKS]
        top3_scores = {t: s for t, s in top3}

        valid = []
        for t, _ in top3:
            ep = _px_on_or_after(close_all[t], m)
            xp = _px_on_or_before(close_all[t], month_end)
            if ep and xp and ep > 0:
                valid.append((t, ep, xp))

        if not valid:
            continue

        alloc    = portfolio_value / len(valid)
        month_pnl = 0.0
        holdings = []

        for t, ep, xp in valid:
            shares = alloc / ep
            pnl    = shares * (xp - ep)
            ret    = (xp - ep) / ep * 100
            month_pnl += pnl
            holdings.append({
                "ticker": t,
                "score": round(top3_scores[t], 0),
                "entry": round(ep, 2),
                "exit": round(xp, 2),
                "return_pct": round(ret, 2),
                "pnl": round(pnl, 2),
            })

        port_ret = month_pnl / portfolio_value * 100
        portfolio_value += month_pnl

        spy_ep = _px_on_or_after(spy_close, m)
        spy_xp = _px_on_or_before(spy_close, month_end)
        spy_ret = ((spy_xp - spy_ep) / spy_ep * 100) if (spy_ep and spy_xp) else None

        monthly_results.append({
            "month": m.strftime("%Y-%m"),
            "holdings": holdings,
            "port_return_pct": round(port_ret, 2),
            "portfolio_value": round(portfolio_value, 2),
            "spy_return_pct": round(spy_ret, 2) if spy_ret is not None else None,
            "vs_spy_pct": round(port_ret - spy_ret, 2) if spy_ret is not None else None,
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
            "year": int(year),
            "port_return_pct": round(yr_port, 2),
            "spy_return_pct": round(yr_spy, 2),
            "outperformance_pct": round(yr_port - yr_spy, 2),
            "end_value": round(last_val, 2),
        })

    final_val   = monthly_results[-1]["portfolio_value"]
    total_ret   = (final_val - STARTING_CAPITAL) / STARTING_CAPITAL * 100
    winners     = sum(1 for r in monthly_results if r["port_return_pct"] > 0)
    beat_spy    = sum(1 for r in monthly_results if r["vs_spy_pct"] is not None and r["vs_spy_pct"] > 0)
    n           = len(monthly_results)

    return {
        "monthly": monthly_results,
        "yearly": yearly,
        "summary": {
            "start_date": months[0].strftime("%Y-%m"),
            "end_date": months[-1].strftime("%Y-%m"),
            "n_stocks": n_stocks,
            "stocks_available": len(available),
            "months_traded": n,
            "starting_capital": STARTING_CAPITAL,
            "final_value": round(final_val, 2),
            "total_return_pct": round(total_ret, 2),
            "spy_final_value": round(spy_final, 2),
            "spy_total_return_pct": round(spy_total_ret * 100, 2),
            "outperformance_pct": round(total_ret - spy_total_ret * 100, 2),
            "winning_months": winners,
            "winning_months_pct": round(winners / n * 100, 1),
            "beat_spy_months": beat_spy,
            "beat_spy_months_pct": round(beat_spy / n * 100, 1),
        },
    }
