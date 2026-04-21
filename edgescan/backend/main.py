"""
main.py — EdgeScan FastAPI application.

Endpoints:
  GET  /api/top-opportunities          top 10 scored stocks from last scan
  GET  /api/stock/{ticker}             full detail for any S&P 500 ticker
  GET  /api/stock/{ticker}/history     OHLCV price history (period param)
  GET  /api/search?q={query}           ticker autocomplete from S&P 500 list
  GET  /api/market-pulse               SPX/VIX/10Y cached snapshot
  POST /api/scan/trigger               manually trigger a full scan (auth protected)

Run locally:
    uvicorn main:app --reload --port 8000
"""

import json
import os
import time
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db, init_db
from data_fetcher import SP500_TICKERS, fetch_fundamentals, fetch_price_history
from models import PriceHistory, ScanResult, ThesisCache
from scanner import scan_tickers, score_stock
from thesis_generator import generate_thesis

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="EdgeScan API",
    description="S&P 500 stock scanner — composite scoring + AI thesis generation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCAN_SECRET = os.getenv("SCAN_SECRET", "edgescan-local-secret")

# Simple in-memory cache for market-pulse endpoint
_market_pulse_cache: dict = {"data": None, "expires_at": 0}


@app.on_event("startup")
def startup():
    init_db()
    print("[main] EdgeScan API ready.")


# ---------------------------------------------------------------------------
# Response helpers
# ---------------------------------------------------------------------------

def _parse_json_field(val: Optional[str]) -> dict:
    if not val:
        return {}
    try:
        return json.loads(val)
    except Exception:
        return {}


def _row_to_dict(row: ScanResult, include_thesis: bool = False, db: Optional[Session] = None) -> dict:
    result = {
        "ticker": row.ticker,
        "name": row.name,
        "sector": row.sector,
        "score": row.score,
        "fundamental_score": row.fundamental_score,
        "technical_score": row.technical_score,
        "current_price": row.current_price,
        "price_target_2m": row.price_target_2m,
        "upside_pct": row.upside_pct,
        "signals": _parse_json_field(row.signals_json),
        "metrics": _parse_json_field(row.metrics_json),
        "score_breakdown": _parse_json_field(row.score_breakdown_json),
        "earnings_date": row.earnings_date.isoformat() if row.earnings_date else None,
        "scanned_at": row.scanned_at.isoformat() if row.scanned_at else None,
    }
    if include_thesis and db is not None:
        cached = db.query(ThesisCache).filter(ThesisCache.ticker == row.ticker).first()
        result["thesis"] = cached.thesis_text if cached else None
    return result


def _store_scan_result(result: dict, db: Session) -> None:
    """Upsert the latest scan result for a ticker (keep history; just insert new row)."""
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
        earnings_date=date.fromisoformat(result["earnings_date"]) if result.get("earnings_date") else None,
        scanned_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()


def _store_price_history(ticker: str, db: Session) -> None:
    """Fetch and upsert 1-year OHLCV for a ticker into price_history."""
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


# ---------------------------------------------------------------------------
# GET /api/top-opportunities
# ---------------------------------------------------------------------------

@app.get("/api/top-opportunities")
def top_opportunities(db: Session = Depends(get_db)):
    """
    Return the top 10 scored stocks from the most recent scan.
    Falls back to an on-demand scan of 10 representative tickers
    if the DB is empty.
    """
    # Latest scanned_at timestamp
    latest_ts = db.execute(
        text("SELECT MAX(scanned_at) FROM scan_results")
    ).scalar()

    rows = []
    if latest_ts:
        # Normalise to datetime (SQLite returns strings)
        if isinstance(latest_ts, str):
            latest_ts = datetime.fromisoformat(latest_ts)
        # All results from the latest scan batch (within 10 min window)
        cutoff = latest_ts - timedelta(minutes=10)
        rows = (
            db.query(ScanResult)
            .filter(ScanResult.scanned_at >= cutoff)
            .order_by(ScanResult.score.desc())
            .limit(100)
            .all()
        )

    if not rows:
        # DB is empty — seed with a quick 30-ticker scan
        sample = SP500_TICKERS[:30]
        results = scan_tickers(sample)
        for r in results:
            _store_scan_result(r, db)
        # Re-query
        latest_ts = db.execute(text("SELECT MAX(scanned_at) FROM scan_results")).scalar()
        cutoff = latest_ts - timedelta(minutes=10)
        rows = (
            db.query(ScanResult)
            .filter(ScanResult.scanned_at >= cutoff)
            .order_by(ScanResult.score.desc())
            .limit(100)
            .all()
        )

    # Compute minutes since last scan
    minutes_ago = None
    if latest_ts:
        delta = datetime.utcnow() - (latest_ts if isinstance(latest_ts, datetime) else datetime.fromisoformat(str(latest_ts)))
        minutes_ago = int(delta.total_seconds() / 60)

    return {
        "results": [_row_to_dict(r, include_thesis=True, db=db) for r in rows],
        "total_scanned": db.query(ScanResult.ticker).distinct().count(),
        "last_scanned_minutes_ago": minutes_ago,
        "scanned_at": latest_ts.isoformat() if isinstance(latest_ts, datetime) else str(latest_ts),
    }


# ---------------------------------------------------------------------------
# GET /api/stock/{ticker}
# ---------------------------------------------------------------------------

@app.get("/api/stock/{ticker}")
def get_stock(ticker: str, db: Session = Depends(get_db)):
    """
    Full detail for a ticker — score, metrics, signals, thesis.
    Runs a live score_stock() if the DB has no recent result (< 4 hours old).
    """
    ticker = ticker.upper().strip()

    # Check for recent scan
    cutoff = datetime.utcnow() - timedelta(hours=4)
    row = (
        db.query(ScanResult)
        .filter(ScanResult.ticker == ticker, ScanResult.scanned_at >= cutoff)
        .order_by(ScanResult.scanned_at.desc())
        .first()
    )

    if not row:
        # Score on demand
        result = score_stock(ticker)
        _store_scan_result(result, db)
        row = (
            db.query(ScanResult)
            .filter(ScanResult.ticker == ticker)
            .order_by(ScanResult.scanned_at.desc())
            .first()
        )

    if not row:
        raise HTTPException(status_code=404, detail=f"No data found for {ticker}")

    detail = _row_to_dict(row, include_thesis=False, db=db)

    # Attach / generate thesis
    metrics = detail.get("metrics", {})
    signals = detail.get("signals", {})
    detail["thesis"] = generate_thesis(
        ticker=ticker,
        metrics=metrics,
        signals=signals,
        current_score=row.score,
        db=db,
    )

    return detail


# ---------------------------------------------------------------------------
# GET /api/stock/{ticker}/history
# ---------------------------------------------------------------------------

@app.get("/api/stock/{ticker}/history")
def get_price_history(
    ticker: str,
    period: str = Query(default="3m", description="1w | 1m | 3m | 6m | 1y"),
    db: Session = Depends(get_db),
):
    """
    Return OHLCV price history for charting.
    Reads from price_history table; fetches from yfinance if missing.
    """
    ticker = ticker.upper().strip()

    period_days = {"1w": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365}.get(period, 90)
    start_date = date.today() - timedelta(days=period_days)

    rows = (
        db.query(PriceHistory)
        .filter(PriceHistory.ticker == ticker, PriceHistory.date >= start_date)
        .order_by(PriceHistory.date.asc())
        .all()
    )

    if not rows:
        # Fetch and store
        _store_price_history(ticker, db)
        rows = (
            db.query(PriceHistory)
            .filter(PriceHistory.ticker == ticker, PriceHistory.date >= start_date)
            .order_by(PriceHistory.date.asc())
            .all()
        )

    if not rows:
        raise HTTPException(status_code=404, detail=f"No price history found for {ticker}")

    return {
        "ticker": ticker,
        "period": period,
        "data": [
            {
                "date": r.date.isoformat(),
                "open": r.open,
                "high": r.high,
                "low": r.low,
                "close": r.close,
                "volume": r.volume,
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# GET /api/search
# ---------------------------------------------------------------------------

@app.get("/api/search")
def search(q: str = Query(default="", min_length=1)):
    """
    Ticker autocomplete — searches the static S&P 500 list.
    Returns up to 10 matches on ticker prefix or name substring.
    """
    q_upper = q.upper().strip()
    q_lower = q.lower().strip()

    matches = [
        t for t in SP500_TICKERS
        if t.startswith(q_upper) or q_lower in t.lower()
    ][:10]

    return {"query": q, "results": matches}


# ---------------------------------------------------------------------------
# GET /api/market-pulse
# ---------------------------------------------------------------------------

@app.get("/api/market-pulse")
def market_pulse():
    """
    Returns SPX, VIX, and 10Y yield snapshots.
    Cached for 5 minutes. Falls back to last-known values on fetch failure.
    """
    global _market_pulse_cache

    now = time.time()
    if _market_pulse_cache["data"] and now < _market_pulse_cache["expires_at"]:
        return _market_pulse_cache["data"]

    # Attempt live fetch via yfinance
    data = _fetch_market_pulse()
    _market_pulse_cache = {"data": data, "expires_at": now + 300}
    return data


def _fetch_market_pulse() -> dict:
    try:
        import yfinance as yf

        spx = yf.Ticker("^GSPC")
        vix = yf.Ticker("^VIX")
        tnx = yf.Ticker("^TNX")  # 10-year yield (x10 = %)

        def _last_price(ticker_obj) -> Optional[float]:
            try:
                info = ticker_obj.fast_info
                return round(float(info.last_price), 2)
            except Exception:
                return None

        spx_price = _last_price(spx)
        vix_price = _last_price(vix)
        tnx_price = _last_price(tnx)

        return {
            "spx": spx_price,
            "vix": vix_price,
            "ten_year_yield": round(tnx_price / 10, 3) if tnx_price else None,
            "cached_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "spx": None,
            "vix": None,
            "ten_year_yield": None,
            "cached_at": datetime.utcnow().isoformat(),
            "error": str(e),
        }


# ---------------------------------------------------------------------------
# POST /api/scan/trigger
# ---------------------------------------------------------------------------

@app.post("/api/scan/trigger")
def trigger_scan(
    tickers: Optional[list[str]] = None,
    x_scan_secret: str = Header(default=""),
    db: Session = Depends(get_db),
):
    """
    Manually trigger a scan. Protected by X-Scan-Secret header.
    If tickers is None/empty, scans the full SP500_TICKERS list.
    Returns count of tickers scored and top 5 results.
    """
    if x_scan_secret != SCAN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid scan secret")

    target = tickers if tickers else SP500_TICKERS
    results = scan_tickers(target)

    for r in results:
        _store_scan_result(r, db)

    top5 = results[:5]
    return {
        "scanned": len(results),
        "scanned_at": datetime.utcnow().isoformat(),
        "top_5": top5,
    }


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "edgescan-api"}
