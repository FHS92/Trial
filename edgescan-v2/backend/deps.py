"""
deps.py — FastAPI dependency injection for EdgeScan v2.

Auth.js v5 stores sessions as encrypted JWTs (JWE) in the
`authjs.session-token` httpOnly cookie, using:
  - Key derivation: HKDF(SHA-256, salt="authjs.session-token",
                         info="Auth.js Generated Encryption Key", length=64)
  - Encryption:     A256CBC-HS512 (direct key, no wrapping)

FastAPI decrypts the JWE using the shared AUTH_SECRET, then loads a
fresh User row to get the authoritative tier and is_admin status.

For local dev without a valid session cookie, the bootstrap admin check
(ADMIN_EMAILS env var + matching Bearer token) remains for convenience.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Optional

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from fastapi import Cookie, Depends, Header, HTTPException
from jose import jwe as jose_jwe
from sqlalchemy.orm import Session

from database import get_db
from models import User

logger = logging.getLogger(__name__)

_ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "").split(",")
    if e.strip()
}

_IS_PRODUCTION = os.environ.get("ENV", "").lower() in ("production", "prod")

# Shared with Next.js server — used to trust X-User-* headers on server-side requests.
_INTERNAL_SECRET = os.environ.get("INTERNAL_API_SECRET", "")


@dataclass
class CurrentUser:
    id: str
    email: str
    tier: str       # "free" | "pro"
    is_admin: bool = False


# ---------------------------------------------------------------------------
# Auth.js v5 JWE decryption
# ---------------------------------------------------------------------------

def _derive_key(auth_secret: str, salt: str = "authjs.session-token") -> bytes:
    """
    Derive the 64-byte AES-256-CBC + HMAC-SHA-512 key from AUTH_SECRET.
    Mirrors Auth.js v5's hkdf() call in @auth/core/src/jwt.ts.
    """
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=64,
        salt=salt.encode("utf-8"),
        info=b"Auth.js Generated Encryption Key",
    )
    return hkdf.derive(auth_secret.encode("utf-8"))


def _decrypt_session_token(token: str) -> Optional[dict]:
    """
    Decrypt an Auth.js v5 session token (compact JWE).
    Returns the payload dict, or None on any failure.
    """
    secret = os.environ.get("AUTH_SECRET", "")
    if not secret or not token:
        return None
    try:
        key = _derive_key(secret)
        decrypted_bytes = jose_jwe.decrypt(token, key)
        return json.loads(decrypted_bytes.decode("utf-8"))
    except Exception as exc:
        logger.debug("Session token decryption failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

async def get_current_user(
    # Auth.js v5 uses "authjs.session-token" (no __Secure- prefix on localhost)
    session_token: Optional[str] = Cookie(default=None, alias="authjs.session-token"),
    secure_session_token: Optional[str] = Cookie(default=None, alias="__Secure-authjs.session-token"),
    authorization: Optional[str] = Header(default=None),
    x_internal_secret: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
    x_user_tier: Optional[str] = Header(default=None),
    x_user_is_admin: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Optional[CurrentUser]:
    """
    Try to resolve the calling user.

    Order of precedence:
    1. Trusted X-Internal-Secret headers (from Next.js server-side requests)
    2. Secure session cookie (production HTTPS)
    3. Regular session cookie (development HTTP)
    4. Bearer <email> token matching ADMIN_EMAILS (dev bootstrap only)
    """
    # Trusted internal secret: Next.js server passes session data directly
    if _INTERNAL_SECRET and x_internal_secret == _INTERNAL_SECRET and x_user_id:
        user = db.query(User).filter(User.id == x_user_id).first()
        if user and user.is_active:
            return CurrentUser(
                id=user.id,
                email=user.email,
                tier=user.tier,
                is_admin=user.is_admin,
            )

    raw_token = secure_session_token or session_token

    if raw_token:
        payload = _decrypt_session_token(raw_token)
        if payload:
            user_id = payload.get("sub") or payload.get("id")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user and user.is_active:
                    return CurrentUser(
                        id=user.id,
                        email=user.email,
                        tier=user.tier,
                        is_admin=user.is_admin,
                    )

    # Dev bootstrap: Bearer <email> where email is in ADMIN_EMAILS.
    # Disabled in production (ENV=production). Only fires without a session cookie.
    if not raw_token and not _IS_PRODUCTION and authorization and authorization.startswith("Bearer ") and _ADMIN_EMAILS:
        token = authorization[len("Bearer "):].lower()
        if token in _ADMIN_EMAILS:
            user = db.query(User).filter(User.email == token).first()
            if not user:
                from datetime import datetime  # noqa: PLC0415
                user = User(
                    email=token,
                    name="Admin",
                    email_verified=True,
                    is_admin=True,
                    tier="pro",
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            return CurrentUser(id=user.id, email=user.email, tier="pro", is_admin=True)

    return None


async def require_auth(
    user: Optional[CurrentUser] = Depends(get_current_user),
) -> CurrentUser:
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHENTICATED", "message": "Sign in required"},
        )
    return user


async def require_pro(
    user: CurrentUser = Depends(require_auth),
    db: Session = Depends(get_db),
) -> CurrentUser:
    # Always re-read tier from DB so a cancelled subscription is enforced immediately,
    # regardless of what the (potentially stale) JWT says.
    db_user = db.query(User).filter(User.id == user.id).first()
    if not db_user or db_user.tier != "pro":
        raise HTTPException(
            status_code=402,
            detail={"code": "PRO_REQUIRED", "message": "Upgrade to Pro to access this feature"},
        )
    return user


async def require_admin(
    user: CurrentUser = Depends(require_auth),
) -> CurrentUser:
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Admin access required"},
        )
    return user
