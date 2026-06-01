"""
admin_routes.py — Admin-only dashboard endpoints for EdgeScan v2.

Mounted at /api/v1/admin/ in main.py.
All endpoints require is_admin=True.

Endpoints:
  GET /admin/stats   — high-level counts
  GET /admin/users   — paginated user list
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from deps import CurrentUser, require_admin
from models import ScanResult, ScanRun, Subscription, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def get_admin_stats(
    _: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Overview counts for the admin dashboard."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    pro_users = db.query(func.count(User.id)).filter(User.tier == "pro").scalar() or 0
    free_users = total_users - pro_users

    active_subs = (
        db.query(func.count(Subscription.id))
        .filter(Subscription.status.in_(("active", "trialing")))
        .scalar()
        or 0
    )

    # Signups in last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_users_7d = (
        db.query(func.count(User.id))
        .filter(User.created_at >= week_ago)
        .scalar()
        or 0
    )

    # Total scan results rows
    total_scans = db.query(func.count(ScanResult.id)).scalar() or 0

    # Latest scan run
    latest_run = db.query(ScanRun).order_by(ScanRun.started_at.desc()).first()

    return {
        "total_users": total_users,
        "pro_users": pro_users,
        "free_users": free_users,
        "active_subscriptions": active_subs,
        "new_users_7d": new_users_7d,
        "total_scan_rows": total_scans,
        "latest_scan": {
            "started_at": latest_run.started_at.isoformat() if latest_run else None,
            "completed_at": latest_run.completed_at.isoformat() if latest_run and latest_run.completed_at else None,
            "tickers_scanned": latest_run.tickers_succeeded if latest_run else 0,
        },
    }


@router.get("/users")
def get_admin_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=25, ge=1, le=100),
    tier: str | None = Query(default=None),
    _: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Paginated user list with subscription info."""
    q = db.query(User)
    if tier in ("pro", "free"):
        q = q.filter(User.tier == tier)
    q = q.order_by(User.created_at.desc())

    total = q.count()
    users = q.offset((page - 1) * per_page).limit(per_page).all()

    # Pull subscription data in one batch
    user_ids = [u.id for u in users]
    subs = {
        s.user_id: s
        for s in db.query(Subscription).filter(Subscription.user_id.in_(user_ids)).all()
    }

    rows = []
    for u in users:
        sub = subs.get(u.id)
        rows.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "tier": u.tier,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat(),
            "subscription": {
                "status": sub.status,
                "plan": sub.plan,
                "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
                "cancel_at_period_end": sub.cancel_at_period_end,
            } if sub else None,
        })

    return {
        "users": rows,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }
