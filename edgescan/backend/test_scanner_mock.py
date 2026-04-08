"""
test_scanner_mock.py — Validates the EdgeScan scoring engine against
synthetic data (no network required). Simulates 10 stocks with varied
fundamentals and technicals to verify scoring logic end-to-end.

Usage:
    cd edgescan/backend
    python test_scanner_mock.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import numpy as np
from datetime import date, datetime, timedelta
from scanner import (
    _score_rev_growth, _score_eps_growth, _score_fcf_yield, _score_roe,
    _score_gross_margin, _score_debt_equity, _score_eps_revision,
    _score_fwd_pe_vs_sector, _score_rsi, _score_macd, _score_price_vs_200ma,
    _score_volume, _score_distance_from_52w_high, _earnings_penalty,
    _compute_price_target,
)
from technicals import compute_technicals

RESET = "\033[0m"; BOLD = "\033[1m"; GREEN = "\033[92m"
AMBER = "\033[93m"; RED = "\033[91m"; CYAN = "\033[96m"; GRAY = "\033[90m"


def score_color(s):
    return GREEN if s >= 80 else AMBER if s >= 60 else RED


def make_price_series(
    n: int = 252,
    start: float = 100.0,
    trend: float = 0.0003,
    vol: float = 0.012,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate synthetic daily OHLCV data."""
    rng = np.random.default_rng(seed)
    returns = rng.normal(trend, vol, n)
    closes = start * np.cumprod(1 + returns)
    highs = closes * (1 + rng.uniform(0, 0.01, n))
    lows = closes * (1 - rng.uniform(0, 0.01, n))
    opens = closes * (1 + rng.normal(0, 0.005, n))
    volumes = rng.integers(1_000_000, 5_000_000, n).astype(float)

    idx = pd.date_range(end=datetime.today(), periods=n, freq="B")
    return pd.DataFrame(
        {"Open": opens, "High": highs, "Low": lows, "Close": closes, "Volume": volumes},
        index=idx,
    )


# ── Synthetic stock profiles ────────────────────────────────────────────────

STOCKS = [
    {
        "ticker": "ALPHA",
        "name": "Alpha Growth Co",
        "sector": "Technology",
        "fundamentals": dict(
            rev_growth=25.0, eps_growth=30.0, fcf_yield=7.0, roe=28.0,
            gross_margin=65.0, debt_to_equity=0.2, recommendation="buy",
            fwd_pe=24.0, sector_pe=28.0, analyst_target=220.0,
            earnings_date=None, current_price=175.0,
        ),
        "price_kwargs": dict(start=175.0, trend=0.0005, vol=0.013, seed=1),
        "note": "High-growth tech, strong FCF, healthy balance sheet",
    },
    {
        "ticker": "BETA",
        "name": "Beta Value Inc",
        "sector": "Financials",
        "fundamentals": dict(
            rev_growth=8.0, eps_growth=12.0, fcf_yield=5.0, roe=17.0,
            gross_margin=40.0, debt_to_equity=0.5, recommendation="buy",
            fwd_pe=11.0, sector_pe=14.0, analyst_target=95.0,
            earnings_date=None, current_price=80.0,
        ),
        "price_kwargs": dict(start=80.0, trend=0.0002, vol=0.010, seed=2),
        "note": "Value financials, below-sector P/E, decent FCF",
    },
    {
        "ticker": "GAMMA",
        "name": "Gamma Dividend Corp",
        "sector": "Utilities",
        "fundamentals": dict(
            rev_growth=2.0, eps_growth=3.0, fcf_yield=2.5, roe=9.0,
            gross_margin=32.0, debt_to_equity=1.2, recommendation="hold",
            fwd_pe=17.0, sector_pe=17.0, earnings_date=None,
            analyst_target=55.0, current_price=50.0,
        ),
        "price_kwargs": dict(start=50.0, trend=0.0001, vol=0.007, seed=3),
        "note": "Slow-growth utility at sector median P/E",
    },
    {
        "ticker": "DELTA",
        "name": "Delta Turnaround Ltd",
        "sector": "Energy",
        "fundamentals": dict(
            rev_growth=-5.0, eps_growth=-10.0, fcf_yield=1.0, roe=4.0,
            gross_margin=22.0, debt_to_equity=1.8, recommendation="sell",
            fwd_pe=18.0, sector_pe=12.0, earnings_date=None,
            analyst_target=30.0, current_price=40.0,
        ),
        "price_kwargs": dict(start=40.0, trend=-0.0004, vol=0.018, seed=4),
        "note": "Declining energy, stretched valuation",
    },
    {
        "ticker": "EPSILON",
        "name": "Epsilon Health Sys",
        "sector": "Healthcare",
        "fundamentals": dict(
            rev_growth=15.0, eps_growth=18.0, fcf_yield=4.5, roe=22.0,
            gross_margin=58.0, debt_to_equity=0.4, recommendation="buy",
            fwd_pe=18.0, sector_pe=20.0, analyst_target=160.0,
            earnings_date=None, current_price=130.0,
        ),
        "price_kwargs": dict(start=130.0, trend=0.0004, vol=0.011, seed=5),
        "note": "Quality healthcare, solid growth, below-sector P/E",
    },
    {
        "ticker": "ZETA",
        "name": "Zeta Consumer Brands",
        "sector": "Consumer Staples",
        "fundamentals": dict(
            rev_growth=5.0, eps_growth=6.0, fcf_yield=3.5, roe=14.0,
            gross_margin=45.0, debt_to_equity=0.8, recommendation="hold",
            fwd_pe=20.0, sector_pe=19.0, earnings_date=None,
            analyst_target=72.0, current_price=68.0,
        ),
        "price_kwargs": dict(start=68.0, trend=0.0001, vol=0.008, seed=6),
        "note": "Steady consumer staple, slightly above sector P/E",
    },
    {
        "ticker": "ETA",
        "name": "Eta Cloud Platform",
        "sector": "Technology",
        "fundamentals": dict(
            rev_growth=35.0, eps_growth=-5.0, fcf_yield=0.5, roe=5.0,
            gross_margin=72.0, debt_to_equity=0.1, recommendation="buy",
            fwd_pe=55.0, sector_pe=28.0, earnings_date=date.today() + timedelta(days=5),
            analyst_target=420.0, current_price=350.0,
        ),
        "price_kwargs": dict(start=350.0, trend=0.0007, vol=0.022, seed=7),
        "note": "Hyper-growth SaaS, earnings in 5 days (penalty applies)",
    },
    {
        "ticker": "THETA",
        "name": "Theta Industrial Co",
        "sector": "Industrials",
        "fundamentals": dict(
            rev_growth=10.0, eps_growth=11.0, fcf_yield=4.0, roe=16.0,
            gross_margin=35.0, debt_to_equity=0.6, recommendation="buy",
            fwd_pe=18.0, sector_pe=20.0, earnings_date=None,
            analyst_target=88.0, current_price=75.0,
        ),
        "price_kwargs": dict(start=75.0, trend=0.0003, vol=0.011, seed=8),
        "note": "Solid industrials, good growth and ROE",
    },
    {
        "ticker": "IOTA",
        "name": "Iota Retail Group",
        "sector": "Consumer Discretionary",
        "fundamentals": dict(
            rev_growth=3.0, eps_growth=4.0, fcf_yield=1.5, roe=8.0,
            gross_margin=28.0, debt_to_equity=1.4, recommendation="hold",
            fwd_pe=23.0, sector_pe=22.0, earnings_date=None,
            analyst_target=42.0, current_price=40.0,
        ),
        "price_kwargs": dict(start=40.0, trend=0.0001, vol=0.014, seed=9),
        "note": "Weak retail, marginal metrics, slightly above sector P/E",
    },
    {
        "ticker": "KAPPA",
        "name": "Kappa Materials Inc",
        "sector": "Materials",
        "fundamentals": dict(
            rev_growth=12.0, eps_growth=14.0, fcf_yield=6.5, roe=20.0,
            gross_margin=42.0, debt_to_equity=0.3, recommendation="buy",
            fwd_pe=14.0, sector_pe=16.0, earnings_date=None,
            analyst_target=115.0, current_price=92.0,
        ),
        "price_kwargs": dict(start=92.0, trend=0.0003, vol=0.013, seed=10),
        "note": "Strong materials play, good FCF, below-sector P/E",
    },
]


def score_synthetic(stock: dict) -> dict:
    f = stock["fundamentals"]
    df = make_price_series(**stock["price_kwargs"])
    signals = compute_technicals(df)

    # Fundamental scoring
    rev_pts    = _score_rev_growth(f["rev_growth"])
    eps_pts    = _score_eps_growth(f["eps_growth"])
    fcf_pts    = _score_fcf_yield(f["fcf_yield"])
    roe_pts    = _score_roe(f["roe"])
    margin_pts = _score_gross_margin(f["gross_margin"])
    de_pts     = _score_debt_equity(f["debt_to_equity"])
    rev_est_pts = _score_eps_revision(f["recommendation"])
    pe_pts     = _score_fwd_pe_vs_sector(f["fwd_pe"], f["sector_pe"])
    f_score    = rev_pts + eps_pts + fcf_pts + roe_pts + margin_pts + de_pts + rev_est_pts + pe_pts

    # Technical scoring
    rsi_pts    = _score_rsi(signals["rsi"])
    macd_pts   = _score_macd(signals["macd_status"])
    ma_pts     = _score_price_vs_200ma(signals["pct_above_200ma"])
    vol_pts    = _score_volume(signals["volume_status"])
    hi_pts     = _score_distance_from_52w_high(signals["from_52w_high"])
    penalty    = _earnings_penalty(f["earnings_date"])
    t_score    = max(0, rsi_pts + macd_pts + ma_pts + vol_pts + hi_pts + penalty)

    composite  = min(100, f_score + t_score)

    target = _compute_price_target(
        current_price=f["current_price"],
        analyst_target=f.get("analyst_target"),
        fwd_pe=f["fwd_pe"],
        sector_pe=f["sector_pe"],
        fcf_yield=f["fcf_yield"],
    )
    upside = round(((target - f["current_price"]) / f["current_price"]) * 100, 1) if target else None

    return {
        "ticker": stock["ticker"],
        "name": stock["name"],
        "sector": stock["sector"],
        "note": stock["note"],
        "score": composite,
        "fundamental_score": f_score,
        "technical_score": t_score,
        "current_price": f["current_price"],
        "price_target_2m": target,
        "upside_pct": upside,
        "signals": signals,
        "breakdown": dict(
            rev=rev_pts, eps=eps_pts, fcf=fcf_pts, roe=roe_pts,
            margin=margin_pts, de=de_pts, rev_est=rev_est_pts, pe=pe_pts,
            rsi=rsi_pts, macd=macd_pts, ma=ma_pts, vol=vol_pts, hi=hi_pts,
            penalty=penalty,
        ),
    }


def print_table(results):
    w = 130
    print(f"\n{CYAN}{BOLD}EdgeScan — Mock Data Scoring Test (10 Synthetic Tickers){RESET}")
    print("─" * w)
    print(f"{BOLD}{'Rank':<5} {'Ticker':<8} {'Name':<24} {'Sector':<24} "
          f"{'Score':>5} {'F':>4} {'T':>4}  "
          f"{'Price':>8} {'Target':>8} {'Upside':>8}  Note{RESET}")
    print("─" * w)
    for rank, r in enumerate(results, 1):
        sc = f"{score_color(r['score'])}{r['score']:>3}{RESET}"
        upside = r["upside_pct"]
        up_str = f"{GREEN}+{upside:.1f}%{RESET}" if upside and upside >= 10 else \
                 f"{AMBER}+{upside:.1f}%{RESET}" if upside and upside >= 0 else \
                 f"{RED}{upside:.1f}%{RESET}" if upside else f"{GRAY}N/A{RESET}"
        tgt = f"${r['price_target_2m']:.2f}" if r["price_target_2m"] else "N/A"
        print(f"  {rank:<3}  {r['ticker']:<8} {r['name'][:22]:<24} {r['sector'][:22]:<24} "
              f"{sc} {r['fundamental_score']:>4} {r['technical_score']:>4}  "
              f"${r['current_price']:>7.2f} {tgt:>8} {up_str:>18}  "
              f"{GRAY}{r['note'][:40]}{RESET}")
    print("─" * w)

    top = results[0]
    bd = top["breakdown"]
    sig = top["signals"]
    print(f"\n{BOLD}Score Breakdown — #{1} {top['ticker']}{RESET}")
    rows = [
        ("Rev Growth", bd["rev"], 10), ("EPS Growth", bd["eps"], 10),
        ("FCF Yield", bd["fcf"], 8), ("ROE", bd["roe"], 8),
        ("Gross Margin", bd["margin"], 6), ("Debt/Equity", bd["de"], 6),
        ("EPS Revision", bd["rev_est"], 6), ("Fwd P/E", bd["pe"], 6),
    ]
    print(f"  {'Fundamental (60 max)':<20}", end="")
    for label, pts, mx in rows:
        bar = "█" * pts + "░" * (mx - pts)
        color = GREEN if pts == mx else AMBER if pts >= mx // 2 else RED
        print(f"  {label}: {color}{bar}{RESET} {pts}/{mx}", end="  ")
    print(f"\n  Fundamental total: {BOLD}{top['fundamental_score']}/60{RESET}")

    tech_rows = [
        ("RSI", bd["rsi"], 8, f"RSI={sig['rsi']}"),
        ("MACD", bd["macd"], 8, sig["macd_status"]),
        ("vs 200MA", bd["ma"], 8, f"{sig['pct_above_200ma']:+.1f}%"),
        ("Volume", bd["vol"], 6, sig["volume_status"]),
        ("52W Dist", bd["hi"], 6, f"{sig['from_52w_high']:.1f}%"),
        ("Earnings", bd["penalty"], 0, "penalty"),
    ]
    print(f"\n  {'Technical (40 max)':<20}", end="")
    for label, pts, mx, detail in tech_rows:
        color = GREEN if mx > 0 and pts == mx else AMBER if mx > 0 and pts >= mx // 2 else \
                RED if pts < 0 else GRAY
        print(f"  {label}: {color}{pts}{RESET} ({detail})", end="  ")
    print(f"\n  Technical total: {BOLD}{top['technical_score']}/40{RESET}")
    print(f"\n  {BOLD}Composite: {score_color(top['score'])}{top['score']}/100{RESET}\n")


if __name__ == "__main__":
    print("Running EdgeScan scoring engine on synthetic data...")

    results = sorted([score_synthetic(s) for s in STOCKS], key=lambda r: r["score"], reverse=True)
    print_table(results)

    # Sanity checks
    print(f"{BOLD}Sanity Checks:{RESET}")
    alpha = next(r for r in results if r["ticker"] == "ALPHA")
    delta = next(r for r in results if r["ticker"] == "DELTA")
    eta   = next(r for r in results if r["ticker"] == "ETA")

    checks = [
        ("ALPHA scores higher than DELTA", alpha["score"] > delta["score"]),
        ("ALPHA fundamental > 40", alpha["fundamental_score"] > 40),
        ("DELTA fundamental < 10", delta["fundamental_score"] < 10),
        ("ETA has earnings penalty", eta["breakdown"]["penalty"] < 0),
        ("All scores in 0-100 range", all(0 <= r["score"] <= 100 for r in results)),
        ("Price targets computed", all(r["price_target_2m"] is not None for r in results)),
    ]

    all_pass = True
    for label, passed in checks:
        status = f"{GREEN}PASS{RESET}" if passed else f"{RED}FAIL{RESET}"
        print(f"  [{status}] {label}")
        if not passed:
            all_pass = False

    print(f"\n{'All checks passed.' if all_pass else 'Some checks FAILED.'}\n")
