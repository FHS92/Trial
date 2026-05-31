"""
data_providers — pluggable data-source adapters for EdgeScan v2.

Available providers:
  yfinance_dev          — wraps yfinance; dev-only (is_production_safe=False)
  edgar                 — SEC EDGAR XBRL API; production-safe
  alpha_vantage         — Alpha Vantage API; production-safe
  EdgarAlphaVantage     — EDGAR fundamentals + AV prices (recommended for prod)

Use data_providers.factory.get_provider() to get the configured provider.
"""

from .base import DataProvider, Fundamentals, OHLCV
from .factory import get_provider

__all__ = ["DataProvider", "Fundamentals", "OHLCV", "get_provider"]
