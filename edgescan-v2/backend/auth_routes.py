"""
auth_routes.py — Authentication endpoints for EdgeScan v2.

Mounted at /api/v1/auth/ in main.py.

Endpoints:
  POST /register         — create account (email + password)
  POST /login            — validate credentials (used by Auth.js credentials provider)
  POST /verify-email     — verify email address via token link
  POST /resend-verification — resend verification email
  POST /forgot-password  — request password reset email
  POST /reset-password   — apply new password using reset token
  GET  /me               — return current user (requires auth cookie)
  PATCH /profile         — update name / avatar
  DELETE /account        — delete account + cascade user data
  POST /google-upsert    — called by Auth.js signIn callback to create/link Google users
"""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from database import get_db
from deps import CurrentUser, get_current_user, require_auth
from email_service import (
    send_password_reset_email,
    send_verification_email,
    send_welcome_email,
)
from models import (
    EmailVerificationToken,
    PasswordResetToken,
    User,
    WatchlistItem,
    PortfolioHolding,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

# Secret shared between FastAPI and the Next.js server for internal-only endpoints.
# When set, google-upsert requires a matching X-Internal-Secret header.
# When unset (dev default), the endpoint is open — set this in all production deployments.
_INTERNAL_SECRET = os.environ.get("INTERNAL_API_SECRET", "")

_ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "").split(",")
    if e.strip()
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def _now() -> datetime:
    return datetime.utcnow()


def _generate_token() -> str:
    return secrets.token_urlsafe(32)


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "tier": user.tier,
        "is_admin": user.is_admin,
        "has_onboarded": user.has_onboarded,
        "email_verified": user.email_verified,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class GoogleUpsertRequest(BaseModel):
    google_id: str
    email: EmailStr
    name: Optional[str] = None
    avatar_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user. Sends verification email."""
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(
            status_code=409,
            detail={"code": "EMAIL_TAKEN", "message": "An account with this email already exists"},
        )

    user = User(
        email=body.email.lower(),
        name=body.name.strip(),
        password_hash=_hash_password(body.password),
        is_admin=body.email.lower() in _ADMIN_EMAILS,
    )
    db.add(user)
    db.flush()  # get the user.id

    # Issue verification token (24h)
    vtoken = EmailVerificationToken(
        user_id=user.id,
        token=_generate_token(),
        expires_at=_now() + timedelta(hours=24),
    )
    db.add(vtoken)
    db.commit()
    db.refresh(user)

    send_verification_email(user.email, user.name, vtoken.token)
    logger.info("New user registered: %s", user.email)
    return {"message": "Account created. Check your email to verify.", "user": _user_dict(user)}


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    Validate credentials. Called by Auth.js Credentials provider authorize().
    Returns the user object on success; raises 401 on failure.
    Auth.js wraps the return value in its own JWT — this endpoint does NOT
    issue tokens itself.
    """
    user = db.query(User).filter(User.email == body.email.lower()).first()

    # Use constant-time comparison even on "user not found" to prevent timing attacks
    dummy_hash = "$2b$12$invalidhashfortimingatxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    stored_hash = user.password_hash if (user and user.password_hash) else dummy_hash
    password_ok = _verify_password(body.password, stored_hash)

    if not user or not password_ok:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"},
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail={"code": "EMAIL_NOT_VERIFIED", "message": "Please verify your email address before signing in"},
        )

    return _user_dict(user)


@router.post("/verify-email")
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Mark the user's email as verified and send welcome email."""
    record = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token == body.token)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_TOKEN", "message": "Verification link is invalid"},
        )
    if record.expires_at < _now():
        raise HTTPException(
            status_code=400,
            detail={"code": "TOKEN_EXPIRED", "message": "Verification link has expired"},
        )

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "User not found"})

    already_verified = user.email_verified
    user.email_verified = True
    user.updated_at = _now()
    db.delete(record)
    db.commit()

    if not already_verified:
        send_welcome_email(user.email, user.name)

    return {"message": "Email verified successfully", "user": _user_dict(user)}


@router.post("/resend-verification")
def resend_verification(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Resend the verification email. Silently succeeds even if email not found."""
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if user and not user.email_verified:
        # Delete any existing tokens first
        db.query(EmailVerificationToken).filter(
            EmailVerificationToken.user_id == user.id
        ).delete()
        vtoken = EmailVerificationToken(
            user_id=user.id,
            token=_generate_token(),
            expires_at=_now() + timedelta(hours=24),
        )
        db.add(vtoken)
        db.commit()
        send_verification_email(user.email, user.name, vtoken.token)
    return {"message": "If the address exists and is unverified, a new link has been sent"}


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a password reset token and email it. Silently succeeds either way."""
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if user and user.password_hash:  # only for credential accounts
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id
        ).delete()
        rtoken = PasswordResetToken(
            user_id=user.id,
            token=_generate_token(),
            expires_at=_now() + timedelta(hours=1),
        )
        db.add(rtoken)
        db.commit()
        send_password_reset_email(user.email, user.name, rtoken.token)
    return {"message": "If an account exists for that email, a reset link has been sent"}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Apply a new password using a valid reset token."""
    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token == body.token, PasswordResetToken.used == False)  # noqa: E712
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_TOKEN", "message": "Reset link is invalid or already used"},
        )
    if record.expires_at < _now():
        raise HTTPException(
            status_code=400,
            detail={"code": "TOKEN_EXPIRED", "message": "Reset link has expired. Request a new one."},
        )

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "User not found"})

    user.password_hash = _hash_password(body.password)
    user.updated_at = _now()
    record.used = True
    db.commit()
    return {"message": "Password updated successfully"}


@router.get("/me")
def get_me(
    user: CurrentUser = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Return the current authenticated user."""
    db_user = db.query(User).filter(User.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "User not found"})
    return _user_dict(db_user)


@router.patch("/profile")
def update_profile(
    body: UpdateProfileRequest,
    user: CurrentUser = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Update display name or avatar URL."""
    db_user = db.query(User).filter(User.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "User not found"})
    if body.name is not None:
        db_user.name = body.name.strip() or db_user.name
    if body.avatar_url is not None:
        db_user.avatar_url = body.avatar_url
    db_user.updated_at = _now()
    db.commit()
    db.refresh(db_user)
    return _user_dict(db_user)


@router.delete("/account", status_code=204)
def delete_account(
    user: CurrentUser = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    Hard-delete or anonymize the account.
    - Deletes watchlist, portfolio, and token records.
    - Anonymizes the User row (per GDPR retention rules for billing history).
    Phase 5 will also cancel any active Stripe subscription before deletion.
    """
    uid = user.id

    db.query(WatchlistItem).filter(WatchlistItem.user_id == uid).delete()
    db.query(PortfolioHolding).filter(PortfolioHolding.user_id == uid).delete()
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == uid).delete()
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == uid).delete()

    db_user = db.query(User).filter(User.id == uid).first()
    if db_user:
        # Anonymize rather than hard-delete (preserves FK integrity for billing records)
        db_user.email = f"deleted_{uid}@deleted.invalid"
        db_user.name = "Deleted User"
        db_user.password_hash = None
        db_user.google_id = None
        db_user.avatar_url = None
        db_user.email_verified = False
        db_user.tier = "free"
        db_user.is_active = False  # invalidates all existing session cookies
        db_user.updated_at = _now()

    db.commit()


@router.post("/google-upsert")
def google_upsert(
    body: GoogleUpsertRequest,
    x_internal_secret: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Called from Auth.js signIn callback when a Google user authenticates.
    Creates or links the user in our DB. Returns the user dict for Auth.js to
    embed in the JWT (so tier is available server-side).
    Requires X-Internal-Secret header matching INTERNAL_API_SECRET env var.
    """
    if _INTERNAL_SECRET and x_internal_secret != _INTERNAL_SECRET:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "Internal endpoint"},
        )
    # Look up by google_id first, then by email
    user = db.query(User).filter(User.google_id == body.google_id).first()

    if not user:
        user = db.query(User).filter(User.email == body.email.lower()).first()
        if user:
            # Link Google to existing email account
            user.google_id = body.google_id
            if not user.avatar_url and body.avatar_url:
                user.avatar_url = body.avatar_url
        else:
            # Brand-new Google user
            user = User(
                email=body.email.lower(),
                name=body.name,
                google_id=body.google_id,
                avatar_url=body.avatar_url,
                email_verified=True,  # Google emails are pre-verified
                is_admin=body.email.lower() in _ADMIN_EMAILS,
            )
            db.add(user)

    user.updated_at = _now()
    db.commit()
    db.refresh(user)
    return _user_dict(user)
