"""
data_providers/alpha_vantage.py — Alpha Vantage API provider for EdgeScan v2.

Endpoints used:
  TIME_SERIES_DAILY_ADJUSTED  → OHLCV price history
  OVERVIEW                    → company metadata (sector, PE, analyst targets, etc.)

Base URL: https://www.alphavantage.co/query
Rate limits:
  Free tier  : 25 req/day
  Premium    : 75 req/min

is_production_safe = True.
"""

from __future__ import annotations

import logging
import time
from datetime import date, datetime
from typing import Optional

import httpx
import pandas as pd

from .base import DataProvider, Fundamentals, OHLCV

logger = logging.getLogger(__name__)

_AV_BASE = "https://www.alphavantage.co/query"

SECTOR_PE_MEDIANS: dict[str, float] = {
    "Technology": 28.0, "Healthcare": 20.0, "Financials": 14.0,
    "Consumer Discretionary": 22.0, "Consumer Staples": 19.0,
    "Industrials": 20.0, "Energy": 12.0, "Materials": 16.0,
    "Real Estate": 35.0, "Utilities": 17.0, "Communication Services": 18.0,
    "Unknown": 20.0,
}


def _safe_float(val, default=None) -> Optional[float]:
    """Safely convert a value to float, returning default on failure."""
    if val is None or val == "None" or val == "":
        return default
    try:
        f = float(val)
        import math
        return default if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return default


class AlphaVantageProvider(DataProvider):
    """
    Alpha Vantage-backed data provider.

    Provides both OHLCV history and fundamental metadata (OVERVIEW endpoint).
    Rate-limited — free tier allows only 25 requests/day.
    """

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ValueError("AlphaVantageProvider requires an api_key")
        self._api_key = api_key
        self._client = httpx.Client(timeout=30.0, follow_redirects=True)
        self._last_request_time: float = 0.0
        # Minimum interval between requests for free tier (>= 1 req / 1.5s = ~40/min safe)
        self._min_interval: float = 1.5

    # ------------------------------------------------------------------
    # DataProvider interface
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "alpha_vantage"

    @property
    def is_production_safe(self) -> bool:
        return True

    def get_fundamentals(self, ticker: str) -> Optional[Fundamentals]:
        """Use OVERVIEW endpoint to build a Fundamentals object."""
        try:
            overview = self._fetch_overview(ticker)
            if not overview or overview.get("Symbol") is None:
                return None

            sector = overview.get("Sector", "Unknown") or "Unknown"
            industry = overview.get("Industry", "Unknown") or "Unknown"
            sector_pe = SECTOR_PE_MEDIANS.get(sector, SECTOR_PE_MEDIANS["Unknown"])

            return Fundamentals(
                ticker=ticker,
                name=overview.get("Name", ticker),
                sector=sector,
                industry=industry,
                # Growth — AV OVERVIEW provides these
                rev_growth=_safe_float(overview.get("QuarterlyRevenueGrowthYOY"), 0.0) or 0.0,
                eps_growth=_safe_float(overview.get("QuarterlyEarningsGrowthYOY"), 0.0) or 0.0,
                # Profitability
                gross_margin=(_safe_float(overview.get("GrossProfitTTM"), 0.0) or 0.0),
                fcf_yield=0.0,  # Not available from OVERVIEW; requires calculation
                roe=(_safe_float(overview.get("ReturnOnEquityTTM"), 0.0) or 0.0) * 100
                    if _safe_float(overview.get("ReturnOnEquityTTM")) is not None else 0.0,
                # Balance sheet
                debt_to_equity=_safe_float(overview.get("DebtToEquityRatio"), 2.0) or 2.0,
                # Valuation
                fwd_pe=_safe_float(overview.get("ForwardPE")),
                trailing_pe=_safe_float(overview.get("TrailingPE")),
                price_to_sales=_safe_float(overview.get("PriceToSalesRatioTTM")),
                price_to_book=_safe_float(overview.get("PriceToBookRatio")),
                ev_ebitda=_safe_float(overview.get("EVToEBITDA")),
                sector_pe=sector_pe,
                # Price & analyst
                current_price=_safe_float(overview.get("50DayMovingAverage")),  # approx
                market_cap=_safe_float(overview.get("MarketCapitalization")),
                analyst_target=_safe_float(overview.get("AnalystTargetPrice")),
                week52_high=_safe_float(overview.get("52WeekHigh")),
                week52_low=_safe_float(overview.get("52WeekLow")),
                recommendation="none",  # AV OVERVIEW does not provide rec key
                earnings_date=None,  # Not in OVERVIEW
                source="alpha_vantage",
                as_of=date.today(),
            )
        except Exception as e:
            logger.error("[alpha_vantage] Error fetching fundamentals for %s: %s", ticker, e)
            return None

    def get_ohlcv(self, ticker: str, period_days: int = 365) -> Optional[OHLCV]:
        """Fetch full daily adjusted price history."""
        try:
            self._rate_limit()
            params = {
                "function": "TIME_SERIES_DAILY_ADJUSTED",
                "symbol": ticker,
                "outputsize": "full",
                "apikey": self._api_key,
            }
            resp = self._client.get(_AV_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()

            ts = data.get("Time Series (Daily)")
            if not ts:
                logger.warning("[alpha_vantage] No time series data for %s", ticker)
                return None

            records = []
            for date_str, values in ts.items():
                try:
                    records.append({
                        "date": pd.to_datetime(date_str),
                        "open": float(values.get("1. open", 0)),
                        "high": float(values.get("2. high", 0)),
                        "low": float(values.get("3. low", 0)),
                        "close": float(values.get("4. close", 0)),
                        "adj_close": float(values.get("5. adjusted close", 0)),
                        "volume": int(float(values.get("6. volume", 0))),
                    })
                except (ValueError, TypeError):
                    continue

            if not records:
                return None

            df = pd.DataFrame(records)
            df.set_index("date", inplace=True)
            df.sort_index(inplace=True)

            # Trim to requested period
            if period_days > 0:
                cutoff = pd.Timestamp.today() - pd.Timedelta(days=period_days)
                df = df[df.index >= cutoff]

            if df.empty:
                return None

            return OHLCV(
                ticker=ticker,
                df=df,
                source="alpha_vantage",
                as_of=date.today(),
            )

        except Exception as e:
            logger.error("[alpha_vantage] Error fetching OHLCV for %s: %s", ticker, e)
            return None

    def get_universe(self) -> list[str]:
        return self.get_sp500_tickers()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _rate_limit(self) -> None:
        """Enforce minimum interval between API requests."""
        now = time.monotonic()
        elapsed = now - self._last_request_time
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self._last_request_time = time.monotonic()

    def _fetch_overview(self, ticker: str) -> Optional[dict]:
        """Fetch OVERVIEW data for a ticker."""
        self._rate_limit()
        try:
            params = {
                "function": "OVERVIEW",
                "symbol": ticker,
                "apikey": self._api_key,
            }
            resp = self._client.get(_AV_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()
            # AV returns an empty dict or {"Note": "..."} on rate-limit
            if not data or "Note" in data or "Information" in data:
                logger.warning(
                    "[alpha_vantage] Rate limited or no data for %s: %s",
                    ticker, list(data.keys())[:2]
                )
                return None
            return data
        except Exception as e:
            logger.error("[alpha_vantage] Error fetching overview for %s: %s", ticker, e)
            return None

    def get_overview(self, ticker: str) -> Optional[dict]:
        """Public method for external use (e.g., EdgarAlphaVantageProvider)."""
        return self._fetch_overview(ticker)
