"""
data_fetcher.py — yfinance wrapper for EdgeScan
Fetches fundamentals and price history for a given ticker.
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


def fetch_fundamentals(ticker: str) -> dict:
    """
    Fetch fundamental data for a ticker using yfinance.
    Returns a dict with key metrics or defaults if data is unavailable.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info

        sector = info.get("sector", "Unknown")
        sector_pe = SECTOR_PE_MEDIANS.get(sector, SECTOR_PE_MEDIANS["Unknown"])

        # Revenue growth YoY
        rev_growth = _safe_get(info, "revenueGrowth", 0.0)
        if rev_growth is not None:
            rev_growth = rev_growth * 100  # convert to percentage

        # EPS growth YoY (trailing vs year-ago)
        eps_growth = _safe_get(info, "earningsGrowth", 0.0)
        if eps_growth is not None:
            eps_growth = eps_growth * 100

        # Free cash flow yield = FCF / market cap
        fcf = _safe_get(info, "freeCashflow", None)
        market_cap = _safe_get(info, "marketCap", None)
        if fcf and market_cap and market_cap > 0:
            fcf_yield = (fcf / market_cap) * 100
        else:
            fcf_yield = 0.0

        # Return on equity
        roe = _safe_get(info, "returnOnEquity", 0.0)
        if roe is not None:
            roe = roe * 100

        # Debt/Equity
        debt_to_equity = _safe_get(info, "debtToEquity", 999.0)
        if debt_to_equity is not None:
            debt_to_equity = debt_to_equity / 100  # yfinance returns as %, normalize

        # Forward P/E
        fwd_pe = _safe_get(info, "forwardPE", None)

        # Gross margin trend (use trailing gross margins)
        gross_margin = _safe_get(info, "grossMargins", 0.0)
        if gross_margin is not None:
            gross_margin = gross_margin * 100

        # Analyst target price
        analyst_target = _safe_get(info, "targetMeanPrice", None)

        # Current price
        current_price = _safe_get(info, "currentPrice", None) or _safe_get(info, "regularMarketPrice", None)

        # 52-week high/low
        week52_high = _safe_get(info, "fiftyTwoWeekHigh", None)
        week52_low = _safe_get(info, "fiftyTwoWeekLow", None)

        # Next earnings date
        try:
            cal = t.calendar
            earnings_date = None
            if cal is not None and not cal.empty:
                if "Earnings Date" in cal.index:
                    earnings_date = cal.loc["Earnings Date"].iloc[0]
                    if hasattr(earnings_date, "date"):
                        earnings_date = earnings_date.date()
        except Exception:
            earnings_date = None

        # Analyst recommendation
        rec = info.get("recommendationKey", "none")

        return {
            "ticker": ticker,
            "name": info.get("longName", ticker),
            "sector": sector,
            "sector_pe": sector_pe,
            "current_price": current_price,
            "rev_growth": rev_growth or 0.0,
            "eps_growth": eps_growth or 0.0,
            "fcf_yield": fcf_yield,
            "roe": roe or 0.0,
            "gross_margin": gross_margin or 0.0,
            "debt_to_equity": debt_to_equity if debt_to_equity is not None else 2.0,
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


def fetch_price_history(ticker: str, period: str = "1y") -> Optional[pd.DataFrame]:
    """
    Fetch OHLCV price history. Returns a DataFrame indexed by date,
    or None if unavailable.
    """
    try:
        df = yf.download(ticker, period=period, auto_adjust=True, progress=False)
        if df is None or df.empty:
            return None
        # Flatten multi-level columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        return df
    except Exception as e:
        print(f"  [data_fetcher] Error fetching price history for {ticker}: {e}")
        return None


def _safe_get(d: dict, key: str, default):
    val = d.get(key, default)
    if val is None:
        return default
    # yfinance sometimes returns "Infinity" or NaN
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
