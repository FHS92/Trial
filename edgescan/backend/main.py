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

from fastapi import Depends, FastAPI, HTTPException, Header, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import get_db, init_db
from data_fetcher import SP500_TICKERS, fetch_fundamentals, fetch_price_history
from models import BacktestRun, PriceHistory, PortfolioHolding, ScanResult, ThesisCache
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
    today = date.today()
    cutoff = today + timedelta(days=45)

    latest_subq = (
        db.query(ScanResult.ticker, func.max(ScanResult.scanned_at).label("latest"))
        .group_by(ScanResult.ticker)
        .subquery()
    )
    rows = (
        db.query(ScanResult)
        .join(latest_subq, (ScanResult.ticker == latest_subq.c.ticker) & (ScanResult.scanned_at == latest_subq.c.latest))
        .filter(
            ScanResult.earnings_date.isnot(None),
            ScanResult.earnings_date >= today,
            ScanResult.earnings_date <= cutoff,
        )
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


class HoldingIn(BaseModel):
    ticker: str
    shares: float
    buy_price: float
    buy_date: Optional[str] = None  # ISO date string


@app.get("/api/portfolio/{username}")
def get_portfolio(username: str, db: Session = Depends(get_db)):
    username = _slugify(username)
    if not username:
        raise HTTPException(status_code=400, detail="Invalid username")

    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.username == username)
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
def upsert_holding(username: str, holding: HoldingIn, db: Session = Depends(get_db)):
    username = _slugify(username)
    if not username:
        raise HTTPException(status_code=400, detail="Invalid username")

    ticker = holding.ticker.upper().strip()
    buy_date = date.fromisoformat(holding.buy_date) if holding.buy_date else None

    score_row = (
        db.query(ScanResult)
        .filter(ScanResult.ticker == ticker)
        .order_by(ScanResult.scanned_at.desc())
        .first()
    )
    score_now = score_row.score if score_row else None

    existing = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.username == username, PortfolioHolding.ticker == ticker)
        .first()
    )
    if existing:
        existing.shares = holding.shares
        existing.buy_price = holding.buy_price
        existing.buy_date = buy_date
        if existing.score_at_buy is None and score_now is not None:
            existing.score_at_buy = score_now
    else:
        db.add(PortfolioHolding(
            username=username,
            ticker=ticker,
            shares=holding.shares,
            buy_price=holding.buy_price,
            buy_date=buy_date,
            score_at_buy=score_now,
        ))
    db.commit()
    return {"status": "ok", "ticker": ticker}


@app.delete("/api/portfolio/{username}/{ticker}")
def delete_holding(username: str, ticker: str, db: Session = Depends(get_db)):
    username = _slugify(username)
    ticker = ticker.upper().strip()
    row = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.username == username, PortfolioHolding.ticker == ticker)
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
def run_backtest(n_stocks: int = 100, hold_months: int = 1, db: Session = Depends(get_db)):
    """
    Run the technical backtest (Jan 2020 → today).
    hold_months: 1 | 2 | 3 — rebalancing period; carry logic active in all cases.
    Takes 2-4 minutes. Stores results in DB so /latest is instant next time.
    """
    if hold_months not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="hold_months must be 1, 2, or 3")
    import traceback
    try:
        from backtest_engine import run_backtest as _run
        result = _run(n_stocks=n_stocks, hold_months=hold_months)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {traceback.format_exc()}")

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    s = result["summary"]
    # yearly_json stores {"hold_months": N, "data": [...]} so we can filter without a migration
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
            "winning_months":        row.winning_months,
            "winning_months_pct":    round(row.winning_months / n * 100, 1),
            "beat_spy_months":       row.beat_spy_months,
            "beat_spy_months_pct":   round(row.beat_spy_months / n * 100, 1),
            "hold_months":           hold_months,
        },
    }


@app.get("/api/backtest/latest")
def latest_backtest(hold_months: int = 1, db: Session = Depends(get_db)):
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
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "edgescan-api"}
