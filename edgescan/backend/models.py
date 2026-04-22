"""
models.py — SQLAlchemy ORM models for EdgeScan.

Tables:
  scan_results   — composite score + metrics JSON per ticker per scan
  price_history  — daily OHLCV for chart rendering
  thesis_cache   — Claude-generated "Why now" thesis (regenerated if score shifts >5pts)
"""

from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Text, Date,
    Boolean, Index, UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(10), nullable=False, index=True)
    name = Column(String(120))
    sector = Column(String(60))

    # Composite scores
    score = Column(Integer, nullable=False)
    fundamental_score = Column(Integer, nullable=False)
    technical_score = Column(Integer, nullable=False)

    # Price & target
    current_price = Column(Float)
    price_target_2m = Column(Float)
    upside_pct = Column(Float)

    # JSON blobs (stored as TEXT; parse in app layer)
    signals_json = Column(Text)       # RSI, MACD, MA, volume, 52W
    metrics_json = Column(Text)       # rev growth, EPS, FCF, ROE, margins…
    score_breakdown_json = Column(Text)  # per-component point breakdown

    # Metadata
    earnings_date = Column(Date, nullable=True)
    scanned_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        # Quickly find the most recent scan per ticker
        Index("ix_scan_results_ticker_scanned", "ticker", "scanned_at"),
    )

    def __repr__(self):
        return f"<ScanResult ticker={self.ticker} score={self.score} scanned_at={self.scanned_at}>"


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(10), nullable=False, index=True)
    date = Column(Date, nullable=False)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)

    __table_args__ = (
        UniqueConstraint("ticker", "date", name="uq_price_history_ticker_date"),
        Index("ix_price_history_ticker_date", "ticker", "date"),
    )

    def __repr__(self):
        return f"<PriceHistory ticker={self.ticker} date={self.date} close={self.close}>"


class ThesisCache(Base):
    __tablename__ = "thesis_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(10), nullable=False, unique=True, index=True)
    thesis_text = Column(Text, nullable=False)
    score_at_generation = Column(Integer)   # score when thesis was generated
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ThesisCache ticker={self.ticker} generated_at={self.generated_at}>"


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(60), nullable=False, index=True)
    ticker = Column(String(10), nullable=False)
    shares = Column(Float, nullable=False)
    buy_price = Column(Float, nullable=False)
    buy_date = Column(Date, nullable=True)
    score_at_buy = Column(Integer, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("username", "ticker", name="uq_portfolio_username_ticker"),
        Index("ix_portfolio_username", "username"),
    )


class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    n_stocks = Column(Integer, nullable=False)
    months_traded = Column(Integer)
    starting_capital = Column(Float)
    final_value = Column(Float)
    total_return_pct = Column(Float)
    spy_final_value = Column(Float)
    spy_total_return_pct = Column(Float)
    outperformance_pct = Column(Float)
    winning_months = Column(Integer)
    beat_spy_months = Column(Integer)
    monthly_json = Column(Text)   # JSON array of monthly results
    yearly_json = Column(Text)    # JSON array of yearly summaries


class FundamentalSnapshot(Base):
    """
    Point-in-time fundamental filing data extracted from SEC EDGAR.

    One row per (ticker, period_end). 10-K rows have all metric fields
    populated; 10-Q rows have only balance sheet fields (equity, debt,
    shares) — flow fields are NULL because 10-Q P&L can be YTD cumulative.

    filed_at is the exact SEC submission date — used as the look-ahead
    boundary so the backtest never uses data before it was public.
    """
    __tablename__ = "fundamental_snapshots"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    ticker      = Column(String(10), nullable=False)
    period_end  = Column(Date, nullable=False)   # fiscal year/quarter end
    filed_at    = Column(Date, nullable=False)   # exact SEC filing date
    form_type   = Column(String(10))             # "10-K" or "10-Q"
    sector      = Column(String(60))

    # Income statement — populated for 10-K only (USD)
    revenue             = Column(Float)
    gross_profit        = Column(Float)
    net_income          = Column(Float)

    # Cash flow — populated for 10-K only (USD)
    operating_cash_flow = Column(Float)
    capital_expenditure = Column(Float)   # stored as absolute outflow (positive)

    # Balance sheet — populated for both 10-K and 10-Q (USD)
    stockholders_equity = Column(Float)
    total_debt          = Column(Float)
    shares_outstanding  = Column(Float)

    __table_args__ = (
        UniqueConstraint("ticker", "period_end", name="uq_fund_snap_ticker_period"),
        Index("ix_fund_snap_ticker_filed", "ticker", "filed_at"),
    )


class PaperTrade(Base):
    """
    Tracks the auto-paper-trading portfolio that follows the model's monthly
    top-3 picks. One row per position per month. Rebalances on 1st of each month.
    """
    __tablename__ = "paper_trades"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    universe    = Column(String(20), nullable=False, default="sp500")
    month       = Column(String(7), nullable=False)   # "YYYY-MM"
    ticker      = Column(String(10), nullable=False)
    score       = Column(Float)
    entry_price = Column(Float)
    exit_price  = Column(Float)
    shares      = Column(Float)
    pnl         = Column(Float)
    return_pct  = Column(Float)
    entered_at  = Column(DateTime, default=datetime.utcnow)
    exited_at   = Column(DateTime, nullable=True)
    status      = Column(String(10), default="open")  # "open" | "closed"

    __table_args__ = (
        Index("ix_paper_trades_universe_month", "universe", "month"),
    )
