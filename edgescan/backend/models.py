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
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("username", "ticker", name="uq_portfolio_username_ticker"),
        Index("ix_portfolio_username", "username"),
    )
