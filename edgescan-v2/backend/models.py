"""
models.py — SQLAlchemy 2.x ORM models for EdgeScan v2.

Auth tables (User, Subscription) are stubs — Auth.js v5 will populate them
in Phase 3. All other tables are fully used.

Uses the mapped_column / Mapped[T] syntax from SQLAlchemy 2.0.
"""

from __future__ import annotations

from datetime import date as date_type
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Auth (stub tables — populated by Auth.js v5 in Phase 3)
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email_verified: Mapped[bool] = mapped_column(default=False)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tier: Mapped[str] = mapped_column(String(20), default="free")   # "free" | "pro"
    is_admin: Mapped[bool] = mapped_column(default=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    has_onboarded: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), unique=True
    )
    stripe_customer_id: Mapped[str] = mapped_column(String(255), unique=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50))   # active|trialing|past_due|canceled
    plan: Mapped[str] = mapped_column(String(20))     # monthly|annual
    current_period_end: Mapped[datetime]
    trial_end: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )


# ---------------------------------------------------------------------------
# Market data
# ---------------------------------------------------------------------------

class ScanResult(Base):
    __tablename__ = "scan_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(10), index=True)
    name: Mapped[str] = mapped_column(String(255))
    sector: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    score: Mapped[float]
    fundamental_score: Mapped[float]
    technical_score: Mapped[float]
    current_price: Mapped[Optional[float]] = mapped_column(nullable=True)
    price_target_1m: Mapped[Optional[float]] = mapped_column(nullable=True)
    upside_pct: Mapped[Optional[float]] = mapped_column(nullable=True)
    score_breakdown_json: Mapped[str] = mapped_column(Text)
    metrics_json: Mapped[str] = mapped_column(Text)
    signals_json: Mapped[str] = mapped_column(Text)
    earnings_date: Mapped[Optional[date_type]] = mapped_column(nullable=True)
    data_source: Mapped[str] = mapped_column(String(100), default="unknown")
    scanned_at: Mapped[datetime] = mapped_column(index=True, default=datetime.utcnow)


class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(10), index=True)
    date: Mapped[date_type]
    open: Mapped[float]
    high: Mapped[float]
    low: Mapped[float]
    close: Mapped[float]
    adj_close: Mapped[float]
    volume: Mapped[int]
    source: Mapped[str] = mapped_column(String(50), default="unknown")

    __table_args__ = (UniqueConstraint("ticker", "date"),)


class FundamentalsCache(Base):
    __tablename__ = "fundamentals_cache"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    sector: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    rev_growth: Mapped[float] = mapped_column(default=0.0)
    eps_growth: Mapped[float] = mapped_column(default=0.0)
    gross_margin: Mapped[float] = mapped_column(default=0.0)
    fcf_yield: Mapped[float] = mapped_column(default=0.0)
    roe: Mapped[float] = mapped_column(default=0.0)
    debt_to_equity: Mapped[float] = mapped_column(default=2.0)
    fwd_pe: Mapped[Optional[float]] = mapped_column(nullable=True)
    trailing_pe: Mapped[Optional[float]] = mapped_column(nullable=True)
    price_to_sales: Mapped[Optional[float]] = mapped_column(nullable=True)
    price_to_book: Mapped[Optional[float]] = mapped_column(nullable=True)
    ev_ebitda: Mapped[Optional[float]] = mapped_column(nullable=True)
    sector_pe: Mapped[float] = mapped_column(default=20.0)
    current_price: Mapped[Optional[float]] = mapped_column(nullable=True)
    market_cap: Mapped[Optional[float]] = mapped_column(nullable=True)
    analyst_target: Mapped[Optional[float]] = mapped_column(nullable=True)
    week52_high: Mapped[Optional[float]] = mapped_column(nullable=True)
    week52_low: Mapped[Optional[float]] = mapped_column(nullable=True)
    recommendation: Mapped[str] = mapped_column(String(50), default="none")
    earnings_date: Mapped[Optional[date_type]] = mapped_column(nullable=True)
    data_source: Mapped[str] = mapped_column(String(100), default="unknown")
    fetched_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class ThesisCache(Base):
    __tablename__ = "thesis_cache"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    thesis_text: Mapped[str] = mapped_column(Text)
    score_at_generation: Mapped[float]
    generated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    ticker: Mapped[str] = mapped_column(String(10))
    added_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("user_id", "ticker"),)


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    ticker: Mapped[str] = mapped_column(String(10))
    shares: Mapped[float]
    buy_price: Mapped[float]
    buy_date: Mapped[Optional[date_type]] = mapped_column(nullable=True)
    score_at_buy: Mapped[Optional[float]] = mapped_column(nullable=True)
    added_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("user_id", "ticker"),)


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    triggered_by: Mapped[str] = mapped_column(String(100), default="scheduler")
    tickers_attempted: Mapped[int] = mapped_column(default=0)
    tickers_succeeded: Mapped[int] = mapped_column(default=0)
    tickers_failed: Mapped[int] = mapped_column(default=0)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_source: Mapped[str] = mapped_column(String(100), default="unknown")


# ---------------------------------------------------------------------------
# Auth tokens (email verification + password reset)
# ---------------------------------------------------------------------------

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime]
    used: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
