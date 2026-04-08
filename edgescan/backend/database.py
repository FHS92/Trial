"""
database.py — SQLAlchemy engine + session factory for EdgeScan.

Reads DATABASE_URL from environment.
Falls back to a local SQLite file (edgescan.db) so the app runs
without a PostgreSQL instance during local development.

PostgreSQL (production):
    DATABASE_URL=postgresql://user:password@host:5432/edgescan

SQLite (local dev / CI):
    DATABASE_URL=sqlite:///./edgescan.db   (or leave unset)
"""

import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from models import Base

_RAW_URL = os.getenv("DATABASE_URL", "sqlite:///./edgescan.db")

# SQLAlchemy doesn't accept the "postgres://" scheme used by some hosts
DATABASE_URL = _RAW_URL.replace("postgres://", "postgresql://", 1)

_IS_SQLITE = DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if _IS_SQLITE else {}

_pool_kwargs = (
    {"pool_pre_ping": True, "pool_size": 5, "max_overflow": 10}
    if not _IS_SQLITE
    else {}
)

engine = create_engine(DATABASE_URL, connect_args=connect_args, **_pool_kwargs)

# Enable WAL mode for SQLite to allow concurrent reads during writes
if _IS_SQLITE:
    @event.listens_for(engine, "connect")
    def _set_wal(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA journal_mode=WAL")
        dbapi_conn.execute("PRAGMA synchronous=NORMAL")

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db() -> None:
    """Create all tables (idempotent — safe to call on every startup)."""
    Base.metadata.create_all(bind=engine)
    print(f"[database] Tables ready. Using: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")


def get_db() -> Session:
    """
    FastAPI dependency — yields a session and ensures it is closed.

    Usage:
        @app.get("/example")
        def route(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
