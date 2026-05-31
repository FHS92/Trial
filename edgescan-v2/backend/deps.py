"""
deps.py — FastAPI dependency injection stubs for EdgeScan v2.

Auth is stubbed for Phase 2 (current). Phase 3 replaces these with real
JWT validation tied to Auth.js v5 httpOnly cookies.

Tier enforcement:
  free  — up to 10 scanner results, watchlist limited to 5 items
  pro   — full scanner, unlimited watchlist, on-demand scans

Admin enforcement:
  is_admin flag on User model — only admin users can trigger manual scans
  via the admin-only endpoints.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from fastapi import Depends, Header, HTTPException


@dataclass
class CurrentUser:
    id: str
    email: str
    tier: str          # "free" | "pro"
    is_admin: bool = False


# ---------------------------------------------------------------------------
# STUB auth — Phase 3 replaces this with real JWT validation
# ---------------------------------------------------------------------------

async def get_current_user(
    authorization: Optional[str] = Header(default=None)
) -> Optional[CurrentUser]:
    """
    Stub auth dependency. Returns None (anonymous) for all requests.

    Phase 3 implementation will:
      1. Extract the JWT from the "session" httpOnly cookie set by Auth.js v5
      2. Verify signature using AUTH_SECRET from environment
      3. Load the User row from the DB to check tier and is_admin
      4. Return a CurrentUser, or None if the session is invalid/missing

    For now, every request is treated as anonymous (free tier).
    """
    # Check for ADMIN_EMAILS env var to support bootstrap admin access
    import os  # noqa: PLC0415
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):]
        admin_emails_raw = os.getenv("ADMIN_EMAILS", "")
        admin_emails = {e.strip().lower() for e in admin_emails_raw.split(",") if e.strip()}
        # Simple token=email check for local dev only — NOT for production
        if token.lower() in admin_emails:
            return CurrentUser(
                id="bootstrap-admin",
                email=token.lower(),
                tier="pro",
                is_admin=True,
            )
    return None


async def require_auth(
    user: Optional[CurrentUser] = Depends(get_current_user),
) -> CurrentUser:
    """Raise 401 if the request has no valid session."""
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "UNAUTHENTICATED",
                "message": "Sign in required",
            },
        )
    return user


async def require_pro(
    user: CurrentUser = Depends(require_auth),
) -> CurrentUser:
    """Raise 402 if the authenticated user is not on the pro tier."""
    if user.tier != "pro":
        raise HTTPException(
            status_code=402,
            detail={
                "code": "PRO_REQUIRED",
                "message": "Upgrade to Pro to access this feature",
            },
        )
    return user


async def require_admin(
    user: CurrentUser = Depends(require_auth),
) -> CurrentUser:
    """Raise 403 if the authenticated user is not an admin."""
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN",
                "message": "Admin access required",
            },
        )
    return user
