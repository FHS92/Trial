"""
create_admin_user.py — Creates a Pro admin test account in the database.

Creates (or updates if already exists):
  email:    admin@edgescan.com
  password: admin
  name:     Admin
  tier:     pro
  is_admin: True
  email_verified: True  (skip email verification flow)
"""

from __future__ import annotations

import os
import sys
from uuid import uuid4

import bcrypt
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable is not set.", file=sys.stderr)
    sys.exit(1)

# Neon requires sslmode=require — add it if missing
if "postgresql" in DATABASE_URL and "sslmode" not in DATABASE_URL:
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"

ENGINE_KWARGS = {}
if "postgresql" in DATABASE_URL:
    ENGINE_KWARGS["pool_pre_ping"] = True

engine = create_engine(DATABASE_URL, **ENGINE_KWARGS)

EMAIL = "admin@edgescan.com"
PASSWORD = "admin"
NAME = "Admin"

password_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt(rounds=12)).decode()

with Session(engine) as session:
    existing = session.execute(
        text("SELECT id, tier, is_admin FROM users WHERE email = :email"),
        {"email": EMAIL},
    ).fetchone()

    if existing:
        session.execute(
            text("""
                UPDATE users
                SET password_hash    = :pw,
                    name             = :name,
                    tier             = 'pro',
                    is_admin         = TRUE,
                    email_verified   = TRUE,
                    is_active        = TRUE
                WHERE email = :email
            """),
            {"pw": password_hash, "name": NAME, "email": EMAIL},
        )
        session.commit()
        print(f"✅ Updated existing user {EMAIL} → tier=pro, is_admin=True")
    else:
        user_id = str(uuid4())
        session.execute(
            text("""
                INSERT INTO users
                  (id, email, name, password_hash, email_verified,
                   tier, is_admin, is_active, has_onboarded,
                   created_at, updated_at)
                VALUES
                  (:id, :email, :name, :pw, TRUE,
                   'pro', TRUE, TRUE, FALSE,
                   NOW(), NOW())
            """),
            {"id": user_id, "email": EMAIL, "name": NAME, "pw": password_hash},
        )
        session.commit()
        print(f"✅ Created new Pro admin user {EMAIL} (id={user_id})")

print()
print("Login credentials:")
print(f"  Email:    {EMAIL}")
print(f"  Password: {PASSWORD}")
print(f"  Tier:     pro")
print(f"  Admin:    yes")
