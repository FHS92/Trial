"""
test_api.py — Tests all FastAPI routes using TestClient + in-memory SQLite.
No live server or network required.

Usage:
    cd edgescan/backend
    python test_api.py
"""

import json
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

# Force in-memory SQLite for tests
os.environ["DATABASE_URL"] = "sqlite://"

from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Patch database module before importing main
from sqlalchemy.pool import StaticPool
import database as db_module

# StaticPool shares one connection across all threads — required for
# in-memory SQLite so that data seeded in one thread is visible in another.
_test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

@event.listens_for(_test_engine, "connect")
def _wal(dbapi_conn, _):
    dbapi_conn.execute("PRAGMA journal_mode=WAL")

_TestSession = sessionmaker(bind=_test_engine, autocommit=False, autoflush=False)

# Monkey-patch before main imports database
db_module.engine = _test_engine
db_module.SessionLocal = _TestSession

def override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()

import main as app_module
from models import Base, ScanResult, PriceHistory, ThesisCache
from main import app
from database import get_db

# Create tables
Base.metadata.create_all(bind=_test_engine)

# Override DB dependency
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app, raise_server_exceptions=True)

# ─── ANSI colours ──────────────────────────────────────────────────────────
RESET = "\033[0m"; BOLD = "\033[1m"
GREEN = "\033[92m"; RED = "\033[91m"; CYAN = "\033[96m"; GRAY = "\033[90m"


# ─── Seed helpers ──────────────────────────────────────────────────────────

MOCK_TICKERS = ["AAPL", "MSFT", "NVDA", "JPM", "JNJ", "XOM", "AMZN", "UNH", "HD", "V"]

def _seed_scan_results(session):
    now = datetime.utcnow()
    for i, ticker in enumerate(MOCK_TICKERS):
        score = 85 - i * 4
        session.add(ScanResult(
            ticker=ticker,
            name=f"{ticker} Corp",
            sector="Technology" if i < 3 else "Financials" if i < 5 else "Healthcare",
            score=score,
            fundamental_score=min(60, score - 20),
            technical_score=min(40, score - (score - 20)),
            current_price=150.0 + i * 10,
            price_target_2m=170.0 + i * 10,
            upside_pct=round(((170.0 + i * 10) / (150.0 + i * 10) - 1) * 100, 1),
            signals_json=json.dumps({
                "rsi": 52.0, "macd_status": "above_signal",
                "pct_above_200ma": 5.0, "from_52w_high": -18.0,
                "volume_status": "bullish", "ma50": 148.0, "ma200": 142.0,
            }),
            metrics_json=json.dumps({
                "rev_growth": 15.0, "eps_growth": 18.0, "fcf_yield": 5.0,
                "roe": 22.0, "gross_margin": 60.0, "debt_to_equity": 0.3,
                "fwd_pe": 24.0, "sector_pe": 28.0, "analyst_target": 175.0,
                "recent_catalyst": "None",
            }),
            score_breakdown_json=json.dumps({"rev_growth_pts": 7, "rsi_pts": 4}),
            scanned_at=now,
        ))
    session.commit()


def _seed_price_history(session, ticker: str = "AAPL"):
    base = date.today() - timedelta(days=90)
    price = 150.0
    for i in range(90):
        d = base + timedelta(days=i)
        price += (i % 5 - 2) * 0.5  # small oscillation
        session.add(PriceHistory(
            ticker=ticker,
            date=d,
            open=round(price - 0.5, 2),
            high=round(price + 1.0, 2),
            low=round(price - 1.0, 2),
            close=round(price, 2),
            volume=3_000_000.0,
        ))
    session.commit()


def _seed_thesis(session, ticker: str = "AAPL"):
    session.add(ThesisCache(
        ticker=ticker,
        thesis_text="AAPL is delivering 15% revenue growth while trading at a 14% discount to the sector P/E median. "
                    "A recent MACD crossover with RSI at 52 provides a technical entry into a stock with a 5% FCF yield.",
        score_at_generation=85,
    ))
    session.commit()


# ─── Test runner ───────────────────────────────────────────────────────────

results: list[tuple[str, bool, str]] = []


def check(label: str, cond: bool, detail: str = ""):
    results.append((label, cond, detail))
    status = f"{GREEN}PASS{RESET}" if cond else f"{RED}FAIL{RESET}"
    suffix = f"  {GRAY}{detail}{RESET}" if detail else ""
    print(f"  [{status}] {label}{suffix}")


def run_tests():
    db = _TestSession()
    _seed_scan_results(db)
    _seed_price_history(db)
    _seed_thesis(db, "AAPL")
    db.close()

    print(f"\n{CYAN}{BOLD}EdgeScan API Route Tests{RESET}\n")

    # ── Health check ─────────────────────────────────────────────────────
    print(f"{BOLD}Health{RESET}")
    r = client.get("/health")
    check("GET /health → 200", r.status_code == 200)
    check("health.status == 'ok'", r.json().get("status") == "ok")

    # ── Top opportunities ─────────────────────────────────────────────────
    print(f"\n{BOLD}GET /api/top-opportunities{RESET}")
    r = client.get("/api/top-opportunities")
    check("→ 200", r.status_code == 200, f"got {r.status_code}")
    body = r.json()
    check("returns 'results' list", "results" in body)
    check("results has ≤ 10 items", len(body.get("results", [])) <= 10)
    check("first result has 'score'", body["results"] and "score" in body["results"][0])
    check("first result has 'signals'", body["results"] and "signals" in body["results"][0])
    check("results sorted descending by score",
          all(body["results"][i]["score"] >= body["results"][i + 1]["score"]
              for i in range(len(body["results"]) - 1)))
    check("has 'total_scanned'", "total_scanned" in body)
    check("has 'last_scanned_minutes_ago'", "last_scanned_minutes_ago" in body)

    # ── Stock detail ──────────────────────────────────────────────────────
    print(f"\n{BOLD}GET /api/stock/{{ticker}}{RESET}")
    r = client.get("/api/stock/AAPL")
    check("→ 200", r.status_code == 200, f"got {r.status_code}")
    body = r.json()
    check("ticker == 'AAPL'", body.get("ticker") == "AAPL")
    check("has 'score'", "score" in body)
    check("has 'fundamental_score'", "fundamental_score" in body)
    check("has 'technical_score'", "technical_score" in body)
    check("has 'signals'", "signals" in body and isinstance(body["signals"], dict))
    check("has 'metrics'", "metrics" in body and isinstance(body["metrics"], dict))
    check("has 'thesis'", "thesis" in body and isinstance(body.get("thesis"), str))
    check("thesis is non-empty", len(body.get("thesis", "")) > 20)
    check("score in 0-100", 0 <= body.get("score", -1) <= 100)

    # uppercase normalisation
    r2 = client.get("/api/stock/aapl")
    check("lowercase ticker → 200", r2.status_code == 200)

    # ── Price history ─────────────────────────────────────────────────────
    print(f"\n{BOLD}GET /api/stock/{{ticker}}/history{RESET}")
    r = client.get("/api/stock/AAPL/history?period=3m")
    check("→ 200", r.status_code == 200, f"got {r.status_code}")
    body = r.json()
    check("has 'data' list", "data" in body and isinstance(body["data"], list))
    check("data rows have OHLCV keys", body["data"] and all(
        k in body["data"][0] for k in ("date", "open", "high", "low", "close", "volume")
    ))
    check("data is sorted ascending by date",
          len(body["data"]) < 2 or body["data"][0]["date"] <= body["data"][-1]["date"])
    check("period echoed back", body.get("period") == "3m")

    # ── Search ────────────────────────────────────────────────────────────
    print(f"\n{BOLD}GET /api/search{RESET}")
    r = client.get("/api/search?q=AA")
    check("→ 200", r.status_code == 200, f"got {r.status_code}")
    body = r.json()
    check("returns 'results' list", "results" in body)
    check("AAPL in results for 'AA'", "AAPL" in body.get("results", []))
    check("≤ 10 results", len(body.get("results", [])) <= 10)

    r2 = client.get("/api/search?q=MSFT")
    check("exact match 'MSFT' found", "MSFT" in r2.json().get("results", []))

    r3 = client.get("/api/search?q=nvd")
    check("lowercase 'nvd' finds NVDA", "NVDA" in r3.json().get("results", []))

    # ── Market pulse ──────────────────────────────────────────────────────
    print(f"\n{BOLD}GET /api/market-pulse{RESET}")
    r = client.get("/api/market-pulse")
    check("→ 200", r.status_code == 200, f"got {r.status_code}")
    body = r.json()
    check("has 'spx' key", "spx" in body)
    check("has 'vix' key", "vix" in body)
    check("has 'ten_year_yield' key", "ten_year_yield" in body)
    check("has 'cached_at' key", "cached_at" in body)
    # Second call should return cached data (no error)
    r2 = client.get("/api/market-pulse")
    check("second call → 200 (cache hit)", r2.status_code == 200)

    # ── Scan trigger — auth ───────────────────────────────────────────────
    print(f"\n{BOLD}POST /api/scan/trigger (auth){RESET}")
    r = client.post("/api/scan/trigger", json=["AAPL", "MSFT"],
                    headers={"X-Scan-Secret": "wrong-secret"})
    check("bad secret → 403", r.status_code == 403)

    r = client.post("/api/scan/trigger", json=["AAPL"],
                    headers={"X-Scan-Secret": "edgescan-local-secret"})
    # Will likely fail to fetch live data in this env, but should not 500
    check("correct secret → not 403", r.status_code != 403)

    # ── Summary ───────────────────────────────────────────────────────────
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n{'─'*60}")
    color = GREEN if passed == total else RED
    print(f"{BOLD}Results: {color}{passed}/{total} passed{RESET}")
    if passed < total:
        print(f"\n{RED}Failed checks:{RESET}")
        for label, ok, detail in results:
            if not ok:
                print(f"  ✗ {label}" + (f" — {detail}" if detail else ""))
    print()


if __name__ == "__main__":
    run_tests()
