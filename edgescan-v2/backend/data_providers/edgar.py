"""
data_providers/edgar.py — SEC EDGAR XBRL API provider for EdgeScan v2.

Uses only the official SEC JSON endpoints (no scraping):
  - https://www.sec.gov/files/company_tickers.json  (CIK lookup)
  - https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json  (financials)
  - https://data.sec.gov/submissions/CIK{cik:010d}.json  (company info)

Rate limit: 10 req/sec — enforced via a 0.1s sleep between calls.
User-Agent header required by SEC: "EdgeScan contact@edgescan.app"

is_production_safe = True.
"""

from __future__ import annotations

import time
import logging
from datetime import date
from typing import Optional

import httpx
import pandas as pd

from .base import DataProvider, Fundamentals, OHLCV

logger = logging.getLogger(__name__)

_UA = "EdgeScan contact@edgescan.app"
_SEC_BASE = "https://data.sec.gov"
_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"

# SIC code → sector mapping (approximate)
_SIC_TO_SECTOR: dict[str, str] = {
    "01": "Materials", "02": "Materials", "07": "Consumer Staples",
    "08": "Materials", "09": "Materials", "10": "Materials",
    "12": "Energy", "13": "Energy", "14": "Materials",
    "15": "Industrials", "16": "Industrials", "17": "Industrials",
    "20": "Consumer Staples", "21": "Consumer Staples", "22": "Consumer Discretionary",
    "23": "Consumer Discretionary", "24": "Materials", "25": "Consumer Discretionary",
    "26": "Materials", "27": "Communication Services", "28": "Healthcare",
    "29": "Energy", "30": "Materials", "31": "Consumer Discretionary",
    "32": "Materials", "33": "Materials", "34": "Industrials",
    "35": "Technology", "36": "Technology", "37": "Consumer Discretionary",
    "38": "Healthcare", "39": "Consumer Discretionary",
    "40": "Industrials", "41": "Industrials", "42": "Industrials",
    "44": "Industrials", "45": "Industrials", "46": "Industrials",
    "47": "Industrials", "48": "Communication Services", "49": "Utilities",
    "50": "Industrials", "51": "Industrials", "52": "Consumer Discretionary",
    "53": "Consumer Discretionary", "54": "Consumer Staples", "55": "Consumer Discretionary",
    "56": "Consumer Discretionary", "57": "Consumer Discretionary", "58": "Consumer Discretionary",
    "59": "Consumer Staples", "60": "Financials", "61": "Financials",
    "62": "Financials", "63": "Financials", "64": "Financials",
    "65": "Real Estate", "67": "Financials", "70": "Consumer Discretionary",
    "72": "Consumer Discretionary", "73": "Technology", "75": "Consumer Discretionary",
    "76": "Industrials", "78": "Communication Services", "79": "Communication Services",
    "80": "Healthcare", "81": "Financials", "82": "Consumer Discretionary",
    "83": "Consumer Staples", "84": "Consumer Discretionary", "86": "Consumer Discretionary",
    "87": "Industrials", "89": "Industrials",
}

SECTOR_PE_MEDIANS: dict[str, float] = {
    "Technology": 28.0, "Healthcare": 20.0, "Financials": 14.0,
    "Consumer Discretionary": 22.0, "Consumer Staples": 19.0,
    "Industrials": 20.0, "Energy": 12.0, "Materials": 16.0,
    "Real Estate": 35.0, "Utilities": 17.0, "Communication Services": 18.0,
    "Unknown": 20.0,
}


class EdgarProvider(DataProvider):
    """
    SEC EDGAR-backed data provider.

    Fetches XBRL company facts for fundamentals.
    Does NOT provide: current price, analyst targets, forward P/E, recommendation.
    Those fields are left None when used standalone — use EdgarAlphaVantageProvider
    for a complete picture.
    """

    def __init__(self) -> None:
        self._client = httpx.Client(
            headers={"User-Agent": _UA, "Accept-Encoding": "gzip, deflate"},
            timeout=30.0,
            follow_redirects=True,
        )
        # CIK map: ticker (upper) → zero-padded 10-digit CIK string
        self._cik_map: dict[str, str] = {}
        self._cik_loaded = False

    # ------------------------------------------------------------------
    # DataProvider interface
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "edgar"

    @property
    def is_production_safe(self) -> bool:
        return True

    def get_fundamentals(self, ticker: str) -> Optional[Fundamentals]:
        try:
            cik = self._get_cik(ticker)
            if not cik:
                logger.warning("[edgar] No CIK found for %s", ticker)
                return None

            facts = self._fetch_company_facts(cik)
            sub = self._fetch_submission(cik)
            if facts is None:
                return None

            name = sub.get("name", ticker) if sub else ticker
            sic = str(sub.get("sic", "")) if sub else ""
            sector = _SIC_TO_SECTOR.get(sic[:2], "Unknown") if sic else "Unknown"
            industry = sub.get("sicDescription", "Unknown") if sub else "Unknown"
            sector_pe = SECTOR_PE_MEDIANS.get(sector, SECTOR_PE_MEDIANS["Unknown"])

            # Revenue
            rev_curr, rev_prior = self._extract_annual_pair(facts, "Revenues")
            if rev_curr is None:
                rev_curr, rev_prior = self._extract_annual_pair(
                    facts, "RevenueFromContractWithCustomerExcludingAssessedTax"
                )
            if rev_curr is None:
                rev_curr, rev_prior = self._extract_annual_pair(facts, "SalesRevenueNet")

            # Net income
            ni_curr, ni_prior = self._extract_annual_pair(facts, "NetIncomeLoss")

            # Gross profit
            gp = self._extract_annual(facts, "GrossProfit")

            # Cash flows
            ocf = self._extract_annual(facts, "NetCashProvidedByUsedInOperatingActivities")
            capex_raw = self._extract_annual(facts, "PaymentsToAcquirePropertyPlantAndEquipment")
            capex = abs(capex_raw) if capex_raw is not None else 0.0

            # Balance sheet
            eq_curr, _ = self._extract_annual_pair(facts, "StockholdersEquity")

            debt = self._extract_annual(facts, "LongTermDebtAndCapitalLeaseObligation")
            if debt is None:
                debt = self._extract_annual(facts, "LongTermDebt")
            if debt is None:
                debt = self._extract_annual(facts, "LongTermDebtNoncurrent")

            # EPS
            eps_curr = self._extract_annual(facts, "EarningsPerShareDiluted", unit="USD/shares")
            eps_prior = None
            if eps_curr is not None:
                pair = self._extract_annual_pair(facts, "EarningsPerShareDiluted", unit="USD/shares")
                eps_curr, eps_prior = pair

            # --- Derived metrics ---
            rev_growth = 0.0
            if rev_curr is not None and rev_prior and rev_prior != 0:
                rev_growth = (rev_curr - rev_prior) / abs(rev_prior) * 100

            eps_growth = 0.0
            if eps_curr is not None and eps_prior and eps_prior != 0:
                eps_growth = (eps_curr - eps_prior) / abs(eps_prior) * 100
            elif ni_curr is not None and ni_prior and ni_prior != 0:
                eps_growth = (ni_curr - ni_prior) / abs(ni_prior) * 100

            gross_margin = 0.0
            if gp is not None and rev_curr and rev_curr != 0:
                gross_margin = gp / rev_curr * 100

            # FCF yield requires market_cap — will be filled by AV layer
            fcf_yield = 0.0
            if ocf is not None:
                fcf = ocf - capex
                # Store raw FCF on the object for AV layer to divide by market_cap
                self._last_fcf = fcf
            else:
                self._last_fcf = None

            roe = 0.0
            if ni_curr is not None and eq_curr and eq_curr != 0:
                roe = ni_curr / abs(eq_curr) * 100

            d_e = 2.0
            if debt is not None and eq_curr and eq_curr != 0:
                d_e = debt / abs(eq_curr)

            return Fundamentals(
                ticker=ticker,
                name=name,
                sector=sector,
                industry=industry,
                rev_growth=rev_growth,
                eps_growth=eps_growth,
                gross_margin=gross_margin,
                fcf_yield=fcf_yield,
                roe=roe,
                debt_to_equity=d_e,
                fwd_pe=None,
                trailing_pe=None,
                price_to_sales=None,
                price_to_book=None,
                ev_ebitda=None,
                sector_pe=sector_pe,
                current_price=None,
                market_cap=None,
                analyst_target=None,
                week52_high=None,
                week52_low=None,
                recommendation="none",
                earnings_date=None,
                source="edgar",
                as_of=date.today(),
            )

        except Exception as e:
            logger.error("[edgar] Error fetching fundamentals for %s: %s", ticker, e)
            return None

    def get_ohlcv(self, ticker: str, period_days: int = 365) -> Optional[OHLCV]:
        """EDGAR does not provide price data. Returns None always."""
        return None

    def get_universe(self) -> list[str]:
        return self.get_sp500_tickers()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_cik(self, ticker: str) -> Optional[str]:
        """Return zero-padded 10-digit CIK for ticker, loading the map if needed."""
        if not self._cik_loaded:
            self._load_cik_map()
        return self._cik_map.get(ticker.upper())

    def _load_cik_map(self) -> None:
        """Load the SEC company_tickers.json into memory (called once)."""
        try:
            resp = self._client.get(_TICKERS_URL)
            resp.raise_for_status()
            data = resp.json()
            for entry in data.values():
                t = str(entry.get("ticker", "")).upper()
                cik_int = int(entry.get("cik_str", 0))
                if t and cik_int:
                    self._cik_map[t] = f"{cik_int:010d}"
            logger.info("[edgar] Loaded %d CIK entries", len(self._cik_map))
        except Exception as e:
            logger.error("[edgar] Failed to load CIK map: %s", e)
        finally:
            self._cik_loaded = True

    def _fetch_company_facts(self, cik: str) -> Optional[dict]:
        """Fetch XBRL company facts JSON from EDGAR."""
        url = f"{_SEC_BASE}/api/xbrl/companyfacts/CIK{cik}.json"
        try:
            time.sleep(0.1)  # EDGAR rate limit: 10 req/sec
            resp = self._client.get(url)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error("[edgar] Error fetching company facts for CIK %s: %s", cik, e)
            return None

    def _fetch_submission(self, cik: str) -> Optional[dict]:
        """Fetch submission metadata (name, SIC, etc.) from EDGAR."""
        url = f"{_SEC_BASE}/submissions/CIK{cik}.json"
        try:
            time.sleep(0.1)
            resp = self._client.get(url)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error("[edgar] Error fetching submission for CIK %s: %s", cik, e)
            return None

    @staticmethod
    def _extract_annual(facts: dict, concept: str, unit: str = "USD") -> Optional[float]:
        """Get most recent annual (10-K) value for a concept."""
        try:
            entries = facts["facts"]["us-gaap"][concept]["units"][unit]
            annual = [
                e for e in entries
                if e.get("form") == "10-K" and e.get("fp") == "FY"
            ]
            if not annual:
                return None
            annual.sort(key=lambda x: x.get("filed", ""), reverse=True)
            return float(annual[0]["val"])
        except (KeyError, TypeError, ValueError):
            return None

    @staticmethod
    def _extract_annual_pair(
        facts: dict, concept: str, unit: str = "USD"
    ) -> tuple[Optional[float], Optional[float]]:
        """Get two most recent annual values for YoY growth calculation."""
        try:
            entries = facts["facts"]["us-gaap"][concept]["units"][unit]
            annual = [
                e for e in entries
                if e.get("form") == "10-K" and e.get("fp") == "FY"
            ]
            annual.sort(key=lambda x: x.get("filed", ""), reverse=True)
            v0 = float(annual[0]["val"]) if len(annual) > 0 else None
            v1 = float(annual[1]["val"]) if len(annual) > 1 else None
            return v0, v1
        except (KeyError, TypeError, ValueError, IndexError):
            return None, None
