"""
data_fetcher.py — yfinance wrapper for EdgeScan
Fetches fundamentals and price history for a given ticker.

Fundamental metrics are computed directly from raw financial statements
(income_stmt, balance_sheet, cashflow) rather than relying on ticker.info
derived/cached fields, which can be weeks out of date.
ticker.info is kept as a fallback when statements are unavailable.
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional


# Sector median forward P/E estimates (approximate, updated periodically)
SECTOR_PE_MEDIANS = {
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

# Sample of 500 S&P 500 tickers (first 50 shown; full list used in production)
SP500_TICKERS = [
    "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "GOOG", "BRK-B", "LLY", "AVGO",
    "TSLA", "WMT", "JPM", "V", "UNH", "XOM", "ORCL", "MA", "COST", "HD",
    "PG", "JNJ", "ABBV", "NFLX", "BAC", "CRM", "CVX", "MRK", "KO", "PCAR",
    "AMD", "PEP", "TMO", "ACN", "LIN", "MCD", "CSCO", "IBM", "GE", "CAT",
    "NOW", "INTU", "ISRG", "UBER", "TXN", "BKNG", "AMGN", "SPGI", "AXP", "GS",
    "MS", "BLK", "SCHW", "DE", "UPS", "HON", "BA", "RTX", "LMT", "MMM",
    "SYK", "VRTX", "ADI", "LRCX", "PANW", "AMAT", "KLAC", "SNPS", "CDNS", "MCHP",
    "APH", "GILD", "MDT", "ELV", "CI", "HUM", "CVS", "WBA", "DIS", "CMCSA",
    "T", "VZ", "TMUS", "CHTR", "NEE", "DUK", "SO", "D", "AEP", "EXC",
    "PLD", "AMT", "CCI", "EQIX", "O", "PSA", "SPG", "WELL", "DLR", "VICI",
]

# ---------------------------------------------------------------------------
# Row-name lookup helpers (yfinance 0.2.x uses CamelCase; older used spaces)
# ---------------------------------------------------------------------------

_REVENUE_NAMES    = ["TotalRevenue", "Total Revenue", "Revenue", "Operating Revenue"]
_GROSS_PROFIT_NAMES = ["GrossProfit", "Gross Profit"]
_NET_INCOME_NAMES = ["NetIncome", "Net Income", "Net Income Common Stockholders",
                     "NetIncomeCommonStockholders"]
_OCF_NAMES        = ["OperatingCashFlow", "Operating Cash Flow", "Cash From Operations",
                     "CashFlowFromContinuingOperatingActivities"]
_CAPEX_NAMES      = ["CapitalExpenditure", "Capital Expenditure", "Capital Expenditures",
                     "PurchaseOfPPE", "Purchase Of Property Plant And Equipment"]
_EQUITY_NAMES     = ["StockholdersEquity", "Stockholders Equity", "CommonStockEquity",
                     "Common Stock Equity", "Total Stockholder Equity", "TotalStockholdersEquity"]
_DEBT_NAMES       = ["TotalDebt", "Total Debt", "LongTermDebt", "Long Term Debt",
                     "Total Long Term Debt"]


def _find_row(df: pd.DataFrame, candidates: list[str]) -> Optional[pd.Series]:
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


# ---------------------------------------------------------------------------
# Per-metric computation helpers
# ---------------------------------------------------------------------------

def _rev_growth(annual_fin, q_fin, info) -> float:
    # Annual: (yr0 - yr1) / |yr1|
    rev_a = _find_row(annual_fin, _REVENUE_NAMES)
    if rev_a is not None and len(rev_a) >= 2:
        r0, r1 = _scalar(rev_a, 0), _scalar(rev_a, 1)
        if r0 is not None and r1 and r1 != 0:
            return (r0 - r1) / abs(r1) * 100

    # TTM vs prior-TTM from quarterly
    rev_q = _find_row(q_fin, _REVENUE_NAMES)
    if rev_q is not None and len(rev_q) >= 8:
        ttm0, ttm1 = _ttm(rev_q, 4), _ttm(pd.Series(rev_q.iloc[4:8].values), 4)
        if ttm0 is not None and ttm1 and ttm1 != 0:
            return (ttm0 - ttm1) / abs(ttm1) * 100

    # info fallback
    val = info.get("revenueGrowth")
    if val is not None and not _is_bad(val):
        return float(val) * 100
    return 0.0


def _eps_growth(annual_fin, q_fin, info) -> float:
    # Net income YoY (annual)
    ni_a = _find_row(annual_fin, _NET_INCOME_NAMES)
    if ni_a is not None and len(ni_a) >= 2:
        n0, n1 = _scalar(ni_a, 0), _scalar(ni_a, 1)
        if n0 is not None and n1 and n1 != 0:
            return (n0 - n1) / abs(n1) * 100

    # TTM net income vs prior-TTM
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
        # capex is negative in yfinance; adding it gives FCF
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
    # Net income / avg equity (annual)
    ni_a = _find_row(annual_fin, _NET_INCOME_NAMES)
    eq_a = _find_row(annual_bs, _EQUITY_NAMES)
    if ni_a is not None and eq_a is not None:
        ni = _scalar(ni_a, 0)
        eq = _scalar(eq_a, 0)
        if ni is not None and eq and eq != 0:
            return ni / abs(eq) * 100

    # TTM net income / most recent equity
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
    # Gross profit / revenue (annual)
    gp_a  = _find_row(annual_fin, _GROSS_PROFIT_NAMES)
    rev_a = _find_row(annual_fin, _REVENUE_NAMES)
    if gp_a is not None and rev_a is not None:
        gp  = _scalar(gp_a, 0)
        rev = _scalar(rev_a, 0)
        if gp is not None and rev and rev != 0:
            return gp / rev * 100

    # TTM from quarterly
    gp_q  = _find_row(q_fin, _GROSS_PROFIT_NAMES)
    rev_q = _find_row(q_fin, _REVENUE_NAMES)
    if gp_q is not None and rev_q is not None and len(gp_q) >= 4:
        gp  = _ttm(gp_q, 4)
        rev = _ttm(rev_q, 4)
        if gp is not None and rev and rev != 0:
            return gp / rev * 100

    val = info.get("grossMargins")
    if val is not None and not _is_bad(val):
        return float(val) * 100
    return 0.0


def _debt_to_equity(annual_bs, q_bs, info) -> float:
    # Total debt / stockholders equity (annual)
    debt_a = _find_row(annual_bs, _DEBT_NAMES)
    eq_a   = _find_row(annual_bs, _EQUITY_NAMES)
    if debt_a is not None and eq_a is not None:
        debt = _scalar(debt_a, 0)
        eq   = _scalar(eq_a, 0)
        if debt is not None and eq and eq != 0:
            return debt / abs(eq)

    # Quarterly fallback
    debt_q = _find_row(q_bs, _DEBT_NAMES)
    eq_q   = _find_row(q_bs, _EQUITY_NAMES)
    if debt_q is not None and eq_q is not None:
        debt = _scalar(debt_q, 0)
        eq   = _scalar(eq_q, 0)
        if debt is not None and eq and eq != 0:
            return debt / abs(eq)

    # info returns D/E as a percentage (e.g. 150 means 1.5x)
    val = info.get("debtToEquity")
    if val is not None and not _is_bad(val):
        return float(val) / 100
    return 2.0


def _is_bad(val) -> bool:
    """True if val is None, NaN, or Inf."""
    try:
        return val is None or np.isnan(float(val)) or np.isinf(float(val))
    except Exception:
        return True


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_fundamentals(ticker: str) -> dict:
    """
    Fetch fundamental data for a ticker using yfinance.
    Metrics are computed from raw financial statements where possible;
    ticker.info is used as a fallback or for fields with no statement equivalent.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info

        sector    = info.get("sector", "Unknown")
        sector_pe = SECTOR_PE_MEDIANS.get(sector, SECTOR_PE_MEDIANS["Unknown"])

        market_cap = _safe_info(info, "marketCap", None)

        # Pull all four statement types once
        try:
            annual_fin = t.financials           # income statement (annual)
            q_fin      = t.quarterly_financials  # income statement (quarterly)
            annual_bs  = t.balance_sheet
            q_bs       = t.quarterly_balance_sheet
            annual_cf  = t.cashflow
            q_cf       = t.quarterly_cashflow
        except Exception:
            annual_fin = q_fin = annual_bs = q_bs = annual_cf = q_cf = None

        rev_growth_val   = _rev_growth(annual_fin, q_fin, info)
        eps_growth_val   = _eps_growth(annual_fin, q_fin, info)
        fcf_yield_val    = _fcf_yield(annual_cf, q_cf, info, market_cap)
        roe_val          = _roe(annual_fin, q_fin, annual_bs, q_bs, info)
        gross_margin_val = _gross_margin(annual_fin, q_fin, info)
        de_val           = _debt_to_equity(annual_bs, q_bs, info)

        # These have no reliable free statement equivalent — keep from info
        fwd_pe        = _safe_info(info, "forwardPE", None)
        analyst_target = _safe_info(info, "targetMeanPrice", None)
        current_price  = (_safe_info(info, "currentPrice", None)
                          or _safe_info(info, "regularMarketPrice", None))
        week52_high   = _safe_info(info, "fiftyTwoWeekHigh", None)
        week52_low    = _safe_info(info, "fiftyTwoWeekLow", None)
        rec           = info.get("recommendationKey", "none") or "none"

        # Earnings date from calendar
        earnings_date = _fetch_earnings_date(t)

        return {
            "ticker": ticker,
            "name": info.get("longName", ticker),
            "sector": sector,
            "sector_pe": sector_pe,
            "current_price": current_price,
            "rev_growth": rev_growth_val,
            "eps_growth": eps_growth_val,
            "fcf_yield": fcf_yield_val,
            "roe": roe_val,
            "gross_margin": gross_margin_val,
            "debt_to_equity": de_val,
            "fwd_pe": fwd_pe,
            "analyst_target": analyst_target,
            "week52_high": week52_high,
            "week52_low": week52_low,
            "earnings_date": earnings_date,
            "recommendation": rec,
            "market_cap": market_cap,
        }

    except Exception as e:
        print(f"  [data_fetcher] Error fetching fundamentals for {ticker}: {e}")
        return _empty_fundamentals(ticker)


def _fetch_earnings_date(t: yf.Ticker):
    try:
        cal = t.calendar
        if cal is not None and not cal.empty:
            if "Earnings Date" in cal.index:
                ed = cal.loc["Earnings Date"].iloc[0]
                if hasattr(ed, "date"):
                    return ed.date()
                return ed
    except Exception:
        pass
    return None


def fetch_price_history(ticker: str, period: str = "1y") -> Optional[pd.DataFrame]:
    """
    Fetch OHLCV price history. Returns a DataFrame indexed by date,
    or None if unavailable.
    """
    try:
        df = yf.download(ticker, period=period, auto_adjust=True, progress=False)
        if df is None or df.empty:
            return None
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        return df
    except Exception as e:
        print(f"  [data_fetcher] Error fetching price history for {ticker}: {e}")
        return None


def _safe_info(d: dict, key: str, default):
    val = d.get(key, default)
    if val is None:
        return default
    if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
        return default
    return val


def _empty_fundamentals(ticker: str) -> dict:
    return {
        "ticker": ticker,
        "name": ticker,
        "sector": "Unknown",
        "sector_pe": 20.0,
        "current_price": None,
        "rev_growth": 0.0,
        "eps_growth": 0.0,
        "fcf_yield": 0.0,
        "roe": 0.0,
        "gross_margin": 0.0,
        "debt_to_equity": 2.0,
        "fwd_pe": None,
        "analyst_target": None,
        "week52_high": None,
        "week52_low": None,
        "earnings_date": None,
        "recommendation": "none",
        "market_cap": None,
    }
