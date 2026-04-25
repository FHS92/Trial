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
    _run_migrations()
    print(f"[database] Tables ready. Using: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")


def _run_migrations() -> None:
    """Idempotent schema migrations — runs in a separate connection with full error isolation."""
    try:
        with engine.connect() as conn:
            if _IS_SQLITE:
                cols = [r[1] for r in conn.execute(text("PRAGMA table_info(scan_results)")).fetchall()]
                if "price_target_2m" in cols and "price_target_1m" not in cols:
                    conn.execute(text("ALTER TABLE scan_results RENAME COLUMN price_target_2m TO price_target_1m"))
                    conn.commit()
                    print("[database] Migrated price_target_2m → price_target_1m (SQLite)")

                # Profiles table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS profiles (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        pin_hash TEXT,
                        avatar_colour TEXT NOT NULL DEFAULT '#4F8EF7',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                conn.commit()

                # Add profile_id to portfolio_holdings if missing
                ph_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(portfolio_holdings)")).fetchall()]
                if "profile_id" not in ph_cols:
                    conn.execute(text(
                        "ALTER TABLE portfolio_holdings ADD COLUMN profile_id TEXT REFERENCES profiles(id)"
                    ))
                    conn.commit()
                    print("[database] Added profile_id to portfolio_holdings")

                # Insert default profile if none exist
                count = conn.execute(text("SELECT COUNT(*) FROM profiles")).scalar()
                if count == 0:
                    conn.execute(text(
                        "INSERT INTO profiles (id, name, pin_hash, avatar_colour) VALUES ('default', 'Default', NULL, '#4F8EF7')"
                    ))
                    conn.commit()
                    print("[database] Created default profile")

                # Assign existing portfolio rows to default profile
                conn.execute(text(
                    "UPDATE portfolio_holdings SET profile_id = 'default' WHERE profile_id IS NULL"
                ))
                conn.commit()

                # Watchlist items table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS watchlist_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                        ticker TEXT NOT NULL,
                        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(profile_id, ticker)
                    )
                """))
                conn.commit()

            else:
                conn.execute(text("""
                    DO $$
                    BEGIN
                        IF EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='scan_results' AND column_name='price_target_2m')
                        THEN
                            ALTER TABLE scan_results RENAME COLUMN price_target_2m TO price_target_1m;
                            RAISE NOTICE 'Migrated price_target_2m -> price_target_1m';
                        END IF;
                    END $$;
                """))
                conn.commit()

                # Profiles table for PostgreSQL
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS profiles (
                        id TEXT PRIMARY KEY,
                        name VARCHAR(64) NOT NULL,
                        pin_hash TEXT,
                        avatar_colour VARCHAR(7) NOT NULL DEFAULT '#4F8EF7',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                conn.commit()

                # Add profile_id to portfolio_holdings if missing (PostgreSQL)
                conn.execute(text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                       WHERE table_name='portfolio_holdings' AND column_name='profile_id')
                        THEN
                            ALTER TABLE portfolio_holdings ADD COLUMN profile_id TEXT REFERENCES profiles(id);
                        END IF;
                    END $$;
                """))
                conn.commit()

                # Insert default profile if none exist
                conn.execute(text("""
                    INSERT INTO profiles (id, name, pin_hash, avatar_colour)
                    SELECT 'default', 'Default', NULL, '#4F8EF7'
                    WHERE NOT EXISTS (SELECT 1 FROM profiles)
                """))
                conn.commit()

                # Assign existing rows to default profile
                conn.execute(text(
                    "UPDATE portfolio_holdings SET profile_id = 'default' WHERE profile_id IS NULL"
                ))
                conn.commit()

                # Watchlist items table (PostgreSQL)
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS watchlist_items (
                        id SERIAL PRIMARY KEY,
                        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                        ticker VARCHAR(10) NOT NULL,
                        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(profile_id, ticker)
                    )
                """))
                conn.commit()

    except Exception as e:
        print(f"[database] Migration skipped (non-fatal): {e}")


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
