"""
main.py — EdgeScan v2 FastAPI application.

All routes are versioned at /api/v1/.

Run locally:
    uvicorn main:app --reload --port 8001

Environment:
    DATA_PROVIDER_PRIMARY  yfinance (default) | edgar+alpha_vantage | alpha_vantage
    DATABASE_URL           leave unset for SQLite dev
    ANTHROPIC_API_KEY      for thesis generation (optional)
"""

from __future__ import annotations

import json
import os
import threading
import time
from datetime import date, datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, text
from sqlalchemy.orm import Session

# Load .env before anything else
load_dotenv()

from database import SessionLocal, get_db, init_db
from deps import CurrentUser, get_current_user, require_auth, require_pro, require_admin
from models import (
    FundamentalsCache,
    PortfolioHolding,
    PriceHistory,
    ScanResult,
    ScanRun,
    ThesisCache,
    WatchlistItem,
)
from scanner import scan_universe, score_stock
from scheduler import start_scheduler
from auth_routes import router as auth_router
from billing_routes import router as billing_router

# ---------------------------------------------------------------------------
# Provider singleton — initialized at startup
# ---------------------------------------------------------------------------

_provider = None
_provider_lock = threading.Lock()


def _get_provider():
    global _provider
    if _provider is None:
        with _provider_lock:
            if _provider is None:
                from data_providers.factory import get_provider  # noqa: PLC0415
                _provider = get_provider()
    return _provider


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="EdgeScan v2 API",
    description="S&P 500 stock scoring API — composite fundamental + technical scoring",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:3001,http://localhost:3000").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,   # required for cookies (Auth.js session token)
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(billing_router, prefix="/api/v1")

# Scan rate-limiter state (in-memory, per-instance)
_last_on_demand_scan: datetime = datetime.utcnow() - timedelta(hours=2)
_on_demand_lock = threading.Lock()

SCAN_RATE_LIMIT_SECONDS = 3600  # pro users: max 1 on-demand scan per hour


# ---------------------------------------------------------------------------
# Error handler
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback  # noqa: PLC0415
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    content: dict = {
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred",
        }
    }
    if os.environ.get("DEBUG", "").lower() in ("1", "true"):
        content["error"]["trace"] = traceback.format_exc()
    return JSONResponse(status_code=500, content=content)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        content = {"error": detail}
    else:
        content = {"error": {"code": "HTTP_ERROR", "message": str(detail)}}
    return JSONResponse(status_code=exc.status_code, content=content)


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup():
    try:
        init_db()
    except Exception as e:
        print(f"[main] DB init warning: {e}")

    # Initialize provider at startup so any config errors surface immediately
    try:
        provider = _get_provider()
        print(f"[main] Data provider: {provider.name}")
    except Exception as e:
        print(f"[main] WARNING: Provider init failed: {e}")

    # Start background scheduler (EOD scan at 18:30 ET)
    try:
        start_scheduler()
    except Exception as e:
        print(f"[main] Scheduler start warning: {e}")

    # Auto-scan if DB is empty (runs in background — never blocks startup)
    try:
        db = SessionLocal()
        try:
            has_data = db.query(ScanResult).first() is not None
        finally:
            db.close()

        if not has_data:
            print("[main] No scan data found — triggering initial background scan.")
            t = threading.Thread(
                target=_run_initial_scan,
                daemon=True,
                name="initial-scan",
            )
            t.start()
    except Exception as e:
        print(f"[main] Startup auto-scan check skipped: {e}")

    print("[main] EdgeScan v2 API ready.")


def _run_initial_scan() -> None:
    """Initial scan of first 50 tickers — runs in daemon thread at startup."""
    try:
        provider = _get_provider()
        from sp500_tickers import SP500_TICKERS  # noqa: PLC0415
        tickers = SP500_TICKERS[:50]
        results = scan_universe(provider, tickers)
        db = SessionLocal()
        try:
            run = ScanRun(
                triggered_by="startup",
                tickers_attempted=len(tickers),
                data_source=provider.name,
            )
            db.add(run)
            db.flush()
            succeeded = 0
            for r in results:
                _store_scan_result(r, db, commit=False)
                succeeded += 1
            run.tickers_succeeded = succeeded
            run.tickers_failed = len(tickers) - succeeded
            run.completed_at = datetime.utcnow()
            db.commit()
            print(f"[main] Initial scan complete — {succeeded} stocks stored.")
        finally:
            db.close()
    except Exception as e:
        print(f"[main] Initial scan failed: {e}")


def run_scan_job(triggered_by: str = "scheduler") -> dict:
    """
    Run a full universe scan and persist results.
    Called by the scheduler (EOD) and on-demand endpoint (pro users).
    """
    from sp500_tickers import SP500_TICKERS  # noqa: PLC0415

    provider = _get_provider()
    db = SessionLocal()
    try:
        run = ScanRun(
            triggered_by=triggered_by,
            tickers_attempted=len(SP500_TICKERS),
            data_source=provider.name,
        )
        db.add(run)
        db.flush()
        run_id = run.id
        db.commit()
    finally:
        db.close()

    def _background():
        succeeded = 0
        failed = 0
        db2 = SessionLocal()
        try:
            results = scan_universe(provider)
            for r in results:
                try:
                    _store_scan_result(r, db2, commit=False)
                    succeeded += 1
                except Exception as e:
                    print(f"[scan] Store error for {r.get('ticker')}: {e}")
                    failed += 1
            db2.commit()

            # Update the ScanRun record
            run_row = db2.query(ScanRun).filter(ScanRun.id == run_id).first()
            if run_row:
                run_row.completed_at = datetime.utcnow()
                run_row.tickers_succeeded = succeeded
                run_row.tickers_failed = failed
                db2.commit()

            print(f"[scan] Job {run_id} complete — {succeeded} succeeded, {failed} failed.")
        except Exception as e:
            db3 = SessionLocal()
            try:
                run_row = db3.query(ScanRun).filter(ScanRun.id == run_id).first()
                if run_row:
                    run_row.completed_at = datetime.utcnow()
                    run_row.error = str(e)[:1000]
                    db3.commit()
            finally:
                db3.close()
            print(f"[scan] Job {run_id} failed: {e}")
        finally:
            db2.close()

    t = threading.Thread(target=_background, daemon=True, name=f"scan-{run_id}")
    t.start()
    return {"run_id": run_id, "status": "started"}


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _parse_json_field(val: Optional[str]) -> dict:
    if not val:
        return {}
    try:
        return json.loads(val)
    except Exception:
        return {}


def _store_scan_result(result: dict, db: Session, commit: bool = True) -> None:
    """Insert a new scan result row."""
    earnings_date = None
    if result.get("earnings_date"):
        try:
            earnings_date = date.fromisoformat(result["earnings_date"])
        except (ValueError, TypeError):
            pass

    row = ScanResult(
        ticker=result["ticker"],
        name=result.get("name", result["ticker"]),
        sector=result.get("sector"),
        industry=result.get("industry"),
        score=result["score"],
        fundamental_score=result["fundamental_score"],
        technical_score=result["technical_score"],
        current_price=result.get("current_price"),
        price_target_1m=result.get("price_target_1m"),
        upside_pct=result.get("upside_pct"),
        score_breakdown_json=json.dumps(result.get("score_breakdown", {})),
        metrics_json=json.dumps(result.get("metrics", {})),
        signals_json=json.dumps(result.get("signals", {})),
        earnings_date=earnings_date,
        data_source=result.get("data_source", "unknown"),
        scanned_at=datetime.utcnow(),
    )
    db.add(row)
    if commit:
        db.commit()


def _store_price_history(ticker: str, ohlcv_df, source: str, db: Session) -> None:
    """Upsert OHLCV rows into price_history table."""
    if ohlcv_df is None or ohlcv_df.empty:
        return

    # Normalize columns
    df = ohlcv_df.copy()
    df.columns = [c.lower() if isinstance(c, str) else c for c in df.columns]
    close_col = "adj_close" if "adj_close" in df.columns else "close"

    for row_date, row in df.iterrows():
        day = row_date.date() if hasattr(row_date, "date") else row_date
        # Skip if already in DB
        exists = (
            db.query(PriceHistory)
            .filter(PriceHistory.ticker == ticker, PriceHistory.date == day)
            .first()
        )
        if not exists:
            try:
                db.add(PriceHistory(
                    ticker=ticker,
                    date=day,
                    open=float(row.get("open", 0) or 0),
                    high=float(row.get("high", 0) or 0),
                    low=float(row.get("low", 0) or 0),
                    close=float(row.get("close", 0) or 0),
                    adj_close=float(row.get(close_col, 0) or 0),
                    volume=int(float(row.get("volume", 0) or 0)),
                    source=source,
                ))
            except Exception:
                pass

    db.commit()


def _row_to_dict(row: ScanResult, include_thesis: bool = False, db: Optional[Session] = None) -> dict:
    """Convert a ScanResult ORM row to an API-ready dict."""
    result = {
        "ticker": row.ticker,
        "name": row.name,
        "sector": row.sector,
        "industry": row.industry,
        "score": row.score,
        "fundamental_score": row.fundamental_score,
        "technical_score": row.technical_score,
        "current_price": row.current_price,
        "price_target_1m": row.price_target_1m,
        "upside_pct": row.upside_pct,
        "signals": _parse_json_field(row.signals_json),
        "metrics": _parse_json_field(row.metrics_json),
        "score_breakdown": _parse_json_field(row.score_breakdown_json),
        "earnings_date": row.earnings_date.isoformat() if row.earnings_date else None,
        "data_source": row.data_source,
        "scanned_at": row.scanned_at.isoformat() if row.scanned_at else None,
    }
    if include_thesis and db is not None:
        cached = db.query(ThesisCache).filter(ThesisCache.ticker == row.ticker).first()
        result["thesis"] = cached.thesis_text if cached else None
    return result


def _get_latest_scan_results(
    db: Session,
    sector: Optional[str] = None,
    limit: int = 500,
) -> list[ScanResult]:
    """Return the most recent scan result per ticker, sorted by score desc."""
    latest_subq = (
        db.query(
            ScanResult.ticker,
            func.max(ScanResult.scanned_at).label("latest"),
        )
        .group_by(ScanResult.ticker)
        .subquery()
    )
    q = (
        db.query(ScanResult)
        .join(
            latest_subq,
            (ScanResult.ticker == latest_subq.c.ticker)
            & (ScanResult.scanned_at == latest_subq.c.latest),
        )
        .order_by(ScanResult.score.desc())
    )
    if sector:
        q = q.filter(ScanResult.sector == sector)
    return q.limit(limit).all()


def _freshness_headers(db: Session) -> dict:
    """Return X-Data-As-Of and X-Data-Source headers for scan responses."""
    latest = db.query(func.max(ScanResult.scanned_at)).scalar()
    provider = _get_provider()
    return {
        "X-Data-As-Of": latest.isoformat() if latest else datetime.utcnow().isoformat(),
        "X-Data-Source": provider.name,
    }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health(db: Session = Depends(get_db)):
    """Service health check with last scan timestamp and data source."""
    latest_run = db.query(ScanRun).order_by(ScanRun.started_at.desc()).first()
    latest_scan = db.query(func.max(ScanResult.scanned_at)).scalar()
    provider = _get_provider()

    return {
        "status": "ok",
        "version": "2.0.0",
        "data_source": provider.name,
        "is_production_safe": provider.is_production_safe,
        "last_scan_run": {
            "started_at": latest_run.started_at.isoformat() if latest_run else None,
            "completed_at": (
                latest_run.completed_at.isoformat()
                if latest_run and latest_run.completed_at
                else None
            ),
            "triggered_by": latest_run.triggered_by if latest_run else None,
            "tickers_succeeded": latest_run.tickers_succeeded if latest_run else 0,
        },
        "last_result_at": latest_scan.isoformat() if latest_scan else None,
        "total_tickers": db.query(ScanResult.ticker).distinct().count(),
    }


# ---------------------------------------------------------------------------
# Scanner endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/scanner")
def get_scanner(
    limit: int = Query(default=10, ge=1, le=500),
    sector: Optional[str] = None,
    user: Optional[CurrentUser] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return scored S&P 500 stocks sorted by composite score.
    Free tier: top 10 only. Pro tier: up to `limit` results.
    """
    all_results = _get_latest_scan_results(db, sector=sector)
    total_available = len(all_results)

    # Tier enforcement
    if user is None or user.tier == "free":
        results = all_results[:10]
        tier = "free"
    else:
        results = all_results[:limit]
        tier = user.tier

    last_scan = db.query(func.max(ScanResult.scanned_at)).scalar()
    provider = _get_provider()

    return JSONResponse(
        content={
            "results": [_row_to_dict(r) for r in results],
            "tier": tier,
            "total_available": total_available,
            "returned": len(results),
            "last_scanned_at": last_scan.isoformat() if last_scan else None,
        },
        headers={
            "X-Data-As-Of": last_scan.isoformat() if last_scan else datetime.utcnow().isoformat(),
            "X-Data-Source": provider.name,
        },
    )


@app.get("/api/v1/scanner/movers")
def get_scanner_movers(
    top_n: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Return top score risers and fallers comparing each ticker's two most recent scans."""
    sql = text("""
        WITH ranked AS (
            SELECT
                ticker, name, sector, score, current_price, scanned_at,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY scanned_at DESC) AS rn
            FROM scan_results
        )
        SELECT
            r1.ticker,
            r1.name,
            r1.sector,
            r1.score        AS current_score,
            r1.current_price,
            r2.score        AS prev_score,
            r1.scanned_at   AS current_ts,
            r2.scanned_at   AS prev_ts
        FROM ranked r1
        JOIN ranked r2 ON r1.ticker = r2.ticker AND r2.rn = 2
        WHERE r1.rn = 1
    """)
    rows = db.execute(sql).fetchall()

    if not rows:
        return {"risers": [], "fallers": [], "current_scan": None, "previous_scan": None}

    movers = []
    sample_current = None
    sample_previous = None

    for row in rows:
        delta = (row.current_score or 0) - (row.prev_score or 0)
        if delta == 0:
            continue
        movers.append({
            "ticker": row.ticker,
            "name": row.name,
            "sector": row.sector,
            "score": row.current_score,
            "prev_score": row.prev_score,
            "score_change": delta,
            "current_price": row.current_price,
        })
        if sample_current is None:
            ts = row.current_ts
            sample_current = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
            ts2 = row.prev_ts
            sample_previous = ts2.isoformat() if hasattr(ts2, "isoformat") else str(ts2)

    movers.sort(key=lambda x: x["score_change"], reverse=True)
    risers = [m for m in movers if m["score_change"] > 0][:top_n]
    fallers = list(reversed([m for m in movers if m["score_change"] < 0]))[:top_n]

    return {
        "risers": risers,
        "fallers": fallers,
        "current_scan": sample_current,
        "previous_scan": sample_previous,
    }


@app.post("/api/v1/scanner/run")
def trigger_on_demand_scan(
    user: CurrentUser = Depends(require_pro),
):
    """
    Trigger an on-demand full scan. Pro users only. Rate-limited to 1/hour.
    Returns immediately — scan runs in background.
    """
    global _last_on_demand_scan
    with _on_demand_lock:
        seconds_since = (datetime.utcnow() - _last_on_demand_scan).total_seconds()
        if seconds_since < SCAN_RATE_LIMIT_SECONDS:
            wait_min = int((SCAN_RATE_LIMIT_SECONDS - seconds_since) / 60)
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "RATE_LIMITED",
                    "message": f"On-demand scan limited to 1/hour. Try again in ~{wait_min} min.",
                },
            )
        _last_on_demand_scan = datetime.utcnow()

    result = run_scan_job(triggered_by=f"on_demand:{user.email}")
    return {
        "status": "started",
        "run_id": result["run_id"],
        "message": "Scan started in background. Poll /api/v1/scan/status for progress.",
    }


# ---------------------------------------------------------------------------
# Stock detail endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/stocks/{ticker}")
def get_stock(
    ticker: str,
    user: Optional[CurrentUser] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full stock detail with score, metrics, signals, and thesis."""
    ticker = ticker.upper().strip()
    provider = _get_provider()

    # Get latest cached scan result
    row = (
        db.query(ScanResult)
        .filter(ScanResult.ticker == ticker)
        .order_by(ScanResult.scanned_at.desc())
        .first()
    )

    # Score on-demand if not in DB (or older than 4 hours)
    if row is None or (datetime.utcnow() - row.scanned_at).total_seconds() > 14400:
        try:
            result = score_stock(ticker, provider)
            if result:
                _store_scan_result(result, db)
                row = (
                    db.query(ScanResult)
                    .filter(ScanResult.ticker == ticker)
                    .order_by(ScanResult.scanned_at.desc())
                    .first()
                )
        except Exception as e:
            print(f"[main] On-demand score failed for {ticker}: {e}")

    if not row:
        raise HTTPException(
            status_code=404,
            detail={"code": "TICKER_NOT_FOUND", "message": f"No data found for {ticker}"},
        )

    detail = _row_to_dict(row, include_thesis=True, db=db)

    # Attempt Anthropic thesis generation if API key is present and no cached thesis
    if detail.get("thesis") is None:
        detail["thesis"] = _try_generate_thesis(ticker, detail, row.score, db)

    return JSONResponse(
        content=detail,
        headers={
            "X-Data-As-Of": row.scanned_at.isoformat(),
            "X-Data-Source": row.data_source or provider.name,
        },
    )


def _try_generate_thesis(
    ticker: str, detail: dict, score: float, db: Session
) -> Optional[str]:
    """Generate an AI thesis if ANTHROPIC_API_KEY is set; cache and return it."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic  # noqa: PLC0415
        client = anthropic.Anthropic(api_key=api_key)
        metrics = detail.get("metrics", {})
        signals = detail.get("signals", {})
        prompt = (
            f"Write a concise 2-paragraph investment thesis for {ticker} "
            f"(EdgeScan score: {score}/100). "
            f"Key metrics: rev_growth={metrics.get('rev_growth', 'N/A')}%, "
            f"eps_growth={metrics.get('eps_growth', 'N/A')}%, "
            f"gross_margin={metrics.get('gross_margin', 'N/A')}%, "
            f"fcf_yield={metrics.get('fcf_yield', 'N/A')}%, "
            f"roe={metrics.get('roe', 'N/A')}%, "
            f"debt_to_equity={metrics.get('debt_to_equity', 'N/A')}. "
            f"Technical: RSI={signals.get('rsi', 'N/A')}, "
            f"MACD={signals.get('macd_status', 'N/A')}, "
            f"vs 200MA={signals.get('pct_above_200ma', 'N/A')}%. "
            f"Be factual and concise. No disclaimers."
        )
        msg = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        thesis_text = msg.content[0].text if msg.content else None
        if thesis_text:
            # Cache it
            existing = db.query(ThesisCache).filter(ThesisCache.ticker == ticker).first()
            if existing:
                existing.thesis_text = thesis_text
                existing.score_at_generation = score
                existing.generated_at = datetime.utcnow()
            else:
                db.add(ThesisCache(
                    ticker=ticker,
                    thesis_text=thesis_text,
                    score_at_generation=score,
                ))
            db.commit()
        return thesis_text
    except Exception as e:
        print(f"[thesis] Generation failed for {ticker}: {e}")
        return None


@app.get("/api/v1/stocks/{ticker}/history")
def get_stock_history(
    ticker: str,
    period: str = Query(default="3m", description="3m | 6m | 1y"),
    db: Session = Depends(get_db),
):
    """Return OHLCV price bars for charting."""
    ticker = ticker.upper().strip()
    provider = _get_provider()

    period_days_map = {"3m": 90, "6m": 180, "1y": 365}
    period_days = period_days_map.get(period, 90)
    start_date = date.today() - timedelta(days=period_days)

    # Try DB first
    rows = (
        db.query(PriceHistory)
        .filter(PriceHistory.ticker == ticker, PriceHistory.date >= start_date)
        .order_by(PriceHistory.date.asc())
        .all()
    )

    if not rows:
        # Fetch from provider and cache
        try:
            ohlcv = provider.get_ohlcv(ticker, period_days=period_days)
            if ohlcv and ohlcv.df is not None:
                _store_price_history(ticker, ohlcv.df, ohlcv.source, db)
                rows = (
                    db.query(PriceHistory)
                    .filter(PriceHistory.ticker == ticker, PriceHistory.date >= start_date)
                    .order_by(PriceHistory.date.asc())
                    .all()
                )
        except Exception as e:
            print(f"[main] Price history fetch failed for {ticker}: {e}")

    if not rows:
        raise HTTPException(
            status_code=404,
            detail={"code": "NO_PRICE_DATA", "message": f"No price history for {ticker}"},
        )

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
                "adj_close": r.adj_close,
                "volume": r.volume,
            }
            for r in rows
        ],
    }


@app.get("/api/v1/stocks/{ticker}/score-history")
def get_score_history(
    ticker: str,
    user: Optional[CurrentUser] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Score history over time.
    Free users: last 3 scans. Pro users: full history.
    """
    ticker = ticker.upper().strip()
    is_pro = user and user.tier == "pro"

    q = (
        db.query(ScanResult)
        .filter(ScanResult.ticker == ticker)
        .order_by(ScanResult.scanned_at.desc())
    )
    if not is_pro:
        q = q.limit(3)
    else:
        q = q.limit(90)

    rows = q.all()
    rows = list(reversed(rows))  # chronological order

    return {
        "ticker": ticker,
        "tier": user.tier if user else "free",
        "history": [
            {
                "date": r.scanned_at.isoformat(),
                "score": r.score,
                "fundamental_score": r.fundamental_score,
                "technical_score": r.technical_score,
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

@app.get("/api/v1/search")
def search(
    q: str = Query(default="", min_length=1, max_length=50),
    db: Session = Depends(get_db),
):
    """Ticker + company name autocomplete from scan_results cache."""
    from sqlalchemy import case as sql_case  # noqa: PLC0415

    q_stripped = q.strip()
    q_upper = q_stripped.upper()

    # Latest scan per ticker
    subq = (
        db.query(
            ScanResult.ticker,
            func.max(ScanResult.scanned_at).label("max_at"),
        )
        .group_by(ScanResult.ticker)
        .subquery()
    )

    order_expr = sql_case((ScanResult.ticker.ilike(f"{q_upper}%"), 0), else_=1)

    rows = (
        db.query(ScanResult)
        .join(
            subq,
            (ScanResult.ticker == subq.c.ticker)
            & (ScanResult.scanned_at == subq.c.max_at),
        )
        .filter(
            ScanResult.ticker.ilike(f"%{q_upper}%")
            | ScanResult.name.ilike(f"%{q_stripped}%")
        )
        .order_by(order_expr, ScanResult.ticker)
        .limit(10)
        .all()
    )

    if rows:
        results = [
            {
                "ticker": r.ticker,
                "name": r.name,
                "sector": r.sector,
                "score": r.score,
                "current_price": r.current_price,
            }
            for r in rows
        ]
    else:
        # Fallback to static SP500 list
        from sp500_tickers import SP500_TICKERS  # noqa: PLC0415
        matches = [t for t in SP500_TICKERS if t.startswith(q_upper) or q_upper in t][:10]
        results = [{"ticker": t, "name": None, "sector": None, "score": None, "current_price": None} for t in matches]

    return {"query": q, "results": results}


# ---------------------------------------------------------------------------
# Watchlist
# ---------------------------------------------------------------------------

FREE_WATCHLIST_LIMIT = 5


@app.get("/api/v1/watchlist")
def get_watchlist(
    user: CurrentUser = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Return user's watchlist with latest scores."""
    items = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == user.id)
        .order_by(WatchlistItem.added_at.asc())
        .all()
    )

    results = []
    for item in items:
        row = (
            db.query(ScanResult)
            .filter(ScanResult.ticker == item.ticker)
            .order_by(ScanResult.scanned_at.desc())
            .first()
        )
        results.append({
            "ticker": item.ticker,
            "added_at": item.added_at.isoformat(),
            "score": row.score if row else None,
            "name": row.name if row else None,
            "sector": row.sector if row else None,
            "current_price": row.current_price if row else None,
            "price_target_1m": row.price_target_1m if row else None,
            "upside_pct": row.upside_pct if row else None,
        })

    return {
        "watchlist": results,
        "count": len(results),
        "limit": None if user.tier == "pro" else FREE_WATCHLIST_LIMIT,
    }


@app.post("/api/v1/watchlist/{ticker}", status_code=201)
def add_to_watchlist(
    ticker: str,
    user: CurrentUser = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Add a ticker to the user's watchlist. Free: max 5. Pro: unlimited."""
    ticker = ticker.upper().strip()

    # Check if already in watchlist
    existing = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == user.id, WatchlistItem.ticker == ticker)
        .first()
    )
    if existing:
        return {"ticker": ticker, "status": "already_in_watchlist"}

    # Tier enforcement for free users
    if user.tier == "free":
        count = db.query(WatchlistItem).filter(WatchlistItem.user_id == user.id).count()
        if count >= FREE_WATCHLIST_LIMIT:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "WATCHLIST_LIMIT",
                    "message": f"Free tier watchlist limited to {FREE_WATCHLIST_LIMIT} items. Upgrade to Pro for unlimited.",
                },
            )

    db.add(WatchlistItem(user_id=user.id, ticker=ticker))
    db.commit()
    return {"ticker": ticker, "status": "added"}


@app.delete("/api/v1/watchlist/{ticker}", status_code=204)
def remove_from_watchlist(
    ticker: str,
    user: CurrentUser = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Remove a ticker from the user's watchlist."""
    ticker = ticker.upper().strip()
    db.query(WatchlistItem).filter(
        WatchlistItem.user_id == user.id, WatchlistItem.ticker == ticker
    ).delete()
    db.commit()


# ---------------------------------------------------------------------------
# Weekly snapshot
# ---------------------------------------------------------------------------

@app.get("/api/v1/weekly")
def get_weekly_snapshot(db: Session = Depends(get_db)):
    """Top movers snapshot — top stocks, gainers, losers, sector breakdown."""
    latest_subq = (
        db.query(ScanResult.ticker, func.max(ScanResult.scanned_at).label("latest"))
        .group_by(ScanResult.ticker)
        .subquery()
    )
    latest_rows = (
        db.query(ScanResult)
        .join(
            latest_subq,
            (ScanResult.ticker == latest_subq.c.ticker)
            & (ScanResult.scanned_at == latest_subq.c.latest),
        )
        .all()
    )

    week_ago = datetime.utcnow() - timedelta(days=7)
    old_subq = (
        db.query(ScanResult.ticker, func.max(ScanResult.scanned_at).label("latest"))
        .filter(ScanResult.scanned_at <= week_ago)
        .group_by(ScanResult.ticker)
        .subquery()
    )
    old_rows = (
        db.query(ScanResult)
        .join(
            old_subq,
            (ScanResult.ticker == old_subq.c.ticker)
            & (ScanResult.scanned_at == old_subq.c.latest),
        )
        .all()
    )
    old_scores = {r.ticker: r.score for r in old_rows}

    movers = []
    for r in latest_rows:
        old = old_scores.get(r.ticker)
        movers.append({
            "ticker": r.ticker,
            "name": r.name,
            "sector": r.sector,
            "score": r.score,
            "score_delta": (r.score - old) if old is not None else None,
            "current_price": r.current_price,
            "upside_pct": r.upside_pct,
        })

    with_delta = [m for m in movers if m["score_delta"] is not None]
    gainers = sorted(with_delta, key=lambda x: x["score_delta"], reverse=True)[:5]
    losers = sorted(with_delta, key=lambda x: x["score_delta"])[:5]
    top_stocks = sorted(movers, key=lambda x: x["score"], reverse=True)[:10]

    sector_map: dict = {}
    for r in latest_rows:
        s = r.sector or "Other"
        if s not in sector_map:
            sector_map[s] = {"total": 0.0, "count": 0}
        sector_map[s]["total"] += r.score
        sector_map[s]["count"] += 1

    sectors = sorted(
        [
            {
                "sector": k,
                "avg_score": round(v["total"] / v["count"], 1),
                "count": v["count"],
            }
            for k, v in sector_map.items()
        ],
        key=lambda x: x["avg_score"],
        reverse=True,
    )

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "top_stocks": top_stocks,
        "gainers": gainers,
        "losers": losers,
        "sectors": sectors,
        "total_scanned": len(latest_rows),
    }


# ---------------------------------------------------------------------------
# Earnings calendar
# ---------------------------------------------------------------------------

@app.get("/api/v1/earnings")
def get_earnings_calendar(
    user: Optional[CurrentUser] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upcoming earnings for S&P 500 stocks.
    Free: current week only. Pro: full calendar.
    """
    is_pro = user and user.tier == "pro"

    latest_subq = (
        db.query(ScanResult.ticker, func.max(ScanResult.scanned_at).label("latest"))
        .group_by(ScanResult.ticker)
        .subquery()
    )

    q = (
        db.query(ScanResult)
        .join(
            latest_subq,
            (ScanResult.ticker == latest_subq.c.ticker)
            & (ScanResult.scanned_at == latest_subq.c.latest),
        )
        .filter(ScanResult.earnings_date.isnot(None))
        .order_by(ScanResult.earnings_date.asc())
    )

    # Free: only current week
    if not is_pro:
        week_end = date.today() + timedelta(days=7)
        q = q.filter(ScanResult.earnings_date <= week_end)

    rows = q.all()

    return {
        "tier": user.tier if user else "free",
        "earnings": [
            {
                "ticker": r.ticker,
                "name": r.name,
                "sector": r.sector,
                "score": r.score,
                "earnings_date": r.earnings_date.isoformat(),
                "current_price": r.current_price,
                "upside_pct": r.upside_pct,
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# Scan status
# ---------------------------------------------------------------------------

@app.get("/api/v1/scan/status")
def get_scan_status(db: Session = Depends(get_db)):
    """Current scan progress and last completion time."""
    latest_run = db.query(ScanRun).order_by(ScanRun.started_at.desc()).first()
    in_progress = latest_run is not None and latest_run.completed_at is None

    # Guard against zombie scans (started > 60min ago, never completed)
    if in_progress and latest_run:
        age_min = (datetime.utcnow() - latest_run.started_at).total_seconds() / 60
        if age_min > 60:
            in_progress = False

    last_scanned_at = None
    if latest_run and latest_run.completed_at:
        last_scanned_at = latest_run.completed_at.isoformat()
    else:
        latest_result = db.query(func.max(ScanResult.scanned_at)).scalar()
        if latest_result:
            last_scanned_at = latest_result.isoformat()

    return {
        "in_progress": in_progress,
        "last_scanned_at": last_scanned_at,
        "total_scanned": db.query(ScanResult.ticker).distinct().count(),
        "last_run": {
            "id": latest_run.id if latest_run else None,
            "triggered_by": latest_run.triggered_by if latest_run else None,
            "tickers_succeeded": latest_run.tickers_succeeded if latest_run else 0,
            "tickers_failed": latest_run.tickers_failed if latest_run else 0,
            "error": latest_run.error if latest_run else None,
        } if latest_run else None,
    }
