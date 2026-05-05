"""
EdgeScan QA test suite.
Run against any backend:  python qa_test.py [BASE_URL]
Default: http://localhost:8000
"""
import sys
import json
import time
import requests

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
WARN = "\033[93m~\033[0m"

results = []

def check(label, ok, detail=""):
    sym = PASS if ok else FAIL
    print(f"  {sym} {label}")
    if detail:
        print(f"      {detail}")
    results.append((label, ok))
    return ok

def req(method, path, **kwargs):
    try:
        r = getattr(requests, method)(f"{BASE}{path}", timeout=30, **kwargs)
        return r
    except Exception as e:
        return type("R", (), {"ok": False, "status_code": 0, "json": lambda: {}, "text": str(e)})()

def section(title):
    print(f"\n{'─'*50}")
    print(f"  {title}")
    print(f"{'─'*50}")

# ── Setup ────────────────────────────────────────────────────────────────────
section("Setup — create QA profile")
r = req("post", "/api/profiles", json={"name": "QA-Auto", "avatarColour": "#4f8ef7"})
check("Create profile", r.ok, r.text[:120] if not r.ok else "")
profile_id = r.json().get("id") if r.ok else None

r = req("post", f"/api/profiles/{profile_id}/unlock", json={"pin": None})
check("Unlock profile (no PIN)", r.ok)
token = r.json().get("token") if r.ok else None
auth = {"Authorization": f"Bearer {token}"}

# ── Core endpoints ────────────────────────────────────────────────────────────
section("Core endpoints (no auth)")
r = req("get", "/api/profiles")
check("GET /api/profiles", r.ok and isinstance(r.json(), list))

r = req("get", "/api/top-opportunities")
check("GET /api/top-opportunities", r.ok)

r = req("get", "/api/market-pulse")
check("GET /api/market-pulse", r.ok)

r = req("get", "/api/search?q=AAPL")
check("GET /api/search?q=AAPL", r.ok and "results" in r.json())

r = req("get", "/api/scan/movers")
check("GET /api/scan/movers", r.ok)

# ── Portfolio ─────────────────────────────────────────────────────────────────
section("Portfolio endpoints")

r = req("post", "/api/portfolio/qa-auto",
        json={"ticker": "AAPL", "amount": 5000, "buy_price": 150.0, "buy_date": "2024-01-01"},
        headers=auth)
check("POST add AAPL holding", r.ok, r.text[:120] if not r.ok else "")

r = req("post", "/api/portfolio/qa-auto",
        json={"ticker": "MSFT", "amount": 3000, "buy_price": 300.0, "buy_date": "2024-06-01"},
        headers=auth)
check("POST add MSFT holding", r.ok)

r = req("get", "/api/portfolio/qa-auto", headers=auth)
check("GET /api/portfolio/{username}", r.ok and "holdings" in r.json())

# ── CRITICAL: metrics route must not be caught by /{username} ─────────────────
section("Portfolio metrics — route isolation")
r = req("get", "/api/portfolio/metrics", headers=auth)
body = r.json() if r.ok else {}
has_metrics_key = "metrics" in body
has_holdings_key = "holdings" in body

check("GET /api/portfolio/metrics returns 200", r.ok, r.text[:120] if not r.ok else "")
check("Response has 'metrics' key (correct route)", has_metrics_key)
check("Response does NOT have 'holdings' key (wrong route)", not has_holdings_key,
      "ROUTE SHADOWED BY /{username} — move /metrics before /{username}" if has_holdings_key else "")

# ── Metrics content ───────────────────────────────────────────────────────────
section("Portfolio metrics — content")
if has_metrics_key:
    m = body.get("metrics")
    if m:
        check("win_rate_pct is a number",    isinstance(m.get("win_rate_pct"), (int, float)))
        check("total_return_pct is a number", isinstance(m.get("total_return_pct"), (int, float)))
        check("best_position present",        m.get("best_position") is not None)
        check("worst_position present",       m.get("worst_position") is not None)
        check("data_points key present",      "data_points" in m)
        # Advanced metrics are null without price history — that's fine
        adv = ["sharpe_ratio", "max_drawdown_pct", "annual_volatility_pct", "beta"]
        for key in adv:
            val = m.get(key)
            sym = WARN if val is None else PASS
            label = f"{key}: {val if val is not None else 'null (needs price history)'}"
            print(f"  {sym} {label}")
    else:
        err = body.get("error", "unknown")
        check("metrics object is non-null", False, f"error: {err}")

# ── Portfolio history ─────────────────────────────────────────────────────────
section("Portfolio history")
r = req("get", "/api/portfolio/history", headers=auth)
check("GET /api/portfolio/history", r.ok and "history" in r.json())

# ── Auth protection ───────────────────────────────────────────────────────────
section("Auth protection")
r = req("get", "/api/portfolio/metrics")  # no auth header
check("Metrics without auth → 401", r.status_code == 401)

r = req("get", "/api/portfolio/history")
check("History without auth → 401", r.status_code == 401)

# ── Watchlist ─────────────────────────────────────────────────────────────────
section("Watchlist")
r = req("post", "/api/watchlist/NVDA", headers=auth)
check("POST /api/watchlist/{ticker} add NVDA", r.ok)
r = req("get", "/api/watchlist", headers=auth)
check("GET /api/watchlist", r.ok and "tickers" in r.json())

# ── Weekly snapshot ───────────────────────────────────────────────────────────
section("Weekly snapshot")
r = req("get", "/api/weekly-snapshot", headers=auth)
check("GET /api/weekly-snapshot", r.ok)

# ── Cleanup ───────────────────────────────────────────────────────────────────
section("Cleanup")
r = req("delete", f"/api/portfolio/qa-auto/AAPL", headers=auth)
check("DELETE AAPL holding", r.ok)
r = req("delete", f"/api/portfolio/qa-auto/MSFT", headers=auth)
check("DELETE MSFT holding", r.ok)

# ── Summary ───────────────────────────────────────────────────────────────────
section("Summary")
passed = sum(1 for _, ok in results if ok)
failed = sum(1 for _, ok in results if not ok)
total = len(results)
print(f"\n  {passed}/{total} passed", end="")
if failed:
    print(f"  ({failed} FAILED)")
    print("\n  Failed checks:")
    for label, ok in results:
        if not ok:
            print(f"    {FAIL} {label}")
else:
    print("  — all green\n")
sys.exit(0 if failed == 0 else 1)
