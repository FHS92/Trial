"""
test_scanner.py — Run the EdgeScan scoring engine on 10 S&P 500 tickers
and print a formatted results table.

Usage:
    cd edgescan/backend
    python test_scanner.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from scanner import scan_tickers

TEST_TICKERS = [
    "AAPL",   # Apple — Technology
    "MSFT",   # Microsoft — Technology
    "NVDA",   # NVIDIA — Technology
    "JPM",    # JPMorgan — Financials
    "JNJ",    # Johnson & Johnson — Healthcare
    "XOM",    # ExxonMobil — Energy
    "AMZN",   # Amazon — Consumer Discretionary
    "UNH",    # UnitedHealth — Healthcare
    "HD",     # Home Depot — Consumer Discretionary
    "V",      # Visa — Financials
]

RESET  = "\033[0m"
BOLD   = "\033[1m"
GREEN  = "\033[92m"
AMBER  = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
GRAY   = "\033[90m"


def score_color(score: int) -> str:
    if score >= 80: return GREEN
    if score >= 60: return AMBER
    return RED


def upside_color(pct) -> str:
    if pct is None: return GRAY
    if pct >= 10: return GREEN
    if pct >= 0:  return AMBER
    return RED


def fmt_score(score: int) -> str:
    c = score_color(score)
    return f"{c}{score:>3}{RESET}"


def fmt_upside(pct) -> str:
    if pct is None:
        return f"{GRAY}   N/A{RESET}"
    c = upside_color(pct)
    sign = "+" if pct >= 0 else ""
    return f"{c}{sign}{pct:5.1f}%{RESET}"


def fmt_price(p) -> str:
    if p is None:
        return "     N/A"
    return f"${p:>7.2f}"


def print_results(results: list[dict]) -> None:
    header = (
        f"\n{BOLD}{'Rank':<5} {'Ticker':<7} {'Name':<32} {'Sector':<26} "
        f"{'Score':>5} {'F':>4} {'T':>4} "
        f"{'Price':>9} {'Target':>9} {'Upside':>8}{RESET}"
    )
    divider = "─" * 120

    print(f"\n{CYAN}{BOLD}EdgeScan — Test Run on {len(results)} Tickers{RESET}")
    print(divider)
    print(header)
    print(divider)

    for rank, r in enumerate(results, 1):
        name = (r["name"] or r["ticker"])[:30]
        sector = (r["sector"] or "Unknown")[:24]
        score_str = fmt_score(r["score"])
        upside_str = fmt_upside(r.get("upside_pct"))
        price_str = fmt_price(r.get("current_price"))
        target_str = fmt_price(r.get("price_target_2m"))

        print(
            f"  {rank:<3}  {r['ticker']:<7} {name:<32} {sector:<26} "
            f"{score_str} {r['fundamental_score']:>4} {r['technical_score']:>4} "
            f"{price_str} {target_str} {upside_str}"
        )

    print(divider)

    # Print detailed breakdown for top scorer
    if results:
        top = results[0]
        print(f"\n{BOLD}Top Pick Detail — {top['ticker']} ({top['name']}){RESET}")
        print(f"  Composite: {score_color(top['score'])}{top['score']}/100{RESET}  "
              f"(Fundamental: {top['fundamental_score']}/60, Technical: {top['technical_score']}/40)")

        bd = top["score_breakdown"]
        print(f"\n  {BOLD}Score Breakdown:{RESET}")
        print(f"    Rev Growth:    {bd['rev_growth_pts']:>2} pts")
        print(f"    EPS Growth:    {bd['eps_growth_pts']:>2} pts")
        print(f"    FCF Yield:     {bd['fcf_yield_pts']:>2} pts")
        print(f"    ROE:           {bd['roe_pts']:>2} pts")
        print(f"    Gross Margin:  {bd['gross_margin_pts']:>2} pts")
        print(f"    Debt/Equity:   {bd['debt_equity_pts']:>2} pts")
        print(f"    EPS Revision:  {bd['eps_revision_pts']:>2} pts")
        print(f"    Fwd P/E:       {bd['fwd_pe_pts']:>2} pts")
        print(f"    ── Fundamental subtotal: {top['fundamental_score']:>2} / 60")
        print(f"    RSI:           {bd['rsi_pts']:>2} pts  (RSI={top['signals']['rsi']})")
        print(f"    MACD:          {bd['macd_pts']:>2} pts  ({top['signals']['macd_status']})")
        print(f"    vs 200MA:      {bd['ma200_pts']:>2} pts  ({top['signals']['pct_above_200ma']:+.1f}%)")
        print(f"    Volume:        {bd['volume_pts']:>2} pts  ({top['signals']['volume_status']})")
        print(f"    52W Distance:  {bd['high52w_pts']:>2} pts  ({top['signals']['from_52w_high']:.1f}% from high)")
        print(f"    Earnings Pen:  {bd['earnings_penalty']:>2} pts")
        print(f"    ── Technical subtotal:   {top['technical_score']:>2} / 40")

        m = top["metrics"]
        print(f"\n  {BOLD}Key Metrics:{RESET}")
        print(f"    Revenue Growth:  {m['rev_growth']:.1f}%")
        print(f"    EPS Growth:      {m['eps_growth']:.1f}%")
        print(f"    FCF Yield:       {m['fcf_yield']:.1f}%")
        print(f"    ROE:             {m['roe']:.1f}%")
        print(f"    Gross Margin:    {m['gross_margin']:.1f}%")
        print(f"    Debt/Equity:     {m['debt_to_equity']:.2f}x")
        fpe = f"{m['fwd_pe']:.1f}x" if m['fwd_pe'] else "N/A"
        print(f"    Fwd P/E:         {fpe} (sector median: {m['sector_pe']:.1f}x)")
        print(f"    Analyst Target:  {fmt_price(m['analyst_target'])}")

        if top.get("earnings_date"):
            print(f"\n  {AMBER}Next Earnings: {top['earnings_date']}{RESET}")
        print()


if __name__ == "__main__":
    print("Fetching data and scoring 10 S&P 500 tickers...")
    print("(This may take ~30-60 seconds due to yfinance rate limits)\n")

    results = scan_tickers(TEST_TICKERS)
    print_results(results)

    print("Done.")
