"""
scheduler.py — Market-calendar-aware APScheduler for EdgeScan v2.

Runs a full EOD scan at 6:30pm ET on NYSE trading days only.
Uses pandas-market-calendars to check for NYSE holidays and early closes.

Usage:
  start_scheduler() — called from main.py startup (background mode)
  run_eod_scan()    — can also be called directly for testing
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

import pytz

ET = pytz.timezone("America/New_York")


def is_trading_day(dt: Optional[datetime] = None) -> bool:
    """
    Returns True if dt (interpreted as ET) is a NYSE trading day.
    Defaults to today if dt is None.
    """
    import pandas_market_calendars as mcal  # noqa: PLC0415

    nyse = mcal.get_calendar("NYSE")
    check_date = (dt or datetime.now(ET)).date()
    schedule = nyse.schedule(
        start_date=str(check_date), end_date=str(check_date)
    )
    return not schedule.empty


def run_eod_scan() -> None:
    """
    Run the nightly EOD scan. Called by the APScheduler cron job.
    Skips execution if today is not a NYSE trading day.
    """
    if not is_trading_day():
        print("[scheduler] Not a trading day — skipping EOD scan")
        return

    print(f"[scheduler] EOD scan triggered at {datetime.now(ET).isoformat()}")

    # Import here to avoid circular dependency (main imports scheduler)
    try:
        from main import run_scan_job  # noqa: PLC0415
        run_scan_job(triggered_by="scheduler")
    except Exception as e:
        print(f"[scheduler] EOD scan failed: {e}")


def start_scheduler():
    """
    Start the APScheduler in background mode.
    Returns the scheduler instance (caller can call .shutdown() if needed).

    Schedule:
      - 6:30pm ET weekdays — EOD scan (market data fully settled after close)
    """
    from apscheduler.schedulers.background import BackgroundScheduler  # noqa: PLC0415

    scheduler = BackgroundScheduler(timezone=ET)

    # 6:30pm ET — after market close + data availability buffer
    scheduler.add_job(
        run_eod_scan,
        "cron",
        hour=18,
        minute=30,
        timezone=ET,
        id="eod_scan",
        name="EOD S&P 500 scan (18:30 ET)",
        replace_existing=True,
        misfire_grace_time=3600,  # fire up to 1hr late if process was down
    )

    scheduler.start()
    print("[scheduler] Background scheduler started — EOD scan at 18:30 ET on trading days.")
    return scheduler
