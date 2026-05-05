"""
scheduler.py — APScheduler-based scan runner for EdgeScan.

Runs the full S&P 500 scan 3x daily at 6am, 12pm, and 6pm ET.
Processes tickers in batches of 50 to respect yfinance rate limits.
Stores results in the database after each batch.

Usage (standalone):
    python scheduler.py

Or import and call start_scheduler() from main.py startup if you want
the scheduler embedded in the FastAPI process.
"""

import json
import os
import time
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from data_fetcher import SP500_TICKERS, fetch_price_history
from models import PriceHistory, ScanResult
from scanner import score_stock
from database import SessionLocal, init_db

BATCH_SIZE = int(os.getenv("SCAN_BATCH_SIZE", "50"))
BATCH_DELAY_SECONDS = float(os.getenv("BATCH_DELAY_SECONDS", "2.0"))  # polite pause between batches

# Eastern time (UTC-5 standard / UTC-4 daylight)
# Use UTC cron times:  6am ET = 11am UTC (EST) / 10am UTC (EDT)
#                      12pm ET = 5pm UTC (EST) / 4pm UTC (EDT)
#                      6pm ET = 11pm UTC (EST) / 10pm UTC (EDT)
# For simplicity we schedule in US/Eastern directly via APScheduler timezone
SCAN_TIMEZONE = "America/New_York"
SCAN_HOURS = [6, 12, 18]  # 6am, 12pm, 6pm ET


def run_full_scan(tickers: Optional[list[str]] = None) -> dict:
    """
    Score all tickers (or a provided subset) and persist results.
    Returns a summary dict.
    """
    target = tickers or SP500_TICKERS
    total = len(target)
    scored = 0
    failed = 0
    top_result = None

    print(f"\n[scheduler] Starting scan of {total} tickers at {datetime.utcnow().isoformat()} UTC")
    db = SessionLocal()

    try:
        for batch_start in range(0, total, BATCH_SIZE):
            batch = target[batch_start: batch_start + BATCH_SIZE]
            batch_num = batch_start // BATCH_SIZE + 1
            total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
            print(f"[scheduler] Batch {batch_num}/{total_batches}: {batch[0]}…{batch[-1]}")

            for ticker in batch:
                try:
                    result = score_stock(ticker)
                    _store_scan_result(result, db)
                    _store_price_history(ticker, db)
                    scored += 1
                    if top_result is None or result["score"] > top_result["score"]:
                        top_result = result
                except Exception as e:
                    print(f"  [scheduler] Failed {ticker}: {e}")
                    failed += 1

            # Polite pause between batches
            if batch_start + BATCH_SIZE < total:
                time.sleep(BATCH_DELAY_SECONDS)

    finally:
        db.close()

    summary = {
        "scored": scored,
        "failed": failed,
        "total": total,
        "top_ticker": top_result["ticker"] if top_result else None,
        "top_score": top_result["score"] if top_result else None,
        "completed_at": datetime.utcnow().isoformat(),
    }
    print(f"[scheduler] Scan complete: {scored} scored, {failed} failed. "
          f"Top: {summary['top_ticker']} ({summary['top_score']})")
    return summary


def _store_scan_result(result: dict, db) -> None:
    row = ScanResult(
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
        scanned_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()


def _store_price_history(ticker: str, db) -> None:
    from datetime import date
    df = fetch_price_history(ticker, period="1y")
    if df is None or df.empty:
        return
    df.columns = [c.title() if isinstance(c, str) else c for c in df.columns]
    for row_date, row in df.iterrows():
        day = row_date.date() if hasattr(row_date, "date") else row_date
        exists = (
            db.query(PriceHistory)
            .filter(PriceHistory.ticker == ticker, PriceHistory.date == day)
            .first()
        )
        if not exists:
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


def run_price_refresh() -> dict:
    """
    Lightweight price refresh — batch-downloads the latest close price for
    all S&P 500 tickers in a single yfinance request (no scoring).

    Updates:
      - ScanResult.current_price  (most recent row per ticker)
      - PriceHistory              (upserts today's close)

    Runs every 30 minutes during market hours (Mon–Fri 9:00–16:30 ET).
    """
    import yfinance as yf
    import pandas as pd
    from datetime import date

    print(f"\n[price_refresh] Starting at {datetime.utcnow().isoformat()} UTC")

    try:
        # Single batch request — much faster than 500 individual calls
        df = yf.download(
            SP500_TICKERS,
            period="5d",        # last 5 days handles weekends / holidays
            interval="1d",
            auto_adjust=True,
            progress=False,
            threads=True,
        )

        if df.empty:
            print("[price_refresh] No data returned from yfinance")
            return {"updated": 0, "error": "no data"}

        # df["Close"] → DataFrame with tickers as columns; take last valid row
        close_df = df["Close"].dropna(how="all")
        if close_df.empty:
            print("[price_refresh] Close data empty after dropna")
            return {"updated": 0, "error": "empty close"}

        latest_close: dict[str, float] = {}
        for ticker in SP500_TICKERS:
            if ticker in close_df.columns:
                series = close_df[ticker].dropna()
                if not series.empty:
                    latest_close[ticker] = float(series.iloc[-1])

        db = SessionLocal()
        updated = 0
        today = date.today()

        try:
            for ticker, price in latest_close.items():
                # Update current_price on the most recent ScanResult row
                row = (
                    db.query(ScanResult)
                    .filter(ScanResult.ticker == ticker)
                    .order_by(ScanResult.scanned_at.desc())
                    .first()
                )
                if row:
                    row.current_price = price
                    updated += 1

                # Upsert today's close in PriceHistory
                ph = (
                    db.query(PriceHistory)
                    .filter(PriceHistory.ticker == ticker, PriceHistory.date == today)
                    .first()
                )
                if ph:
                    ph.close = price
                else:
                    db.add(PriceHistory(ticker=ticker, date=today, close=price))

            db.commit()
        finally:
            db.close()

        print(f"[price_refresh] Done — {updated}/{len(SP500_TICKERS)} tickers updated")
        return {"updated": updated, "total": len(SP500_TICKERS)}

    except Exception as e:
        print(f"[price_refresh] Failed: {e}")
        return {"updated": 0, "error": str(e)}


def start_scheduler(blocking: bool = True):
    """
    Start APScheduler.
    blocking=True  → runs forever (use as standalone process).
    blocking=False → background mode (embed in FastAPI startup).
    """
    init_db()

    SchedulerClass = BlockingScheduler if blocking else BackgroundScheduler
    scheduler = SchedulerClass(timezone=SCAN_TIMEZONE)

    # Full score + price scan — 3x daily
    for hour in SCAN_HOURS:
        scheduler.add_job(
            run_full_scan,
            trigger=CronTrigger(hour=hour, minute=0, timezone=SCAN_TIMEZONE),
            id=f"full_scan_{hour:02d}00",
            name=f"Full S&P 500 scan at {hour:02d}:00 ET",
            replace_existing=True,
        )
        print(f"[scheduler] Registered scan job: {hour:02d}:00 ET daily")

    # Price-only refresh — every 30 min during market hours (Mon–Fri 9–16 ET)
    scheduler.add_job(
        run_price_refresh,
        trigger=CronTrigger(
            day_of_week="mon-fri",
            hour="9-16",
            minute="0,30",
            timezone=SCAN_TIMEZONE,
        ),
        id="price_refresh_30min",
        name="Price refresh every 30min (market hours)",
        replace_existing=True,
    )
    print("[scheduler] Registered price refresh job: every 30min Mon–Fri 9:00–16:30 ET")

    print(f"[scheduler] Next run times:")
    for job in scheduler.get_jobs():
        print(f"  {job.name} → {job.next_run_time}")

    scheduler.start()
    return scheduler


if __name__ == "__main__":
    print("EdgeScan scheduler starting (blocking mode)...")
    print(f"Scans scheduled at {SCAN_HOURS} ET daily.")
    print("Press Ctrl+C to stop.\n")
    start_scheduler(blocking=True)
