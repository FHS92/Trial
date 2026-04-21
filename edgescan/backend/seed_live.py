"""
seed_live.py — Seed the EdgeScan DB with REAL live data from yfinance.

Scans the top N S&P 500 tickers (default 50) and stores scores,
price history and metrics in edgescan.db.

Usage:
    python seed_live.py           # scans top 50 tickers (~3-5 min)
    python seed_live.py --n 20    # faster, top 20 only (~1-2 min)
    python seed_live.py --n 100   # full top 100 (~8-10 min)
"""

import json, os, sys, time, argparse
from datetime import datetime, date

os.environ.setdefault("DATABASE_URL", "sqlite:///./edgescan.db")
sys.path.insert(0, os.path.dirname(__file__))

from database import init_db, SessionLocal
from models import ScanResult, PriceHistory, ThesisCache
from scanner import score_stock
from data_fetcher import SP500_TICKERS, fetch_price_history


def seed_live(n: int = 50):
    init_db()
    db = SessionLocal()

    # Clear previous scan results (keep thesis cache)
    db.query(ScanResult).delete()
    db.query(PriceHistory).delete()
    db.commit()

    tickers = SP500_TICKERS[:n]
    print(f"\n EdgeScan Live Seed")
    print(f" Scanning {n} tickers from yfinance (15-min delayed data)")
    print(f" Estimated time: {n * 4 // 60}–{n * 6 // 60} minutes\n")

    scored = []
    failed = []
    start = time.time()

    for i, ticker in enumerate(tickers, 1):
        bar = "█" * i + "░" * (n - i)
        elapsed = time.time() - start
        eta = (elapsed / i) * (n - i) if i > 1 else 0
        print(f"\r [{bar}] {i}/{n}  {ticker:<6}  ETA: {int(eta)}s   ", end="", flush=True)

        try:
            result = score_stock(ticker)
            scored.append(result)

            # Store scan result
            db.add(ScanResult(
                ticker=result["ticker"],
                name=result.get("name"),
                sector=result.get("sector"),
                score=result["score"],
                fundamental_score=result["fundamental_score"],
                technical_score=result["technical_score"],
                current_price=result.get("current_price"),
                price_target_2m=result.get("price_target_2m"),
                upside_pct=result.get("upside_pct"),
                signals_json=json.dumps(result.get("signals", {})),
                metrics_json=json.dumps(result.get("metrics", {})),
                score_breakdown_json=json.dumps(result.get("score_breakdown", {})),
                earnings_date=date.fromisoformat(result["earnings_date"]) if result.get("earnings_date") else None,
                scanned_at=datetime.utcnow(),
            ))

            # Store price history
            df = fetch_price_history(ticker, period="1y")
            if df is not None and not df.empty:
                df.columns = [c.title() if isinstance(c, str) else c for c in df.columns]
                for row_date, row in df.iterrows():
                    day = row_date.date() if hasattr(row_date, "date") else row_date
                    db.add(PriceHistory(
                        ticker=ticker,
                        date=day,
                        open=float(row.get("Open", 0) or 0),
                        high=float(row.get("High", 0) or 0),
                        low=float(row.get("Low", 0) or 0),
                        close=float(row.get("Close", 0) or 0),
                        volume=float(row.get("Volume", 0) or 0),
                    ))

            db.commit()

        except Exception as e:
            failed.append((ticker, str(e)))
            db.rollback()

        time.sleep(0.3)  # polite rate limiting

    db.close()

    elapsed_total = time.time() - start
    scored.sort(key=lambda r: r["score"], reverse=True)

    print(f"\n\n Done in {int(elapsed_total)}s — {len(scored)} scored, {len(failed)} failed\n")
    print(f" Top 10 results:")
    print(f" {'Rank':<5} {'Ticker':<7} {'Score':<7} {'Price':<10} {'Upside':<10} {'Sector'}")
    print(f" {'-'*60}")
    for i, r in enumerate(scored[:10], 1):
        price = f"${r['current_price']:.2f}" if r.get("current_price") else "N/A"
        upside = f"+{r['upside_pct']:.1f}%" if r.get("upside_pct") else "N/A"
        print(f" {i:<5} {r['ticker']:<7} {r['score']:<7} {price:<10} {upside:<10} {r.get('sector','?')}")

    if failed:
        print(f"\n Failed tickers: {', '.join(t for t, _ in failed)}")

    print(f"\n Now run: uvicorn main:app --port 8000\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed EdgeScan with live yfinance data")
    parser.add_argument("--n", type=int, default=30, help="Number of tickers to scan (default: 30)")
    args = parser.parse_args()
    seed_live(args.n)
