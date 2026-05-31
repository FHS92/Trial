"""
data_providers/yfinance_dev.py — yfinance-backed provider for local development.

is_production_safe = False.  The factory refuses to use this when a live
Stripe key is present in the environment.

Fundamental metrics are computed directly from raw financial statements
(income_stmt, balance_sheet, cashflow) rather than relying on ticker.info
derived/cached fields, which can be weeks out of date.
ticker.info is kept as a fallback when statements are unavailable.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from datetime import date, datetime
from typing import Optional

from .base import DataProvider, Fundamentals, OHLCV


# ---------------------------------------------------------------------------
# Sector P/E medians
# ---------------------------------------------------------------------------

SECTOR_PE_MEDIANS: dict[str, float] = {
    "Technology": 28.0,
    "Healthcare": 20.0,
    "Financials": 14.0,
    "Consumer Discretionary": 22.0,
    "Consumer Staples": 19.0,
    "Industrials": 20.0,
    "Energy": 12.0,
    "Materials": 16.0,
    "Real Estate": 35.0,
    "Utilities": 17.0,
    "Communication Services": 18.0,
    "Unknown": 20.0,
}


# ---------------------------------------------------------------------------
# Row-name lookup helpers  (yfinance 0.2.x uses CamelCase; older used spaces)
# ---------------------------------------------------------------------------

_REVENUE_NAMES = ["TotalRevenue", "Total Revenue", "Revenue", "Operating Revenue"]
_GROSS_PROFIT_NAMES = ["GrossProfit", "Gross Profit"]
_NET_INCOME_NAMES = [
    "NetIncome", "Net Income", "Net Income Common Stockholders",
    "NetIncomeCommonStockholders",
]
_OCF_NAMES = [
    "OperatingCashFlow", "Operating Cash Flow", "Cash From Operations",
    "CashFlowFromContinuingOperatingActivities",
]
_CAPEX_NAMES = [
    "CapitalExpenditure", "Capital Expenditure", "Capital Expenditures",
    "PurchaseOfPPE", "Purchase Of Property Plant And Equipment",
]
_EQUITY_NAMES = [
    "StockholdersEquity", "Stockholders Equity", "CommonStockEquity",
    "Common Stock Equity", "Total Stockholder Equity", "TotalStockholdersEquity",
]
_DEBT_NAMES = [
    "TotalDebt", "Total Debt", "LongTermDebt", "Long Term Debt",
    "Total Long Term Debt",
]


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _find_row(df: Optional[pd.DataFrame], candidates: list[str]) -> Optional[pd.Series]:
    """Return the first matching row from a financial statement DataFrame."""
    if df is None or df.empty:
        return None
    for name in candidates:
        if name in df.index:
            row = df.loc[name].dropna()
            if len(row) > 0:
                return row
    return None


def _scalar(series: Optional[pd.Series], idx: int = 0) -> Optional[float]:
    """Safely extract a float value at position idx from a Series."""
    if series is None or len(series) <= idx:
        return None
    val = series.iloc[idx]
    try:
        f = float(val)
        return None if (np.isnan(f) or np.isinf(f)) else f
    except Exception:
        return None


def _ttm(series: Optional[pd.Series], n: int = 4) -> Optional[float]:
    """Sum the last n quarters for a TTM figure."""
    if series is None or len(series) < n:
        return None
    vals = [series.iloc[i] for i in range(n)]
    try:
        floats = [float(v) for v in vals]
        if any(np.isnan(f) or np.isinf(f) for f in floats):
            return None
        return sum(floats)
    except Exception:
        return None


def _is_bad(val) -> bool:
    """True if val is None, NaN, or Inf."""
    try:
        return val is None or np.isnan(float(val)) or np.isinf(float(val))
    except Exception:
        return True


def _safe_info(d: dict, key: str, default):
    val = d.get(key, default)
    if val is None:
        return default
    if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
        return default
    return val


# ---------------------------------------------------------------------------
# Per-metric computation helpers  (identical logic to v1 data_fetcher.py)
# ---------------------------------------------------------------------------

def _rev_growth(annual_fin, q_fin, info) -> float:
    rev_a = _find_row(annual_fin, _REVENUE_NAMES)
    if rev_a is not None and len(rev_a) >= 2:
        r0, r1 = _scalar(rev_a, 0), _scalar(rev_a, 1)
        if r0 is not None and r1 and r1 != 0:
            return (r0 - r1) / abs(r1) * 100

    rev_q = _find_row(q_fin, _REVENUE_NAMES)
    if rev_q is not None and len(rev_q) >= 8:
        ttm0 = _ttm(rev_q, 4)
        ttm1 = _ttm(pd.Series(rev_q.iloc[4:8].values), 4)
        if ttm0 is not None and ttm1 and ttm1 != 0:
            return (ttm0 - ttm1) / abs(ttm1) * 100

    val = info.get("revenueGrowth")
    if val is not None and not _is_bad(val):
        return float(val) * 100
    return 0.0


def _eps_growth(annual_fin, q_fin, info) -> float:
    ni_a = _find_row(annual_fin, _NET_INCOME_NAMES)
    if ni_a is not None and len(ni_a) >= 2:
        n0, n1 = _scalar(ni_a, 0), _scalar(ni_a, 1)
        if n0 is not None and n1 and n1 != 0:
            return (n0 - n1) / abs(n1) * 100

    ni_q = _find_row(q_fin, _NET_INCOME_NAMES)
    if ni_q is not None and len(ni_q) >= 8:
        ttm0 = _ttm(ni_q, 4)
        ttm1 = _ttm(pd.Series(ni_q.iloc[4:8].values), 4)
        if ttm0 is not None and ttm1 and ttm1 != 0:
            return (ttm0 - ttm1) / abs(ttm1) * 100

    val = info.get("earningsGrowth")
    if val is not None and not _is_bad(val):
        return float(val) * 100
    return 0.0


def _fcf_yield(annual_cf, q_cf, info, market_cap) -> float:
    if not market_cap or market_cap <= 0:
        return 0.0

    def _fcf_from_cf(cf_df, idx=0):
        ocf_s = _find_row(cf_df, _OCF_NAMES)
        cap_s = _find_row(cf_df, _CAPEX_NAMES)
        ocf = _scalar(ocf_s, idx)
        if ocf is None:
            return None
        capex = _scalar(cap_s, idx) or 0.0
        return ocf + capex if capex <= 0 else ocf - capex

    def _fcf_ttm_from_cf(cf_df):
        ocf_s = _find_row(cf_df, _OCF_NAMES)
        cap_s = _find_row(cf_df, _CAPEX_NAMES)
        ocf = _ttm(ocf_s, 4)
        if ocf is None:
            return None
        capex = _ttm(cap_s, 4) or 0.0
        return ocf + capex if capex <= 0 else ocf - capex

    fcf = _fcf_from_cf(annual_cf)
    if fcf is None:
        fcf = _fcf_ttm_from_cf(q_cf)
    if fcf is None:
        raw = info.get("freeCashflow")
        fcf = float(raw) if raw and not _is_bad(raw) else None

    if fcf is not None:
        return fcf / market_cap * 100
    return 0.0


def _roe(annual_fin, q_fin, annual_bs, q_bs, info) -> float:
    ni_a = _find_row(annual_fin, _NET_INCOME_NAMES)
    eq_a = _find_row(annual_bs, _EQUITY_NAMES)
    if ni_a is not None and eq_a is not None:
        ni = _scalar(ni_a, 0)
        eq = _scalar(eq_a, 0)
        if ni is not None and eq and eq != 0:
            return ni / abs(eq) * 100

    ni_q = _find_row(q_fin, _NET_INCOME_NAMES)
    eq_q = _find_row(q_bs, _EQUITY_NAMES)
    if ni_q is not None and eq_q is not None:
        ni = _ttm(ni_q, 4)
        eq = _scalar(eq_q, 0)
        if ni is not None and eq and eq != 0:
            return ni / abs(eq) * 100

    val = info.get("returnOnEquity")
    if val is not None and not _is_bad(val):
        return float(val) * 100
    return 0.0


def _gross_margin(annual_fin, q_fin, info) -> float:
    gp_a = _find_row(annual_fin, _GROSS_PROFIT_NAMES)
    rev_a = _find_row(annual_fin, _REVENUE_NAMES)
    if gp_a is not None and rev_a is not None:
        gp = _scalar(gp_a, 0)
        rev = _scalar(rev_a, 0)
        if gp is not None and rev and rev != 0:
            return gp / rev * 100

    gp_q = _find_row(q_fin, _GROSS_PROFIT_NAMES)
    rev_q = _find_row(q_fin, _REVENUE_NAMES)
    if gp_q is not None and rev_q is not None and len(gp_q) >= 4:
        gp = _ttm(gp_q, 4)
        rev = _ttm(rev_q, 4)
        if gp is not None and rev and rev != 0:
            return gp / rev * 100

    val = info.get("grossMargins")
    if val is not None and not _is_bad(val):
        return float(val) * 100
    return 0.0


def _debt_to_equity(annual_bs, q_bs, info) -> float:
    debt_a = _find_row(annual_bs, _DEBT_NAMES)
    eq_a = _find_row(annual_bs, _EQUITY_NAMES)
    if debt_a is not None and eq_a is not None:
        debt = _scalar(debt_a, 0)
        eq = _scalar(eq_a, 0)
        if debt is not None and eq and eq != 0:
            return debt / abs(eq)

    debt_q = _find_row(q_bs, _DEBT_NAMES)
    eq_q = _find_row(q_bs, _EQUITY_NAMES)
    if debt_q is not None and eq_q is not None:
        debt = _scalar(debt_q, 0)
        eq = _scalar(eq_q, 0)
        if debt is not None and eq and eq != 0:
            return debt / abs(eq)

    # info returns D/E as a percentage (e.g. 150 means 1.5x)
    val = info.get("debtToEquity")
    if val is not None and not _is_bad(val):
        return float(val) / 100
    return 2.0


def _fetch_earnings_date(t) -> Optional[date]:
    """Extract the next earnings date from a yfinance Ticker object."""
    try:
        cal = t.calendar
        if isinstance(cal, dict):
            dates = cal.get("Earnings Date") or []
            if dates:
                ed = dates[0]
                return ed.date() if hasattr(ed, "date") else ed
        elif cal is not None and not cal.empty and "Earnings Date" in cal.index:
            ed = cal.loc["Earnings Date"].iloc[0]
            return ed.date() if hasattr(ed, "date") else ed
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Provider implementation
# ---------------------------------------------------------------------------

class YFinanceDevProvider(DataProvider):
    """
    yfinance-backed provider for local development and testing.

    WARNING: is_production_safe = False. This provider uses yfinance which
    scrapes Yahoo Finance data and is NOT suitable for production workloads.
    The factory.get_provider() function will refuse to use this provider
    when a live Stripe key is detected in the environment.
    """

    @property
    def name(self) -> str:
        return "yfinance_dev"

    @property
    def is_production_safe(self) -> bool:
        return False

    def get_fundamentals(self, ticker: str) -> Optional[Fundamentals]:
        # Import yfinance only inside this method — never at module level
        # so production-path code never pulls in yfinance.
        import yfinance as yf  # noqa: PLC0415

        try:
            t = yf.Ticker(ticker)
            info = t.info

            sector = info.get("sector", "Unknown") or "Unknown"
            industry = info.get("industry", "Unknown") or "Unknown"
            sector_pe = SECTOR_PE_MEDIANS.get(sector, SECTOR_PE_MEDIANS["Unknown"])
            market_cap = _safe_info(info, "marketCap", None)

            try:
                annual_fin = t.financials
                q_fin = t.quarterly_financials
                annual_bs = t.balance_sheet
                q_bs = t.quarterly_balance_sheet
                annual_cf = t.cashflow
                q_cf = t.quarterly_cashflow
            except Exception:
                annual_fin = q_fin = annual_bs = q_bs = annual_cf = q_cf = None

            return Fundamentals(
                ticker=ticker,
                name=info.get("longName", ticker),
                sector=sector,
                industry=industry,
                rev_growth=_rev_growth(annual_fin, q_fin, info),
                eps_growth=_eps_growth(annual_fin, q_fin, info),
                gross_margin=_gross_margin(annual_fin, q_fin, info),
                fcf_yield=_fcf_yield(annual_cf, q_cf, info, market_cap),
                roe=_roe(annual_fin, q_fin, annual_bs, q_bs, info),
                debt_to_equity=_debt_to_equity(annual_bs, q_bs, info),
                fwd_pe=_safe_info(info, "forwardPE", None),
                trailing_pe=_safe_info(info, "trailingPE", None),
                price_to_sales=_safe_info(info, "priceToSalesTrailing12Months", None),
                price_to_book=_safe_info(info, "priceToBook", None),
                ev_ebitda=_safe_info(info, "enterpriseToEbitda", None),
                sector_pe=sector_pe,
                current_price=(
                    _safe_info(info, "currentPrice", None)
                    or _safe_info(info, "regularMarketPrice", None)
                ),
                market_cap=market_cap,
                analyst_target=_safe_info(info, "targetMeanPrice", None),
                week52_high=_safe_info(info, "fiftyTwoWeekHigh", None),
                week52_low=_safe_info(info, "fiftyTwoWeekLow", None),
                recommendation=info.get("recommendationKey", "none") or "none",
                earnings_date=_fetch_earnings_date(t),
                source="yfinance_dev",
                as_of=date.today(),
            )

        except Exception as e:
            print(f"  [yfinance_dev] Error fetching fundamentals for {ticker}: {e}")
            return None

    def get_ohlcv(self, ticker: str, period_days: int = 365) -> Optional[OHLCV]:
        import yfinance as yf  # noqa: PLC0415

        # Map period_days to yfinance period string
        if period_days <= 7:
            period = "5d"
        elif period_days <= 30:
            period = "1mo"
        elif period_days <= 90:
            period = "3mo"
        elif period_days <= 180:
            period = "6mo"
        elif period_days <= 365:
            period = "1y"
        else:
            period = "2y"

        try:
            df = yf.download(ticker, period=period, auto_adjust=True, progress=False)
            if df is None or df.empty:
                return None

            # Flatten MultiIndex columns (yfinance sometimes returns them)
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            # Normalize column names to lower-case
            df.columns = [c.lower() if isinstance(c, str) else c for c in df.columns]

            # Ensure adj_close column exists (auto_adjust=True means close IS adj_close)
            if "adj_close" not in df.columns and "close" in df.columns:
                df["adj_close"] = df["close"]

            return OHLCV(
                ticker=ticker,
                df=df,
                source="yfinance_dev",
                as_of=date.today(),
            )
        except Exception as e:
            print(f"  [yfinance_dev] Error fetching OHLCV for {ticker}: {e}")
            return None

    def get_universe(self) -> list[str]:
        return self.get_sp500_tickers()
