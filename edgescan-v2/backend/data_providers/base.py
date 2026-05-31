"""
data_providers/base.py — Abstract base class and data transfer objects for EdgeScan v2.

All provider adapters must implement the DataProvider ABC. Callers only see
the public interface; swapping providers requires only a factory change.
"""

from __future__ import annotations

import pandas as pd
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date
from typing import Optional


# ---------------------------------------------------------------------------
# Data Transfer Objects
# ---------------------------------------------------------------------------

@dataclass
class Fundamentals:
    ticker: str
    name: str
    sector: str          # "Technology", "Healthcare", etc.
    industry: str
    # Growth
    rev_growth: float    # YoY revenue growth %
    eps_growth: float    # YoY EPS/net income growth %
    # Profitability
    gross_margin: float  # gross profit / revenue %
    fcf_yield: float     # FCF / market cap %
    roe: float           # net income / equity %
    # Balance sheet
    debt_to_equity: float
    # Valuation
    fwd_pe: Optional[float]
    trailing_pe: Optional[float]
    price_to_sales: Optional[float]
    price_to_book: Optional[float]
    ev_ebitda: Optional[float]
    sector_pe: float     # sector median P/E for comparison
    # Price & analyst
    current_price: Optional[float]
    market_cap: Optional[float]
    analyst_target: Optional[float]
    week52_high: Optional[float]
    week52_low: Optional[float]
    recommendation: str  # "buy", "hold", "sell", "none"
    earnings_date: Optional[date]
    # Meta
    source: str          # "edgar+alpha_vantage", "yfinance_dev", etc.
    as_of: date


@dataclass
class OHLCV:
    ticker: str
    df: pd.DataFrame     # columns: open, high, low, close, adj_close, volume; index: date
    source: str
    as_of: date


# ---------------------------------------------------------------------------
# Abstract Provider
# ---------------------------------------------------------------------------

class DataProvider(ABC):
    """
    Abstract base class for all EdgeScan data providers.

    Implementations must be stateless with respect to ticker — i.e., a single
    instance can be shared across concurrent requests.  Heavy initialisation
    (loading CIK maps, building sessions) belongs in __init__ or a lazily
    evaluated cached property.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name for this provider, e.g. 'yfinance_dev'."""
        ...

    @property
    @abstractmethod
    def is_production_safe(self) -> bool:
        """
        Returns False for dev-only adapters (yfinance).
        Guards against accidental prod use — factory checks this when a
        live Stripe key is detected.
        """
        ...

    @abstractmethod
    def get_fundamentals(self, ticker: str) -> Optional[Fundamentals]:
        """
        Fetch and return fundamental data for a single ticker.
        Returns None if the ticker cannot be found or data is unavailable.
        Should never raise — log and return None on error.
        """
        ...

    @abstractmethod
    def get_ohlcv(self, ticker: str, period_days: int = 365) -> Optional[OHLCV]:
        """
        Fetch OHLCV price history for the requested number of calendar days.
        DataFrame columns must be: open, high, low, close, adj_close, volume (lower-case).
        Index must be a DatetimeIndex or date-compatible Index.
        Returns None if unavailable.
        """
        ...

    @abstractmethod
    def get_universe(self) -> list[str]:
        """Return the current S&P 500 ticker list used for universe scans."""
        ...

    def get_sp500_tickers(self) -> list[str]:
        """
        Convenience wrapper — delegates to sp500_tickers.SP500_TICKERS.
        Subclasses can override to fetch a live constituent list.
        """
        from sp500_tickers import SP500_TICKERS
        return SP500_TICKERS
