#!/usr/bin/env python3
"""
backtest.py — EdgeScan technical-only backtest

Strategy:
  - Universe: top N stocks from S&P 500 list
  - Signal: technical score only (RSI, MACD, 200MA, volume, 52W) computed from price history
  - Entry: close of first trading day of each month
  - Exit: close of last trading day of same month
  - Sizing: Jan 2020 starts with $6,000 ($2,000 × 3). Every subsequent month
            splits the full portfolio 1/3 each into the new top 3 picks.
  - Benchmark: SPY buy-and-hold from same start date

Usage:
    python backtest.py          # 100-stock universe (fast, ~3 min)
    python backtest.py --n 300  # larger universe (slower, more accurate)
"""

import argparse
import sys
import warnings
from datetime import date, timedelta

import numpy as np
import pandas as pd
import yfinance as yf

warnings.filterwarnings("ignore")
sys.path.insert(0, ".")

from data_fetcher import SP500_TICKERS
from scanner import (
    _score_distance_from_52w_high,
    _score_macd,
    _score_price_vs_200ma,
    _score_rsi,
    _score_volume,
)
from technicals import compute_technicals

START = date(2020, 1, 1)
STARTING_CAPITAL = 6_000.0
PICKS_PER_MONTH = 3


# ── helpers ──────────────────────────────────────────────────────────────────

def _month_range(start: date) -> list[date]:
    """Return the first day of every month from start through the previous complete month."""
    today = date.today()
    months = []
    d = date(start.year, start.month, 1)
    while True:
        # Last day of this month
        if d.month == 12:
            next_m = date(d.year + 1, 1, 1)
        else:
            next_m = date(d.year, d.month + 1, 1)
        last_day = next_m - timedelta(days=1)
        # Only include months that have ended
        if last_day >= today:
            break
        months.append(d)
        d = next_m
    return months


def _tech_score(close: pd.Series, volume: pd.Series, high: pd.Series, low: pd.Series) -> float:
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
    return float(
        _score_rsi(sig["rsi"])
        + _score_macd(sig["macd_status"])
        + _score_price_vs_200ma(sig["pct_above_200ma"])
        + _score_volume(sig["volume_status"])
        + _score_distance_from_52w_high(sig["from_52w_high"])
    )


def _first_price_on_or_after(series: pd.Series, target: date) -> float | None:
    ts = pd.Timestamp(target)
    sub = series[series.index >= ts]
    return float(sub.iloc[0]) if len(sub) > 0 else None


def _last_price_on_or_before(series: pd.Series, target: date) -> float | None:
    ts = pd.Timestamp(target)
    sub = series[series.index <= ts]
    return float(sub.iloc[-1]) if len(sub) > 0 else None


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=100, help="Universe size (default 100)")
    args = parser.parse_args()

    tickers = SP500_TICKERS[: args.n]
    months = _month_range(START)

    print("\n" + "═" * 60)
    print("  EdgeScan — Technical Backtest")
    print(f"  Universe : {len(tickers)} stocks")
    print(f"  Period   : {months[0].strftime('%b %Y')} → {months[-1].strftime('%b %Y')}")
    print(f"  Strategy : Top {PICKS_PER_MONTH} technical score · monthly rotation")
    print(f"  Capital  : ${STARTING_CAPITAL:,.0f} starting, fully compounding")
    print("═" * 60 + "\n")

    # ── Download price data (Jan 2019 → today; extra year for MA200 warmup) ──
    download_start = f"{START.year - 1}-01-01"
    print(f"Downloading data for {len(tickers)} tickers since {download_start}…")
    raw = yf.download(tickers, start=download_start, auto_adjust=True, progress=True, threads=True)
    print()

    if isinstance(raw.columns, pd.MultiIndex):
        close_all  = raw["Close"].ffill()
        volume_all = raw["Volume"].ffill()
        high_all   = raw["High"].ffill()
        low_all    = raw["Low"].ffill()
    else:
        # Single ticker edge case
        close_all  = raw[["Close"]].ffill()
        volume_all = raw[["Volume"]].ffill()
        high_all   = raw[["High"]].ffill()
        low_all    = raw[["Low"]].ffill()

    available = [t for t in tickers if t in close_all.columns]
    print(f"Got data for {len(available)}/{len(tickers)} tickers.\n")

    # ── SPY benchmark ────────────────────────────────────────────────────────
    spy_raw = yf.download("SPY", start=download_start, auto_adjust=True, progress=False)
    spy_close = spy_raw["Close"].ffill()
    spy_entry_price = _first_price_on_or_after(spy_close, START)
    spy_latest_price = float(spy_close.iloc[-1])
    spy_total_return = (spy_latest_price - spy_entry_price) / spy_entry_price
    spy_final_value  = STARTING_CAPITAL * (1 + spy_total_return)

    # ── Monthly simulation ───────────────────────────────────────────────────
    portfolio_value = STARTING_CAPITAL
    monthly_results = []

    for month_start in months:
        if month_start.month == 12:
            month_end = date(month_start.year, 12, 31)
        else:
            month_end = date(month_start.year, month_start.month + 1, 1) - timedelta(days=1)

        # Score window: strictly before first trading day of the month
        score_cutoff = pd.Timestamp(month_start)

        scores = {}
        for ticker in available:
            c = close_all[ticker].loc[close_all.index < score_cutoff].dropna()
            v = volume_all[ticker].loc[volume_all.index < score_cutoff].dropna()
            h = high_all[ticker].loc[high_all.index < score_cutoff].dropna()
            lo = low_all[ticker].loc[low_all.index < score_cutoff].dropna()
            s = _tech_score(c, v, h, lo)
            if s > 0:
                scores[ticker] = s

        if len(scores) < PICKS_PER_MONTH:
            continue

        top3 = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:PICKS_PER_MONTH]
        top3_tickers = [t for t, _ in top3]
        top3_scores  = {t: s for t, s in top3}

        # Entry = close of first trading day of month
        # Exit  = close of last trading day of month
        valid = []
        for ticker in top3_tickers:
            ep = _first_price_on_or_after(close_all[ticker], month_start)
            xp = _last_price_on_or_before(close_all[ticker], month_end)
            if ep and xp and ep > 0:
                valid.append((ticker, ep, xp))

        if not valid:
            continue

        alloc = portfolio_value / len(valid)
        month_pnl = 0.0
        holdings = []
        for ticker, ep, xp in valid:
            shares = alloc / ep
            pnl = shares * (xp - ep)
            ret = (xp - ep) / ep * 100
            month_pnl += pnl
            holdings.append({
                "ticker": ticker,
                "score": top3_scores[ticker],
                "entry": ep,
                "exit": xp,
                "return_pct": round(ret, 2),
                "pnl": round(pnl, 2),
            })

        port_return_pct = month_pnl / portfolio_value * 100
        portfolio_value += month_pnl

        # SPY return for same month
        spy_ep = _first_price_on_or_after(spy_close, month_start)
        spy_xp = _last_price_on_or_before(spy_close, month_end)
        spy_ret = ((spy_xp - spy_ep) / spy_ep * 100) if (spy_ep and spy_xp) else None

        monthly_results.append({
            "month": month_start,
            "holdings": holdings,
            "port_return_pct": round(port_return_pct, 2),
            "portfolio_value": round(portfolio_value, 2),
            "spy_return_pct": round(spy_ret, 2) if spy_ret is not None else None,
        })

    if not monthly_results:
        print("No results computed. Check your data.")
        return

    # ── Print monthly table ──────────────────────────────────────────────────
    print("MONTHLY RESULTS")
    print("─" * 95)
    print(f"{'Month':<9} {'Picks (score)':<38} {'Port %':>8} {'Port Value':>12} {'SPY %':>8} {'vs SPY':>8}")
    print("─" * 95)

    for r in monthly_results:
        picks_str = "  ".join([f"{h['ticker']}({h['score']:.0f})" for h in r["holdings"]])
        spy_s = f"{r['spy_return_pct']:+.2f}%" if r["spy_return_pct"] is not None else "  —"
        vs = (r["port_return_pct"] - r["spy_return_pct"]) if r["spy_return_pct"] is not None else None
        vs_s = f"{vs:+.2f}%" if vs is not None else "  —"
        print(
            f"{r['month'].strftime('%Y-%m'):<9} "
            f"{picks_str[:38]:<38} "
            f"{r['port_return_pct']:>+7.2f}% "
            f"${r['portfolio_value']:>11,.2f} "
            f"{spy_s:>8} "
            f"{vs_s:>8}"
        )

    # ── Yearly summary ───────────────────────────────────────────────────────
    print("\n\nYEARLY SUMMARY")
    print("─" * 60)
    print(f"{'Year':<7} {'EdgeScan':>10} {'SPY':>10} {'Outperform':>12} {'Port Value':>12}")
    print("─" * 60)

    df = pd.DataFrame(monthly_results)
    df["year"] = df["month"].apply(lambda d: d.year)

    for year, grp in df.groupby("year"):
        first_val = grp["portfolio_value"].iloc[0] / (1 + grp["port_return_pct"].iloc[0] / 100)
        last_val  = grp["portfolio_value"].iloc[-1]
        yr_port   = (last_val - first_val) / first_val * 100

        spy_rets = grp["spy_return_pct"].dropna()
        yr_spy   = ((1 + spy_rets / 100).prod() - 1) * 100

        out = yr_port - yr_spy
        print(
            f"{year:<7} "
            f"{yr_port:>+9.1f}% "
            f"{yr_spy:>+9.1f}% "
            f"{out:>+11.1f}% "
            f"${last_val:>11,.2f}"
        )

    # ── Full period summary ──────────────────────────────────────────────────
    final_val    = monthly_results[-1]["portfolio_value"]
    total_ret    = (final_val - STARTING_CAPITAL) / STARTING_CAPITAL * 100
    spy_total_pct = spy_total_return * 100
    outperform   = total_ret - spy_total_pct

    print("\n\nFULL PERIOD SUMMARY")
    print("─" * 50)
    print(f"  Period           : {months[0].strftime('%b %Y')} → {months[-1].strftime('%b %Y')}")
    print(f"  Months traded    : {len(monthly_results)}")
    print(f"  Starting capital : ${STARTING_CAPITAL:,.2f}")
    print()
    print(f"  EdgeScan final   : ${final_val:>10,.2f}   ({total_ret:+.1f}%)")
    print(f"  SPY buy & hold   : ${spy_final_value:>10,.2f}   ({spy_total_pct:+.1f}%)")
    print(f"  Outperformance   : {outperform:+.1f}%")
    print()
    winners = sum(1 for r in monthly_results if r["port_return_pct"] > 0)
    print(f"  Winning months   : {winners}/{len(monthly_results)} ({winners/len(monthly_results)*100:.0f}%)")
    spy_wins = sum(
        1 for r in monthly_results
        if r["spy_return_pct"] is not None and r["port_return_pct"] > r["spy_return_pct"]
    )
    print(f"  Beat SPY monthly : {spy_wins}/{len(monthly_results)} ({spy_wins/len(monthly_results)*100:.0f}%)")
    print()
    print("  ⚠  Technical score only — fundamentals excluded")
    print("  ⚠  Survivorship bias: universe = current S&P 500 members")
    print("  ⚠  No transaction costs or slippage modeled")
    print("─" * 50)

    # ── Save CSV ─────────────────────────────────────────────────────────────
    rows = []
    for r in monthly_results:
        for h in r["holdings"]:
            rows.append({
                "month": r["month"].strftime("%Y-%m"),
                "ticker": h["ticker"],
                "tech_score": h["score"],
                "entry_price": h["entry"],
                "exit_price": h["exit"],
                "return_pct": h["return_pct"],
                "pnl_usd": h["pnl"],
                "portfolio_value_eom": r["portfolio_value"],
                "port_monthly_return_pct": r["port_return_pct"],
                "spy_monthly_return_pct": r["spy_return_pct"],
            })
    out_path = "backtest_results.csv"
    pd.DataFrame(rows).to_csv(out_path, index=False)
    print(f"\n  Full results saved → {out_path}\n")


if __name__ == "__main__":
    main()
