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

# PostgreSQL: add a 10s connect timeout so a cold Neon instance never hangs startup
connect_args = {"check_same_thread": False} if _IS_SQLITE else {"connect_timeout": 10}

_pool_kwargs = (
    {"pool_pre_ping": True, "pool_size": 5, "max_overflow": 10, "pool_timeout": 15}
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

    # Column rename migration: price_target_2m → price_target_1m
    with engine.connect() as conn:
        try:
            if _IS_SQLITE:
                # SQLite doesn't support RENAME COLUMN before 3.25; skip if column already exists
                cols = [r[1] for r in conn.execute(text("PRAGMA table_info(scan_results)")).fetchall()]
                if "price_target_2m" in cols and "price_target_1m" not in cols:
                    conn.execute(text("ALTER TABLE scan_results RENAME COLUMN price_target_2m TO price_target_1m"))
                    conn.commit()
            else:
                # PostgreSQL
                conn.execute(text("""
                    DO $$
                    BEGIN
                        IF EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='scan_results' AND column_name='price_target_2m')
                        THEN
                            ALTER TABLE scan_results RENAME COLUMN price_target_2m TO price_target_1m;
                        END IF;
                    END $$;
                """))
                conn.commit()
        except Exception as e:
            print(f"[database] Column migration skipped: {e}")

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
