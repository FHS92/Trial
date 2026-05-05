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

import hashlib
import json
import os
import secrets
import threading
import time
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Header, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import get_db, init_db, SessionLocal
from data_fetcher import SP500_TICKERS, fetch_fundamentals, fetch_price_history
from models import BacktestRun, PriceHistory, PortfolioHolding, Profile, ProfileSession, ScanResult, ScanJob, ThesisCache, WatchlistItem
from scanner import scan_tickers, score_stock
from thesis_generator import generate_thesis
from analytics import get_sector_heatmap, get_rebalance_suggestions
from chat import answer_question
from paper_trading import run_monthly_rebalance, get_paper_portfolio

# ---------------------------------------------------------------------------
# Session helpers  (DB-backed — survive backend restarts)
# ---------------------------------------------------------------------------

def _create_session(token: str, profile_id: str) -> None:
    db = SessionLocal()
    try:
        db.add(ProfileSession(token=token, profile_id=profile_id))
        db.commit()
    finally:
        db.close()


def _get_profile_id_from_token(authorization: str) -> Optional[str]:
    """Extract profile_id from 'Bearer <token>' header value, or return None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[len("Bearer "):]
    db = SessionLocal()
    try:
        row = db.query(ProfileSession).filter(ProfileSession.token == token).first()
        return row.profile_id if row else None
    finally:
        db.close()


def _delete_sessions_for_profile(profile_id: str) -> None:
    db = SessionLocal()
    try:
        db.query(ProfileSession).filter(ProfileSession.profile_id == profile_id).delete()
        db.commit()
    finally:
        db.close()


def _pin_hash(pin: str) -> str:
    """SHA-256 hash of the PIN (bcrypt not in requirements; secrets+hashlib used instead)."""
    return hashlib.sha256(pin.encode()).hexdigest()


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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "trace": traceback.format_exc()},
        headers=CORS_HEADERS,
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=CORS_HEADERS,
    )

SCAN_SECRET = os.getenv("SCAN_SECRET", "edgescan-local-secret")

# Simple in-memory cache for market-pulse endpoint
_market_pulse_cache: dict = {"data": None, "expires_at": 0}


# ---------------------------------------------------------------------------
# Profile Pydantic models
# ---------------------------------------------------------------------------

class ProfileCreateIn(BaseModel):
    name: str
    pin: Optional[str] = None
    avatarColour: str = "#4F8EF7"


class ProfilePatchIn(BaseModel):
    name: str


class UnlockIn(BaseModel):
    pin: Optional[str] = None


@app.on_event("startup")
def startup():
    try:
        init_db()
    except Exception as e:
        print(f"[main] DB init warning: {e}")
    _market_pulse_cache["expires_at"] = 0
    print("[main] EdgeScan API ready.")

    # Auto-scan on first boot if DB has no data — runs in background, never blocks startup
    try:
        db = SessionLocal()
        try:
            has_data = db.query(ScanResult).first()
        finally:
            db.close()
        if not has_data:
            print("[main] No scan data — triggering initial scan in background.")
            def _initial_scan():
                try:
                    from data_fetcher import get_universe_tickers
                    tickers = get_universe_tickers("sp500")[:50]
                    results = scan_tickers(tickers)
                    db2 = SessionLocal()
                    try:
                        for r in results:
                            _store_scan_result(r, db2)
                        print(f"[main] Initial scan complete — {len(results)} stocks stored.")
                    finally:
                        db2.close()
                except Exception as e:
                    print(f"[main] Initial scan failed: {e}")
            threading.Thread(target=_initial_scan, daemon=True).start()
    except Exception as e:
        print(f"[main] Startup check skipped: {e}")


# ---------------------------------------------------------------------------
# Profile endpoints
# ---------------------------------------------------------------------------

def _profile_to_dict(p: Profile) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "avatarColour": p.avatar_colour,
        "hasPin": p.pin_hash is not None,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
    }


@app.get("/api/profiles")
def list_profiles(db: Session = Depends(get_db)):
    profiles = db.query(Profile).order_by(Profile.created_at.asc()).all()
    return [_profile_to_dict(p) for p in profiles]


@app.post("/api/profiles", status_code=201)
def create_profile(body: ProfileCreateIn, db: Session = Depends(get_db)):
    p = Profile(
        name=body.name.strip()[:64],
        pin_hash=_pin_hash(body.pin) if body.pin else None,
        avatar_colour=body.avatarColour,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _profile_to_dict(p)


@app.patch("/api/profiles/{profile_id}")
def patch_profile(
    profile_id: str,
    body: ProfilePatchIn,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    pid = _get_profile_id_from_token(authorization)
    if pid != profile_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    p = db.query(Profile).filter(Profile.id == profile_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")
    p.name = body.name.strip()[:64]
    db.commit()
    db.refresh(p)
    return _profile_to_dict(p)


@app.delete("/api/profiles/{profile_id}", status_code=204)
def delete_profile(
    profile_id: str,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    pid = _get_profile_id_from_token(authorization)
    if pid != profile_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    p = db.query(Profile).filter(Profile.id == profile_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(p)
    db.commit()
    _delete_sessions_for_profile(profile_id)


@app.post("/api/profiles/{profile_id}/unlock")
def unlock_profile(
    profile_id: str,
    body: UnlockIn,
    db: Session = Depends(get_db),
):
    p = db.query(Profile).filter(Profile.id == profile_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")

    if p.pin_hash is not None:
        if not body.pin or _pin_hash(body.pin) != p.pin_hash:
            raise HTTPException(status_code=401, detail="Incorrect PIN")

    token = secrets.token_urlsafe(32)
    _create_session(token, profile_id)
    return {"token": token}


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

@app.get("/api/leaderboard")
def get_leaderboard(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    """
    Public leaderboard — ranked by overall portfolio return %.
    Accepts optional Bearer token to mark the caller's entry as is_me=True.
    """
    from datetime import date, timedelta

    my_profile_id = _get_profile_id_from_token(authorization)

    today = date.today()
    week_ago   = today - timedelta(days=7)
    month_ago  = today - timedelta(days=30)
    # Universal leaderboard start date — all returns measured from here
    START_DATE = date(2026, 5, 1)

    profiles = db.query(Profile).order_by(Profile.created_at.asc()).all()
    if not profiles:
        return {"entries": [], "updated_at": today.isoformat()}

    # All holdings across all profiles
    all_holdings = db.query(PortfolioHolding).all()
    all_tickers = list({h.ticker.upper() for h in all_holdings})

    # Current prices from latest scan result (no live fetch)
    current_prices: dict[str, float] = {}
    for ticker in all_tickers:
        row = (
            db.query(ScanResult)
            .filter(ScanResult.ticker == ticker)
            .order_by(ScanResult.scanned_at.desc())
            .first()
        )
        if row and row.current_price:
            current_prices[ticker] = float(row.current_price)

    def hist_prices(target: date) -> dict[str, float]:
        prices: dict[str, float] = {}
        for ticker in all_tickers:
            row = (
                db.query(PriceHistory)
                .filter(PriceHistory.ticker == ticker, PriceHistory.date <= target)
                .order_by(PriceHistory.date.desc())
                .first()
            )
            if row and row.close:
                prices[ticker] = float(row.close)
        return prices

    weekly_prices  = hist_prices(week_ago)
    monthly_prices = hist_prices(month_ago)
    start_prices   = hist_prices(START_DATE)

    # Group holdings by profile
    by_profile: dict[str, list] = {p.id: [] for p in profiles}
    for h in all_holdings:
        if h.profile_id and h.profile_id in by_profile:
            by_profile[h.profile_id].append(h)

    entries = []
    for profile in profiles:
        holdings = by_profile[profile.id]

        total_cost  = sum(h.shares * h.buy_price for h in holdings)
        total_value = sum(
            h.shares * current_prices.get(h.ticker.upper(), h.buy_price)
            for h in holdings
        )

        # Fair baseline: use May 1st price for holdings owned before the start date;
        # use actual buy price for holdings added on/after the start date.
        def start_baseline_price(h) -> float:
            buy_date = h.buy_date if h.buy_date else START_DATE
            if buy_date < START_DATE:
                return start_prices.get(h.ticker.upper(), h.buy_price)
            return h.buy_price

        leaderboard_cost = sum(h.shares * start_baseline_price(h) for h in holdings)

        def port_val_at(prices: dict[str, float]) -> float:
            return sum(
                h.shares * prices.get(
                    h.ticker.upper(),
                    current_prices.get(h.ticker.upper(), h.buy_price),
                )
                for h in holdings
            )

        val_week_ago  = port_val_at(weekly_prices)
        val_month_ago = port_val_at(monthly_prices)

        # Overall return measured from May 1st baseline
        return_pct        = round((total_value - leaderboard_cost) / leaderboard_cost * 100, 2) if leaderboard_cost > 0 else 0.0
        weekly_return_pct = round((total_value - val_week_ago) / val_week_ago * 100, 2) if val_week_ago > 0 else 0.0
        monthly_return_pct = round((total_value - val_month_ago) / val_month_ago * 100, 2) if val_month_ago > 0 else 0.0
        weekly_gain       = round(total_value - val_week_ago, 2)

        entries.append({
            "profile_id":          profile.id,
            "name":                profile.name,
            "avatar_colour":       profile.avatar_colour,
            "total_cost":          round(total_cost, 2),
            "total_value":         round(total_value, 2),
            "leaderboard_cost":    round(leaderboard_cost, 2),
            "return_pct":          return_pct,
            "weekly_return_pct":   weekly_return_pct,
            "monthly_return_pct":  monthly_return_pct,
            "weekly_gain":         weekly_gain,
            "n_holdings":          len(holdings),
            "is_me":               profile.id == my_profile_id,
            "badges":              [],
        })

    # Rank by overall return descending
    entries.sort(key=lambda e: e["return_pct"], reverse=True)
    for i, e in enumerate(entries):
        e["rank"] = i + 1

    # Badges — awarded even if all zeros so there's always a leader
    if entries:
        entries[0]["badges"].append("crown")

        best_weekly  = max(entries, key=lambda e: e["weekly_return_pct"])
        best_monthly = max(entries, key=lambda e: e["monthly_return_pct"])
        best_mover   = max(entries, key=lambda e: e["weekly_gain"])

        if best_weekly["weekly_return_pct"] >= 0:
            best_weekly["badges"].append("weekly")
        if best_monthly["monthly_return_pct"] >= 0:
            best_monthly["badges"].append("monthly")
        # Rocket badge only if a different person leads by absolute $ weekly gain
        if best_mover["profile_id"] != best_weekly["profile_id"] and best_mover["weekly_gain"] > 0:
            best_mover["badges"].append("rocket")

    return {"entries": entries, "updated_at": today.isoformat()}


@app.get("/api/leaderboard/profile/{profile_id}/holdings")
def get_leaderboard_profile_holdings(
    profile_id: str,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    """Return the holdings breakdown for any profile (auth required — must be logged in)."""
    caller_id = _get_profile_id_from_token(authorization)
    if not caller_id:
        raise HTTPException(status_code=401, detail="Unauthorized — select a profile first")

    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.profile_id == profile_id)
        .order_by(PortfolioHolding.added_at.asc())
        .all()
    )

    items = []
    total_cost = 0.0
    total_value = 0.0

    for h in holdings:
        ticker = h.ticker.upper()
        current_price = None
        name = None

        row = (
            db.query(ScanResult)
            .filter(ScanResult.ticker == ticker)
            .order_by(ScanResult.scanned_at.desc())
            .first()
        )
        if row:
            current_price = float(row.current_price) if row.current_price else None
            name = row.name

        cost_basis = h.shares * h.buy_price
        current_val = (h.shares * current_price) if current_price else None
        pnl = (current_val - cost_basis) if current_val is not None else None
        pnl_pct = ((pnl / cost_basis) * 100) if (pnl is not None and cost_basis) else None

        total_cost += cost_basis
        if current_val is not None:
            total_value += current_val

        items.append({
            "ticker": ticker,
            "name": name,
            "shares": round(h.shares, 4),
            "avg_price": round(h.buy_price, 2),
            "cost_basis": round(cost_basis, 2),
            "current_price": round(current_price, 2) if current_price else None,
            "current_value": round(current_val, 2) if current_val is not None else None,
            "pnl": round(pnl, 2) if pnl is not None else None,
            "pnl_pct": round(pnl_pct, 2) if pnl_pct is not None else None,
        })

    # Sort by current value descending (largest position first)
    items.sort(key=lambda x: x["current_value"] or 0, reverse=True)

    total_pnl = total_value - total_cost if total_value else None
    total_pnl_pct = ((total_pnl / total_cost) * 100) if (total_pnl is not None and total_cost) else None

    return {
        "profile_id": profile_id,
        "holdings": items,
        "total_cost": round(total_cost, 2),
        "total_value": round(total_value, 2),
        "total_pnl": round(total_pnl, 2) if total_pnl is not None else None,
        "total_pnl_pct": round(total_pnl_pct, 2) if total_pnl_pct is not None else None,
    }


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
        "price_target_1m": row.price_target_1m,
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
        price_target_1m=result.get("price_target_1m"),
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
    Return the top-scored stocks using the most recent scan result per ticker.
    Falls back to an on-demand scan of 30 tickers if the DB is empty.
    """
    def _query_top(limit=100):
        # One row per ticker — always the most recently scanned result
        latest_subq = (
            db.query(ScanResult.ticker, func.max(ScanResult.scanned_at).label("latest"))
            .group_by(ScanResult.ticker)
            .subquery()
        )
        return (
            db.query(ScanResult)
            .join(latest_subq,
                  (ScanResult.ticker == latest_subq.c.ticker) &
                  (ScanResult.scanned_at == latest_subq.c.latest))
            .order_by(ScanResult.score.desc())
            .limit(limit)
            .all()
        )

    rows = _query_top()

    if not rows:
        # DB is empty — seed with a quick 30-ticker scan
        results = scan_tickers(SP500_TICKERS[:30])
        for r in results:
            _store_scan_result(r, db)
        rows = _query_top()

    # Report age of the most recent batch scan (max scanned_at across all rows)
    latest_ts = max((r.scanned_at for r in rows), default=None)
    minutes_ago = None
    if latest_ts:
        minutes_ago = int((datetime.utcnow() - latest_ts).total_seconds() / 60)

    return {
        "results": [_row_to_dict(r, include_thesis=True, db=db) for r in rows],
        "total_scanned": db.query(ScanResult.ticker).distinct().count(),
        "last_scanned_minutes_ago": minutes_ago,
        "scanned_at": latest_ts.isoformat() if latest_ts else None,
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
def search(q: str = Query(default="", min_length=1), db: Session = Depends(get_db)):
    """
    Ticker + company name autocomplete.
    Searches scan_results DB (ticker prefix OR name substring); falls back to
    the static SP500 list when the DB has no matches.
    Returns up to 10 results ordered: ticker-prefix matches first, then by ticker.
    """
    from sqlalchemy import case as sql_case

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
                "current_price": r.current_price,
            }
            for r in rows
        ]
    else:
        # Fall back to static list (no name data)
        matches = [
            t for t in SP500_TICKERS
            if t.startswith(q_upper) or q_upper in t
        ][:10]
        results = [{"ticker": t, "name": None, "current_price": None} for t in matches]

    return {"query": q, "results": results}


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
        rui = yf.Ticker("^RUI")   # Russell 1000 Index
        vix = yf.Ticker("^VIX")
        tnx = yf.Ticker("^TNX")  # 10-year yield (x10 = %)

        def _last_price(ticker_obj) -> Optional[float]:
            try:
                price = float(ticker_obj.fast_info.last_price)
                if price > 0:
                    return round(price, 2)
            except Exception:
                pass
            # fast_info returned 0 or failed — fall back to recent history
            try:
                hist = ticker_obj.history(period="5d", interval="1d")
                if not hist.empty:
                    return round(float(hist["Close"].iloc[-1]), 2)
            except Exception:
                pass
            return None

        spx_price = _last_price(spx)
        rut_price = _last_price(rui)
        vix_price = _last_price(vix)
        tnx_price = _last_price(tnx)

        return {
            "spx": spx_price,
            "rut": rut_price,
            "vix": vix_price,
            "ten_year_yield": round(tnx_price / 10, 3) if tnx_price else None,
            "cached_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "spx": None,
            "rut": None,
            "vix": None,
            "ten_year_yield": None,
            "cached_at": datetime.utcnow().isoformat(),
            "error": str(e),
        }


# ---------------------------------------------------------------------------
# Scan state (in-memory, per-instance)
# ---------------------------------------------------------------------------

def _background_scan(job_id: int, triggered_by: str) -> None:
    """Background scan — persists state to DB so all Cloud Run instances agree."""
    db = SessionLocal()
    try:
        results = scan_tickers(SP500_TICKERS)
        for r in results:
            _store_scan_result(r, db)
        job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
        if job:
            job.completed_at = datetime.utcnow()
            job.tickers_done = len(results)
            db.commit()
        print(f"[scan] Job {job_id} complete — {len(results)} tickers scanned.")
    except Exception as e:
        db2 = SessionLocal()
        try:
            job = db2.query(ScanJob).filter(ScanJob.id == job_id).first()
            if job:
                job.completed_at = datetime.utcnow()
                job.error = str(e)[:500]
                db2.commit()
        finally:
            db2.close()
        print(f"[scan] Job {job_id} failed: {e}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# GET /api/scan/status
# ---------------------------------------------------------------------------

@app.get("/api/scan/status")
def get_scan_status(db: Session = Depends(get_db)):
    """
    Lightweight poll endpoint — reads from DB so every Cloud Run instance
    returns consistent state regardless of which instance started the scan.
    """
    latest_job = db.query(ScanJob).order_by(ScanJob.started_at.desc()).first()
    in_progress = latest_job is not None and latest_job.completed_at is None

    latest_result = db.query(ScanResult).order_by(ScanResult.scanned_at.desc()).first()
    last_scanned_at = None
    if latest_job and latest_job.completed_at:
        last_scanned_at = latest_job.completed_at.isoformat()
    elif latest_result:
        last_scanned_at = latest_result.scanned_at.isoformat()

    return {
        "in_progress": in_progress,
        "last_scanned_at": last_scanned_at,
        "total_scanned": db.query(func.count(ScanResult.ticker.distinct())).scalar(),
    }


# ---------------------------------------------------------------------------
# POST /api/scan/request  (user-initiated, auth via Bearer token)
# ---------------------------------------------------------------------------

@app.post("/api/scan/request")
def request_scan(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    """
    Any authenticated profile can trigger a background scan.
    Returns immediately — poll GET /api/scan/status for completion.
    Scan state persisted to DB so any Cloud Run instance can report status.
    """
    profile_id = _get_profile_id_from_token(authorization)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Unauthorized — select a profile first")

    # Check if a scan is already running (DB-backed, instance-agnostic)
    latest_job = db.query(ScanJob).order_by(ScanJob.started_at.desc()).first()
    if latest_job and latest_job.completed_at is None:
        # Guard: if started >15 min ago with no completion, assume it died
        age_minutes = (datetime.utcnow() - latest_job.started_at).total_seconds() / 60
        if age_minutes < 15:
            return {"status": "already_running", "message": "A scan is already in progress"}
        # Mark stale job as failed so we can start a fresh one
        latest_job.completed_at = datetime.utcnow()
        latest_job.error = "timed out"
        db.commit()

    job = ScanJob(triggered_by=profile_id)
    db.add(job)
    db.commit()
    db.refresh(job)

    t = threading.Thread(target=_background_scan, args=(job.id, profile_id), daemon=True)
    t.start()
    return {"status": "started", "message": f"Scanning {len(SP500_TICKERS)} stocks in background", "job_id": job.id}


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
    Synchronous full scan — for Cloud Scheduler / manual ops.
    Protected by X-Scan-Secret header. Blocks until complete (2-4 min).
    Writes a ScanJob row so /api/scan/status reflects the result.
    """
    if x_scan_secret != SCAN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid scan secret")

    job = ScanJob(triggered_by="scheduler")
    db.add(job)
    db.commit()
    db.refresh(job)

    target = tickers if tickers else SP500_TICKERS
    results = scan_tickers(target)

    for r in results:
        _store_scan_result(r, db)

    job.completed_at = datetime.utcnow()
    job.tickers_done = len(results)
    db.commit()

    top5 = results[:5]
    return {
        "scanned": len(results),
        "scanned_at": job.completed_at.isoformat(),
        "top_5": top5,
    }


# ---------------------------------------------------------------------------
# Industry multiples
# ---------------------------------------------------------------------------

@app.get("/api/stock/{ticker}/industry-multiples")
def get_industry_multiples(ticker: str, db: Session = Depends(get_db)):
    """
    Compare the stock's valuation multiples (fwd P/E, P/S, EV/EBITDA, P/B) against
    the sector median from the latest scan results.  No live yfinance calls.
    """
    import statistics

    ticker = ticker.upper().strip()

    # Latest scan for this ticker
    ticker_row = (
        db.query(ScanResult)
        .filter(ScanResult.ticker == ticker)
        .order_by(ScanResult.scanned_at.desc())
        .first()
    )
    if not ticker_row or not ticker_row.sector:
        raise HTTPException(status_code=404, detail="No sector data for ticker")

    sector = ticker_row.sector
    stock_metrics = _parse_json_field(ticker_row.metrics_json)

    # Latest scan per peer ticker in the same sector (subquery)
    from sqlalchemy import func as sqlfunc
    subq = (
        db.query(
            ScanResult.ticker,
            sqlfunc.max(ScanResult.scanned_at).label("max_at"),
        )
        .filter(ScanResult.sector == sector)
        .group_by(ScanResult.ticker)
        .subquery()
    )
    peers = (
        db.query(ScanResult)
        .join(
            subq,
            (ScanResult.ticker == subq.c.ticker)
            & (ScanResult.scanned_at == subq.c.max_at),
        )
        .all()
    )

    MULTIPLES = [
        ("fwd_pe",        "P/E (Fwd)"),
        ("price_to_sales","P/S"),
        ("ev_ebitda",     "EV/EBITDA"),
        ("price_to_book", "P/B"),
    ]

    def _safe_median(values: list) -> float | None:
        clean = [v for v in values if v is not None and 0 < v < 1000]
        return round(statistics.median(clean), 2) if len(clean) >= 1 else None

    result_multiples = []
    for key, label in MULTIPLES:
        peer_values = [
            _parse_json_field(p.metrics_json).get(key)
            for p in peers
        ]
        median = _safe_median(peer_values)
        stock_val = stock_metrics.get(key)
        if stock_val is not None:
            try:
                stock_val = round(float(stock_val), 2)
            except (TypeError, ValueError):
                stock_val = None

        cheaper = None
        if stock_val is not None and median is not None:
            cheaper = stock_val < median

        result_multiples.append({
            "label":   label,
            "key":     key,
            "stock":   stock_val,
            "median":  median,
            "cheaper": cheaper,
        })

    return {
        "ticker":     ticker,
        "sector":     sector,
        "peer_count": len(peers),
        "multiples":  result_multiples,
    }


# ---------------------------------------------------------------------------
# Score history
# ---------------------------------------------------------------------------

@app.get("/api/stock/{ticker}/score-history")
def score_history(ticker: str, db: Session = Depends(get_db)):
    ticker = ticker.upper().strip()
    rows = (
        db.query(ScanResult)
        .filter(ScanResult.ticker == ticker)
        .order_by(ScanResult.scanned_at.asc())
        .limit(90)
        .all()
    )
    return {
        "ticker": ticker,
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
# Earnings calendar
# ---------------------------------------------------------------------------

@app.get("/api/earnings-calendar")
def earnings_calendar(db: Session = Depends(get_db)):
    # Return all non-null earnings dates from the latest scan per ticker,
    # sorted ascending. No date-window filter: yfinance only stores the next
    # upcoming date at scan time, so whatever is in the DB is relevant.
    latest_subq = (
        db.query(ScanResult.ticker, func.max(ScanResult.scanned_at).label("latest"))
        .group_by(ScanResult.ticker)
        .subquery()
    )
    rows = (
        db.query(ScanResult)
        .join(latest_subq, (ScanResult.ticker == latest_subq.c.ticker) & (ScanResult.scanned_at == latest_subq.c.latest))
        .filter(ScanResult.earnings_date.isnot(None))
        .order_by(ScanResult.earnings_date.asc())
        .all()
    )
    return {
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
        ]
    }


# ---------------------------------------------------------------------------
# Stock news
# ---------------------------------------------------------------------------

@app.get("/api/stock/{ticker}/news")
def stock_news(ticker: str):
    ticker = ticker.upper().strip()
    try:
        import yfinance as yf
        raw = yf.Ticker(ticker).news or []
        items = []
        for n in raw[:8]:
            # Handle both old and new yfinance news formats
            content = n.get("content", {})
            if content:
                title = content.get("title", "")
                url = (content.get("canonicalUrl") or {}).get("url", "")
                publisher = (content.get("provider") or {}).get("displayName", "")
                published_at = content.get("pubDate", "")
            else:
                title = n.get("title", "")
                url = n.get("link", "")
                publisher = n.get("publisher", "")
                published_at = str(n.get("providerPublishTime", ""))
            if title:
                items.append({"title": title, "url": url, "publisher": publisher, "published_at": published_at})
        return {"ticker": ticker, "news": items}
    except Exception as e:
        return {"ticker": ticker, "news": [], "error": str(e)}


# ---------------------------------------------------------------------------
# Weekly snapshot
# ---------------------------------------------------------------------------

@app.get("/api/weekly-snapshot")
def weekly_snapshot(db: Session = Depends(get_db)):
    # Latest score per ticker
    latest_subq = (
        db.query(ScanResult.ticker, func.max(ScanResult.scanned_at).label("latest"))
        .group_by(ScanResult.ticker)
        .subquery()
    )
    latest_rows = (
        db.query(ScanResult)
        .join(latest_subq, (ScanResult.ticker == latest_subq.c.ticker) & (ScanResult.scanned_at == latest_subq.c.latest))
        .all()
    )

    # Score from 7 days ago per ticker
    week_ago = datetime.utcnow() - timedelta(days=7)
    old_subq = (
        db.query(ScanResult.ticker, func.max(ScanResult.scanned_at).label("latest"))
        .filter(ScanResult.scanned_at <= week_ago)
        .group_by(ScanResult.ticker)
        .subquery()
    )
    old_rows = (
        db.query(ScanResult)
        .join(old_subq, (ScanResult.ticker == old_subq.c.ticker) & (ScanResult.scanned_at == old_subq.c.latest))
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
        })

    with_delta = [m for m in movers if m["score_delta"] is not None]
    gainers = sorted(with_delta, key=lambda x: x["score_delta"], reverse=True)[:5]
    losers = sorted(with_delta, key=lambda x: x["score_delta"])[:5]
    top_stocks = sorted(movers, key=lambda x: x["score"], reverse=True)[:10]

    # Sector avg scores
    sector_map: dict = {}
    for r in latest_rows:
        s = r.sector or "Other"
        if s not in sector_map:
            sector_map[s] = {"total": 0, "count": 0}
        sector_map[s]["total"] += r.score
        sector_map[s]["count"] += 1
    sectors = sorted(
        [{"sector": k, "avg_score": round(v["total"] / v["count"], 1), "count": v["count"]} for k, v in sector_map.items()],
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
# Portfolio endpoints
# ---------------------------------------------------------------------------

import re as _re

def _slugify(name: str) -> str:
    return _re.sub(r"[^a-z0-9_-]", "", name.lower().replace(" ", "-"))[:40]


# ---------------------------------------------------------------------------
# Watchlist endpoints (profile-scoped, Bearer-token-gated)
# ---------------------------------------------------------------------------

@app.get("/api/watchlist")
def get_watchlist(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    profile_id = _get_profile_id_from_token(authorization)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Unauthorized — select a profile first")
    rows = db.query(WatchlistItem).filter(WatchlistItem.profile_id == profile_id).all()
    return {"tickers": [r.ticker for r in rows]}


@app.post("/api/watchlist/{ticker}", status_code=201)
def add_to_watchlist(ticker: str, authorization: str = Header(default=""), db: Session = Depends(get_db)):
    profile_id = _get_profile_id_from_token(authorization)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Unauthorized — select a profile first")
    ticker = ticker.upper().strip()
    existing = db.query(WatchlistItem).filter(
        WatchlistItem.profile_id == profile_id,
        WatchlistItem.ticker == ticker,
    ).first()
    if not existing:
        db.add(WatchlistItem(profile_id=profile_id, ticker=ticker))
        db.commit()
    return {"ticker": ticker}


@app.delete("/api/watchlist/{ticker}", status_code=204)
def remove_from_watchlist(ticker: str, authorization: str = Header(default=""), db: Session = Depends(get_db)):
    profile_id = _get_profile_id_from_token(authorization)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Unauthorized — select a profile first")
    ticker = ticker.upper().strip()
    db.query(WatchlistItem).filter(
        WatchlistItem.profile_id == profile_id,
        WatchlistItem.ticker == ticker,
    ).delete()
    db.commit()


# ---------------------------------------------------------------------------
# Portfolio endpoints
# ---------------------------------------------------------------------------

class HoldingIn(BaseModel):
    ticker: str
    amount: float      # dollar value invested (shares = amount / buy_price)
    buy_price: float   # price per share at time of purchase
    buy_date: Optional[str] = None  # ISO date string


@app.get("/api/portfolio/history")
def get_portfolio_history(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    """Return daily portfolio value from first trade date using price_history × shares.

    Each holding is only included from the date it was purchased, so the chart
    reflects actual portfolio value — not a hypothetical backfill.
    """
    profile_id = _get_profile_id_from_token(authorization)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Unauthorized — select a profile first")

    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.profile_id == profile_id)
        .all()
    )
    if not holdings:
        return {"history": []}

    # Per-holding entry date: buy_date if set, else the date it was added
    def entry_date(h: PortfolioHolding) -> date:
        if h.buy_date:
            return h.buy_date
        return h.added_at.date() if h.added_at else date.today()

    tickers = [h.ticker for h in holdings]
    shares_map = {h.ticker: h.shares for h in holdings}
    entry_map = {h.ticker: entry_date(h) for h in holdings}

    cutoff = min(entry_map.values())

    rows = (
        db.query(PriceHistory.date, PriceHistory.ticker, PriceHistory.close)
        .filter(PriceHistory.ticker.in_(tickers), PriceHistory.date >= cutoff)
        .order_by(PriceHistory.date.asc())
        .all()
    )

    # Group closes by date
    date_closes: dict[date, dict[str, float]] = {}
    for row in rows:
        if row.date not in date_closes:
            date_closes[row.date] = {}
        if row.close is not None:
            date_closes[row.date][row.ticker] = row.close

    history = []
    for d in sorted(date_closes.keys()):
        closes = date_closes[d]
        # Only include holdings that existed on this date
        val = sum(
            shares_map[t] * closes[t]
            for t in tickers
            if t in closes and entry_map[t] <= d
        )
        if val > 0:
            history.append({"date": d.isoformat(), "value": round(val, 2)})

    return {"history": history}


@app.get("/api/portfolio/{username}")
def get_portfolio(username: str, authorization: str = Header(default=""), db: Session = Depends(get_db)):
    profile_id = _get_profile_id_from_token(authorization)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Unauthorized — select a profile first")

    username = _slugify(username)
    if not username:
        raise HTTPException(status_code=400, detail="Invalid username")

    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.profile_id == profile_id)
        .order_by(PortfolioHolding.added_at.asc())
        .all()
    )

    items = []
    total_cost = 0.0
    total_value = 0.0

    for h in holdings:
        ticker = h.ticker.upper()
        current_price = None
        score = None
        name = None
        sector = None

        # Try to get current price + score from latest scan
        row = (
            db.query(ScanResult)
            .filter(ScanResult.ticker == ticker)
            .order_by(ScanResult.scanned_at.desc())
            .first()
        )
        if row:
            current_price = row.current_price
            score = row.score
            name = row.name
            sector = row.sector

        # Fall back to live fetch if not in DB
        if current_price is None:
            try:
                import yfinance as yf
                info = yf.Ticker(ticker).fast_info
                current_price = round(float(info.last_price), 2)
            except Exception:
                current_price = None

        cost_basis = h.shares * h.buy_price
        current_val = (h.shares * current_price) if current_price else None
        pnl = (current_val - cost_basis) if current_val is not None else None
        pnl_pct = ((pnl / cost_basis) * 100) if (pnl is not None and cost_basis) else None

        total_cost += cost_basis
        if current_val is not None:
            total_value += current_val

        score_delta = (score - h.score_at_buy) if (score is not None and h.score_at_buy is not None) else None

        items.append({
            "ticker": ticker,
            "name": name,
            "shares": h.shares,
            "buy_price": h.buy_price,
            "buy_date": h.buy_date.isoformat() if h.buy_date else None,
            "current_price": current_price,
            "cost_basis": round(cost_basis, 2),
            "current_value": round(current_val, 2) if current_val is not None else None,
            "pnl": round(pnl, 2) if pnl is not None else None,
            "pnl_pct": round(pnl_pct, 2) if pnl_pct is not None else None,
            "score": score,
            "score_at_buy": h.score_at_buy,
            "score_delta": score_delta,
            "sector": sector,
        })

    total_pnl = total_value - total_cost if total_value else None
    total_pnl_pct = ((total_pnl / total_cost) * 100) if (total_pnl is not None and total_cost) else None

    return {
        "username": username,
        "holdings": items,
        "summary": {
            "total_cost": round(total_cost, 2),
            "total_value": round(total_value, 2),
            "total_pnl": round(total_pnl, 2) if total_pnl is not None else None,
            "total_pnl_pct": round(total_pnl_pct, 2) if total_pnl_pct is not None else None,
            "positions": len(items),
        },
    }


@app.post("/api/portfolio/{username}")
def upsert_holding(username: str, holding: HoldingIn, authorization: str = Header(default=""), db: Session = Depends(get_db)):
    profile_id = _get_profile_id_from_token(authorization)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Unauthorized — select a profile first")

    username = _slugify(username)
    if not username:
        raise HTTPException(status_code=400, detail="Invalid username")

    ticker = holding.ticker.upper().strip()
    buy_date = date.fromisoformat(holding.buy_date) if holding.buy_date else None

    if holding.buy_price <= 0:
        raise HTTPException(status_code=400, detail="buy_price must be > 0")

    additional_shares = holding.amount / holding.buy_price

    score_row = (
        db.query(ScanResult)
        .filter(ScanResult.ticker == ticker)
        .order_by(ScanResult.scanned_at.desc())
        .first()
    )
    score_now = score_row.score if score_row else None

    existing = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.profile_id == profile_id, PortfolioHolding.ticker == ticker)
        .first()
    )
    if existing:
        # Accumulate: weighted average cost basis, never overwrite
        total_shares = existing.shares + additional_shares
        avg_price = (existing.shares * existing.buy_price + additional_shares * holding.buy_price) / total_shares
        existing.shares = round(total_shares, 8)
        existing.buy_price = round(avg_price, 4)
        if buy_date:
            existing.buy_date = buy_date
        if existing.score_at_buy is None and score_now is not None:
            existing.score_at_buy = score_now
    else:
        db.add(PortfolioHolding(
            username=username,
            profile_id=profile_id,
            ticker=ticker,
            shares=round(additional_shares, 8),
            buy_price=holding.buy_price,
            buy_date=buy_date,
            score_at_buy=score_now,
        ))
    db.commit()
    return {"status": "ok", "ticker": ticker}


@app.delete("/api/portfolio/{username}/{ticker}")
def delete_holding(username: str, ticker: str, authorization: str = Header(default=""), db: Session = Depends(get_db)):
    profile_id = _get_profile_id_from_token(authorization)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Unauthorized — select a profile first")

    username = _slugify(username)
    ticker = ticker.upper().strip()
    row = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.profile_id == profile_id, PortfolioHolding.ticker == ticker)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Holding not found")
    db.delete(row)
    db.commit()
    return {"status": "deleted", "ticker": ticker}


# ---------------------------------------------------------------------------
# Backtest endpoints
# ---------------------------------------------------------------------------

@app.post("/api/backtest/run")
def run_backtest(n_stocks: int = 100, hold_months: int = 1, universe: str = "sp500", db: Session = Depends(get_db)):
    """
    Run a backtest synchronously and return the result.
    Blocks until complete (2-4 minutes for 100 stocks).
    """
    if hold_months not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="hold_months must be 1, 2, or 3")

    from backtest_engine import run_backtest as _run
    result = _run(n_stocks=n_stocks, hold_months=hold_months, universe=universe)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    s = result["summary"]
    row = BacktestRun(
        n_stocks=s["n_stocks"],
        months_traded=s["months_traded"],
        starting_capital=s["starting_capital"],
        final_value=s["final_value"],
        total_return_pct=s["total_return_pct"],
        spy_final_value=s["spy_final_value"],
        spy_total_return_pct=s["spy_total_return_pct"],
        outperformance_pct=s["outperformance_pct"],
        winning_months=s["winning_months"],
        beat_spy_months=s["beat_spy_months"],
        monthly_json=json.dumps(result["monthly"]),
        yearly_json=json.dumps({"hold_months": hold_months, "data": result["yearly"]}),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    result["run_id"] = row.id
    result["run_at"] = row.run_at.isoformat()
    return result


def _parse_backtest_row(row) -> dict:
    """Decode a BacktestRun row into the standard API response shape."""
    yearly_raw = json.loads(row.yearly_json)
    if isinstance(yearly_raw, dict):
        hold_months = yearly_raw.get("hold_months", 1)
        yearly      = yearly_raw["data"]
    else:
        hold_months = 1
        yearly      = yearly_raw
    n = row.months_traded or 1
    winning = row.winning_months or 0
    beat_spy = row.beat_spy_months or 0
    return {
        "run_id":  row.id,
        "run_at":  row.run_at.isoformat(),
        "monthly": json.loads(row.monthly_json),
        "yearly":  yearly,
        "summary": {
            "n_stocks":              row.n_stocks,
            "months_traded":         row.months_traded,
            "starting_capital":      row.starting_capital,
            "final_value":           row.final_value,
            "total_return_pct":      row.total_return_pct,
            "spy_final_value":       row.spy_final_value,
            "spy_total_return_pct":  row.spy_total_return_pct,
            "outperformance_pct":    row.outperformance_pct,
            "winning_months":        winning,
            "winning_months_pct":    round(winning / n * 100, 1),
            "beat_spy_months":       beat_spy,
            "beat_spy_months_pct":   round(beat_spy / n * 100, 1),
            "hold_months":           hold_months,
        },
    }


@app.get("/api/backtest/latest")
def latest_backtest(hold_months: int = 1, universe: str = "sp500", db: Session = Depends(get_db)):
    """Return the most recently stored backtest for the given hold period."""
    rows = db.query(BacktestRun).order_by(BacktestRun.run_at.desc()).limit(20).all()
    for row in rows:
        parsed = _parse_backtest_row(row)
        if parsed["summary"]["hold_months"] == hold_months:
            return parsed
    raise HTTPException(
        status_code=404,
        detail=f"No {hold_months}-month hold backtest run yet. POST /api/backtest/run?hold_months={hold_months} first.",
    )


# ---------------------------------------------------------------------------
# Monte Carlo — stock return distribution
# ---------------------------------------------------------------------------

@app.get("/api/stock/{ticker}/monte-carlo")
def stock_monte_carlo(
    ticker: str,
    horizon: int = Query(default=30, ge=5, le=252),
    n_sims: int = Query(default=1000, ge=100, le=5000),
    db: Session = Depends(get_db),
):
    """
    Monte Carlo return distribution for a single stock.
    Uses stored 1-year price history to estimate daily drift + volatility,
    then runs n_sims geometric Brownian motion paths over horizon trading days.
    """
    import numpy as np

    ticker = ticker.upper().strip()

    start = date.today() - timedelta(days=400)
    rows = (
        db.query(PriceHistory)
        .filter(PriceHistory.ticker == ticker, PriceHistory.date >= start)
        .order_by(PriceHistory.date.asc())
        .all()
    )

    if not rows:
        _store_price_history(ticker, db)
        rows = (
            db.query(PriceHistory)
            .filter(PriceHistory.ticker == ticker, PriceHistory.date >= start)
            .order_by(PriceHistory.date.asc())
            .all()
        )

    if len(rows) < 30:
        raise HTTPException(status_code=404, detail=f"Insufficient price history for {ticker}")

    closes = np.array([r.close for r in rows], dtype=float)
    log_returns = np.diff(np.log(closes))
    mu = float(log_returns.mean())
    sigma = float(log_returns.std())
    current_price = float(closes[-1])

    rng = np.random.default_rng()
    daily_log_rets = rng.normal(mu, sigma, (n_sims, horizon))
    final_log_rets = daily_log_rets.sum(axis=1)
    final_prices = current_price * np.exp(final_log_rets)
    returns_pct = (final_prices - current_price) / current_price * 100.0

    percentiles = [5, 25, 50, 75, 95]
    pct_values = np.percentile(returns_pct, percentiles)
    hist_counts, hist_edges = np.histogram(returns_pct, bins=40)

    return {
        "ticker": ticker,
        "current_price": round(current_price, 2),
        "horizon_days": horizon,
        "n_simulations": n_sims,
        "daily_vol_pct": round(sigma * 100, 3),
        "percentiles": {str(p): round(float(v), 2) for p, v in zip(percentiles, pct_values)},
        "prob_positive": round(float((returns_pct > 0).mean() * 100), 1),
        "prob_gain_10": round(float((returns_pct > 10).mean() * 100), 1),
        "prob_loss_10": round(float((returns_pct < -10).mean() * 100), 1),
        "histogram": {
            "counts": hist_counts.tolist(),
            "edges": [round(float(e), 2) for e in hist_edges.tolist()],
        },
    }


# ---------------------------------------------------------------------------
# Monte Carlo — backtest robustness (bootstrap)
# ---------------------------------------------------------------------------

@app.post("/api/backtest/robustness")
def backtest_robustness(
    hold_months: int = Query(default=1),
    n_runs: int = Query(default=500, ge=100, le=2000),
    db: Session = Depends(get_db),
):
    """
    Bootstrap the most recent stored backtest to assess result robustness.
    Resamples the N monthly returns with replacement n_runs times and
    reports the distribution of compounded total returns. If the actual
    result sits near the median of the bootstrap distribution the strategy
    is robust; if it sits in the top tail the result may be path-dependent.
    """
    import numpy as np

    rows = db.query(BacktestRun).order_by(BacktestRun.run_at.desc()).limit(20).all()
    target = None
    for row in rows:
        parsed = _parse_backtest_row(row)
        if parsed["summary"]["hold_months"] == hold_months:
            target = parsed
            break

    if not target:
        raise HTTPException(
            status_code=404,
            detail=f"No {hold_months}-month backtest stored. Run the backtest first.",
        )

    monthly = target["monthly"]
    if not monthly:
        raise HTTPException(status_code=400, detail="Stored backtest has no monthly data.")

    port_rets = np.array([m["port_return_pct"] / 100.0 for m in monthly])
    spy_rets  = np.array([(m.get("spy_return_pct") or 0) / 100.0 for m in monthly])
    n_months  = len(port_rets)

    rng = np.random.default_rng()
    sim_rets: list[float] = []
    beat_count = 0

    for _ in range(n_runs):
        idx       = rng.integers(0, n_months, size=n_months)
        total_ret = (np.prod(1 + port_rets[idx]) - 1) * 100.0
        spy_total = (np.prod(1 + spy_rets[idx]) - 1) * 100.0
        sim_rets.append(float(total_ret))
        if total_ret > spy_total:
            beat_count += 1

    sim_arr   = np.array(sim_rets)
    pct_vals  = np.percentile(sim_arr, [5, 25, 50, 75, 95])
    h_counts, h_edges = np.histogram(sim_arr, bins=30)

    original_ret = target["summary"]["total_return_pct"]
    # Percentile rank of the actual result in the bootstrap distribution
    actual_rank = float((sim_arr <= original_ret).mean() * 100)

    return {
        "original_return_pct":   original_ret,
        "spy_total_return_pct":  target["summary"]["spy_total_return_pct"],
        "n_runs":                n_runs,
        "n_months":              n_months,
        "actual_rank_pct":       round(actual_rank, 1),
        "beat_spy_pct":          round(beat_count / n_runs * 100, 1),
        "prob_positive":         round(float((sim_arr > 0).mean() * 100), 1),
        "percentiles": {
            str(p): round(float(v), 2)
            for p, v in zip([5, 25, 50, 75, 95], pct_vals)
        },
        "histogram": {
            "counts": h_counts.tolist(),
            "edges":  [round(float(e), 2) for e in h_edges.tolist()],
        },
    }


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@app.get("/api/analytics/sector-heatmap")
def sector_heatmap(n_months: int = 6):
    """Sector rotation heatmap — avg score per sector per month."""
    return get_sector_heatmap(n_months=n_months)


@app.get("/api/analytics/rebalance-suggestions")
def rebalance_suggestions(universe: str = "sp500"):
    """Current top-3 vs last month — what to buy/sell/hold."""
    return get_rebalance_suggestions(universe=universe)


# ---------------------------------------------------------------------------
# Paper Trading
# ---------------------------------------------------------------------------

@app.get("/api/paper-trading")
def paper_trading_portfolio(universe: str = "sp500"):
    """Get the paper trading portfolio state."""
    return get_paper_portfolio(universe=universe)


@app.post("/api/paper-trading/rebalance")
def paper_trading_rebalance(universe: str = "sp500"):
    """Trigger a manual paper trading rebalance."""
    return run_monthly_rebalance(universe=universe)


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    question: str
    ticker: Optional[str] = None


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest, db: Session = Depends(get_db)):
    """Answer a natural language question about EdgeScan data."""
    scan_ctx = None
    top_picks_ctx = None

    if req.ticker:
        row = (
            db.query(ScanResult)
            .filter(ScanResult.ticker == req.ticker.upper())
            .order_by(ScanResult.scanned_at.desc())
            .first()
        )
        if row:
            scan_ctx = _row_to_dict(row)

    # Always provide top 10 context
    latest_ts = db.query(func.max(ScanResult.scanned_at)).scalar()
    if latest_ts:
        from datetime import timedelta
        cutoff = latest_ts - timedelta(minutes=10)
        top_rows = (
            db.query(ScanResult)
            .filter(ScanResult.scanned_at >= cutoff)
            .order_by(ScanResult.score.desc())
            .limit(10)
            .all()
        )
        top_picks_ctx = [{"ticker": r.ticker, "score": r.score, "sector": r.sector} for r in top_rows]

    answer = answer_question(
        question=req.question,
        ticker=req.ticker,
        scan_context=scan_ctx,
        top_picks_context=top_picks_ctx,
    )
    return {"answer": answer}


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "edgescan-api"}
