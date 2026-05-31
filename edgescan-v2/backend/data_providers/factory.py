"""
data_providers/factory.py — Provider selection based on environment variables.

Environment variables:
  DATA_PROVIDER_PRIMARY         yfinance | edgar | edgar+alpha_vantage | alpha_vantage
  DATA_PROVIDER_PRIMARY_KEY     API key for AV (ignored for yfinance/edgar-only)

Safety guard: yfinance is refused when STRIPE_SECRET_KEY starts with "sk_live_"
to prevent accidental use of the dev adapter in production.
"""

from __future__ import annotations

import os
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .base import DataProvider

logger = logging.getLogger(__name__)


class EdgarAlphaVantageProvider:
    """
    Composite provider: EDGAR for fundamentals + Alpha Vantage for prices and
    analyst data.

    get_fundamentals() calls EDGAR first, then enriches the result with
    current price, analyst target, and valuation multiples from AV OVERVIEW.
    get_ohlcv() delegates entirely to Alpha Vantage.
    """

    def __init__(self, av_key: str) -> None:
        # Lazy imports to avoid pulling in httpx at module level unnecessarily
        from .edgar import EdgarProvider
        from .alpha_vantage import AlphaVantageProvider, SECTOR_PE_MEDIANS, _safe_float

        self._edgar = EdgarProvider()
        self._av = AlphaVantageProvider(api_key=av_key)
        self._SECTOR_PE_MEDIANS = SECTOR_PE_MEDIANS
        self._safe_float = _safe_float

    @property
    def name(self) -> str:
        return "edgar+alpha_vantage"

    @property
    def is_production_safe(self) -> bool:
        return True

    def get_fundamentals(self, ticker: str):
        from .base import Fundamentals
        from datetime import date

        # 1. Fetch EDGAR fundamentals
        f = self._edgar.get_fundamentals(ticker)

        # 2. Fetch AV OVERVIEW for price/analyst enrichment
        overview = self._av.get_overview(ticker)

        if f is None and overview is None:
            return None

        sf = self._safe_float

        if overview and (overview.get("Symbol") is not None):
            # Current price
            price = sf(overview.get("50DayMovingAverage"))
            market_cap = sf(overview.get("MarketCapitalization"))

            # Re-compute FCF yield now that we have market_cap
            fcf_yield = 0.0
            if (
                market_cap
                and market_cap > 0
                and hasattr(self._edgar, "_last_fcf")
                and self._edgar._last_fcf is not None
            ):
                fcf_yield = self._edgar._last_fcf / market_cap * 100

            if f is not None:
                # Enrich EDGAR fundamentals with AV data
                return Fundamentals(
                    ticker=f.ticker,
                    name=overview.get("Name", f.name) or f.name,
                    sector=overview.get("Sector", f.sector) or f.sector,
                    industry=overview.get("Industry", f.industry) or f.industry,
                    rev_growth=f.rev_growth,
                    eps_growth=f.eps_growth,
                    gross_margin=f.gross_margin,
                    fcf_yield=fcf_yield,
                    roe=f.roe,
                    debt_to_equity=f.debt_to_equity,
                    fwd_pe=sf(overview.get("ForwardPE")),
                    trailing_pe=sf(overview.get("TrailingPE")),
                    price_to_sales=sf(overview.get("PriceToSalesRatioTTM")),
                    price_to_book=sf(overview.get("PriceToBookRatio")),
                    ev_ebitda=sf(overview.get("EVToEBITDA")),
                    sector_pe=self._SECTOR_PE_MEDIANS.get(
                        overview.get("Sector", f.sector) or f.sector,
                        self._SECTOR_PE_MEDIANS["Unknown"]
                    ),
                    current_price=price,
                    market_cap=market_cap,
                    analyst_target=sf(overview.get("AnalystTargetPrice")),
                    week52_high=sf(overview.get("52WeekHigh")),
                    week52_low=sf(overview.get("52WeekLow")),
                    recommendation="none",
                    earnings_date=None,
                    source="edgar+alpha_vantage",
                    as_of=date.today(),
                )
            else:
                # EDGAR failed — fall back to pure AV fundamentals
                return self._av.get_fundamentals(ticker)

        # AV unavailable — return EDGAR-only result (price/analyst fields will be None)
        return f

    def get_ohlcv(self, ticker: str, period_days: int = 365):
        return self._av.get_ohlcv(ticker, period_days)

    def get_universe(self) -> list[str]:
        return self._edgar.get_sp500_tickers()

    def get_sp500_tickers(self) -> list[str]:
        return self._edgar.get_sp500_tickers()


def get_provider() -> "DataProvider":
    """
    Return the configured DataProvider instance.

    Reads DATA_PROVIDER_PRIMARY from env (default: yfinance).
    Raises RuntimeError if yfinance is requested in a production environment
    (detected by a live Stripe key starting with 'sk_live_').
    """
    name = os.getenv("DATA_PROVIDER_PRIMARY", "yfinance").lower().strip()
    stripe_key = os.getenv("STRIPE_SECRET_KEY", "")

    if name == "yfinance":
        if stripe_key.startswith("sk_live_"):
            raise RuntimeError(
                "DATA_PROVIDER_PRIMARY=yfinance is not allowed in production "
                "(live Stripe key detected). Set DATA_PROVIDER_PRIMARY=edgar+alpha_vantage."
            )
        from .yfinance_dev import YFinanceDevProvider
        provider = YFinanceDevProvider()
        logger.warning(
            "[factory] Using yfinance_dev provider — NOT for production use."
        )
        return provider

    elif name in ("edgar+alpha_vantage", "edgar+av"):
        av_key = os.getenv("DATA_PROVIDER_PRIMARY_KEY", "")
        if not av_key:
            logger.warning(
                "[factory] DATA_PROVIDER_PRIMARY_KEY not set — "
                "Alpha Vantage enrichment will fail. Falling back to EDGAR-only."
            )
            from .edgar import EdgarProvider
            return EdgarProvider()
        return EdgarAlphaVantageProvider(av_key=av_key)

    elif name == "edgar":
        from .edgar import EdgarProvider
        return EdgarProvider()

    elif name == "alpha_vantage":
        av_key = os.getenv("DATA_PROVIDER_PRIMARY_KEY", "")
        if not av_key:
            raise ValueError(
                "DATA_PROVIDER_PRIMARY=alpha_vantage requires DATA_PROVIDER_PRIMARY_KEY to be set."
            )
        from .alpha_vantage import AlphaVantageProvider
        return AlphaVantageProvider(api_key=av_key)

    raise ValueError(
        f"Unknown DATA_PROVIDER_PRIMARY: '{name}'. "
        "Valid values: yfinance, edgar, edgar+alpha_vantage, alpha_vantage"
    )
