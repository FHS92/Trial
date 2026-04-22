"""
edgar_client.py — SEC EDGAR XBRL API client for point-in-time fundamentals.

Fetches company filing data with exact SEC submission timestamps so the
backtest can look up "what was known as of date X" without look-ahead bias.

Data flow:
  1. Load CIK map once from SEC (ticker → CIK integer)
  2. Fetch companyfacts JSON per ticker (rate-limited, ~6 req/s)
  3. Extract 10-K annual snapshots (all metrics) + 10-Q balance-sheet-only
     snapshots, each tagged with the exact SEC filing date
  4. Caller stores snapshots in Neon; subsequent runs skip the EDGAR fetch
"""

import time
import requests
from typing import Optional

_USER_AGENT = "EdgeScan research@edgescan.app"

# ---------------------------------------------------------------------------
# CIK map (lazy-loaded once)
# ---------------------------------------------------------------------------
_CIK_MAP: dict[str, int] = {}
_CIK_MAP_LOADED = False


def _load_cik_map() -> None:
    global _CIK_MAP, _CIK_MAP_LOADED
    if _CIK_MAP_LOADED:
        return
    try:
        r = requests.get(
            "https://www.sec.gov/files/company_tickers.json",
            headers={"User-Agent": _USER_AGENT},
            timeout=20,
        )
        r.raise_for_status()
        for entry in r.json().values():
            _CIK_MAP[entry["ticker"].upper()] = int(entry["cik_str"])
        _CIK_MAP_LOADED = True
        print(f"[edgar] CIK map loaded: {len(_CIK_MAP)} tickers")
    except Exception as exc:
        print(f"[edgar] CIK map load failed: {exc}")


def get_cik(ticker: str) -> Optional[int]:
    _load_cik_map()
    return _CIK_MAP.get(ticker.upper())


# ---------------------------------------------------------------------------
# companyfacts fetch
# ---------------------------------------------------------------------------

def fetch_company_facts(cik: int) -> Optional[dict]:
    """Download the full XBRL companyfacts JSON for a CIK. Rate-limited."""
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json"
    try:
        time.sleep(0.17)          # ~6 req/s — well within EDGAR's limits
        r = requests.get(url, headers={"User-Agent": _USER_AGENT}, timeout=30)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        print(f"[edgar] companyfacts CIK {cik}: {exc}")
        return None


# ---------------------------------------------------------------------------
# XBRL concept name lists (try in order; use first with data)
# ---------------------------------------------------------------------------
_REVENUE = [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueNet",
    "RevenuesNetOfInterestExpense",
]
_GROSS_PROFIT = ["GrossProfit"]
_NET_INCOME = [
    "NetIncomeLoss",
    "ProfitLoss",
    "NetIncomeLossAvailableToCommonStockholdersBasic",
]
_OCF = ["NetCashProvidedByUsedInOperatingActivities"]
_CAPEX = [
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsForCapitalImprovements",
]
_EQUITY = [
    "StockholdersEquity",
    "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
]
_LT_DEBT = ["LongTermDebtNoncurrent", "LongTermDebt"]
_ST_DEBT = ["DebtCurrent", "ShortTermBorrowings"]
_SHARES  = [
    "CommonStockSharesOutstanding",
    "WeightedAverageNumberOfSharesOutstandingBasic",
]


def _usd_entries(facts: dict, concepts: list[str]) -> list[dict]:
    """Return USD unit entries for the first matching XBRL concept."""
    gaap = facts.get("facts", {}).get("us-gaap", {})
    for c in concepts:
        entries = gaap.get(c, {}).get("units", {}).get("USD", [])
        if entries:
            return entries
    return []


def _share_entries(facts: dict) -> list[dict]:
    """Return share-count entries (unit = 'shares')."""
    gaap = facts.get("facts", {}).get("us-gaap", {})
    for c in _SHARES:
        for unit in ("shares", "USD"):
            entries = gaap.get(c, {}).get("units", {}).get(unit, [])
            if entries:
                return entries
    return []


def _latest_val(entries: list[dict], period_end: str, form_prefix: str) -> Optional[float]:
    """
    Return the most recently filed value for (period_end, form_prefix).
    Handles amendments (10-K/A, 10-Q/A) by preferring latest filed date.
    """
    candidates = [
        e for e in entries
        if e.get("end") == period_end and e.get("form", "").startswith(form_prefix)
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda x: x.get("filed", ""), reverse=True)
    v = candidates[0].get("val")
    return float(v) if v is not None else None


# ---------------------------------------------------------------------------
# Snapshot builder
# ---------------------------------------------------------------------------

def build_snapshots(ticker: str, facts: dict, sector: str = "Unknown") -> list[dict]:
    """
    Extract per-filing fundamental snapshots from a companyfacts dict.

    Returns a list of dicts (one per unique period_end) suitable for
    direct insertion into the FundamentalSnapshot table.

    - 10-K entries  → all metrics populated (income stmt + cash flow + balance sheet)
    - 10-Q entries  → balance sheet only (equity, debt, shares); flow fields = None
      (10-Q flow figures can be YTD cumulative, not the single quarter, so we
       skip them to avoid double-counting when we sum annual growth later)
    """
    rev_e   = _usd_entries(facts, _REVENUE)
    gp_e    = _usd_entries(facts, _GROSS_PROFIT)
    ni_e    = _usd_entries(facts, _NET_INCOME)
    ocf_e   = _usd_entries(facts, _OCF)
    capex_e = _usd_entries(facts, _CAPEX)
    eq_e    = _usd_entries(facts, _EQUITY)
    ltd_e   = _usd_entries(facts, _LT_DEBT)
    std_e   = _usd_entries(facts, _ST_DEBT)
    shr_e   = _share_entries(facts)

    # --- Collect unique period-end dates from 10-K filings (income stmt anchor) ---
    annual: dict[str, str] = {}       # period_end → latest filed_at
    for e in ni_e:
        form = e.get("form", "")
        end  = e.get("end", "")
        filed = e.get("filed", "")
        if form.startswith("10-K") and end and filed:
            if end not in annual or filed > annual[end]:
                annual[end] = filed

    # --- Collect unique period-end dates from 10-Q balance sheet filings ---
    quarterly_bs: dict[str, str] = {}  # period_end → latest filed_at
    for e in eq_e:
        form  = e.get("form", "")
        end   = e.get("end", "")
        filed = e.get("filed", "")
        if form.startswith("10-Q") and end and filed:
            if end not in quarterly_bs or filed > quarterly_bs[end]:
                quarterly_bs[end] = filed

    snapshots: list[dict] = []

    # --- Annual 10-K snapshots (all metrics) ---
    for period_end, filed_at in annual.items():
        capex_raw = _latest_val(capex_e, period_end, "10-K")
        ltd = _latest_val(ltd_e, period_end, "10-K") or 0.0
        std = _latest_val(std_e, period_end, "10-K") or 0.0

        snapshots.append({
            "ticker":              ticker,
            "period_end":          period_end,
            "filed_at":            filed_at,
            "form_type":           "10-K",
            "sector":              sector,
            "revenue":             _latest_val(rev_e,   period_end, "10-K"),
            "gross_profit":        _latest_val(gp_e,    period_end, "10-K"),
            "net_income":          _latest_val(ni_e,    period_end, "10-K"),
            "operating_cash_flow": _latest_val(ocf_e,   period_end, "10-K"),
            # CapEx in EDGAR is usually a positive outflow amount; store absolute
            "capital_expenditure": abs(capex_raw) if capex_raw is not None else None,
            "stockholders_equity": _latest_val(eq_e,    period_end, "10-K"),
            "total_debt":          (ltd + std) if (ltd or std) else None,
            "shares_outstanding":  _latest_val(shr_e,   period_end, "10-K"),
        })

    # --- Quarterly 10-Q snapshots (balance sheet only; skip periods already in 10-K) ---
    for period_end, filed_at in quarterly_bs.items():
        if period_end in annual:
            continue                          # already covered by 10-K entry
        ltd = _latest_val(ltd_e, period_end, "10-Q") or 0.0
        std = _latest_val(std_e, period_end, "10-Q") or 0.0

        snapshots.append({
            "ticker":              ticker,
            "period_end":          period_end,
            "filed_at":            filed_at,
            "form_type":           "10-Q",
            "sector":              sector,
            "revenue":             None,
            "gross_profit":        None,
            "net_income":          None,
            "operating_cash_flow": None,
            "capital_expenditure": None,
            "stockholders_equity": _latest_val(eq_e,  period_end, "10-Q"),
            "total_debt":          (ltd + std) if (ltd or std) else None,
            "shares_outstanding":  _latest_val(shr_e, period_end, "10-Q"),
        })

    return snapshots
