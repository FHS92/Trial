"""
email_service.py — Transactional email for EdgeScan v2.

Dev mode  (no EMAIL_API_KEY): logs to stdout — no real emails sent.
Prod mode (EMAIL_API_KEY set): sends via Resend API.

Usage:
    from email_service import send_verification_email, send_password_reset_email
"""

from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_API_KEY  = os.environ.get("EMAIL_API_KEY", "")
_FROM     = os.environ.get("EMAIL_FROM", "EdgeScan <noreply@edgescan.app>")
_APP_URL  = os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3001")
_RESEND   = "https://api.resend.com/emails"


def _send(to: str, subject: str, html: str) -> bool:
    """Send one email. Returns True on success."""
    if not _API_KEY:
        # Dev mode — print to console instead of sending
        logger.info(
            "\n[EMAIL DEV MODE — not sent]\n"
            "To: %s\nSubject: %s\n\n%s\n",
            to, subject, html,
        )
        return True

    try:
        resp = httpx.post(
            _RESEND,
            headers={"Authorization": f"Bearer {_API_KEY}"},
            json={"from": _FROM, "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
        if resp.status_code >= 400:
            logger.error("Resend error %s: %s", resp.status_code, resp.text)
            return False
        return True
    except Exception as exc:
        logger.error("Email send failed: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

def send_verification_email(to: str, name: Optional[str], token: str) -> bool:
    link = f"{_APP_URL}/verify?token={token}"
    display = name or to
    html = f"""
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <h2 style="color:#6366f1">Verify your EdgeScan account</h2>
  <p>Hi {display},</p>
  <p>Click the button below to verify your email address. The link expires in 24 hours.</p>
  <a href="{link}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;
     border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">
    Verify email
  </a>
  <p style="color:#64748b;font-size:12px">
    Or copy this link: {link}<br>
    If you didn't create an EdgeScan account, you can safely ignore this email.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0">
  <p style="color:#94a3b8;font-size:11px">
    EdgeScan — Not investment advice. Data for informational purposes only.
  </p>
</div>
"""
    return _send(to, "Verify your EdgeScan email", html)


def send_password_reset_email(to: str, name: Optional[str], token: str) -> bool:
    link = f"{_APP_URL}/reset?token={token}"
    display = name or to
    html = f"""
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <h2 style="color:#6366f1">Reset your password</h2>
  <p>Hi {display},</p>
  <p>We received a request to reset your EdgeScan password.
     Click the button below — the link expires in 1 hour.</p>
  <a href="{link}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;
     border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">
    Reset password
  </a>
  <p style="color:#64748b;font-size:12px">
    Or copy: {link}<br>
    If you didn't request a password reset, ignore this email — your account is safe.
  </p>
</div>
"""
    return _send(to, "Reset your EdgeScan password", html)


def send_welcome_email(to: str, name: Optional[str]) -> bool:
    display = name or "there"
    scanner_link = f"{_APP_URL}/scanner"
    html = f"""
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <h2 style="color:#6366f1">Welcome to EdgeScan</h2>
  <p>Hi {display},</p>
  <p>Your account is verified and ready. EdgeScan scores every S&P 500 stock on
     fundamental quality and technical timing — updated after every market close.</p>
  <a href="{scanner_link}" style="display:inline-block;background:#6366f1;color:#fff;
     padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">
    Open the scanner →
  </a>
  <hr style="border:none;border-top:1px solid #e2e8f0">
  <p style="color:#94a3b8;font-size:11px">
    EdgeScan — Not investment advice. Scores are informational only.
  </p>
</div>
"""
    return _send(to, "Welcome to EdgeScan", html)
