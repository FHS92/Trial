"""
billing_routes.py — Stripe billing endpoints for EdgeScan v2.

Mounted at /api/v1/billing/ in main.py.

Endpoints:
  POST /create-checkout  — authenticated; creates Stripe Checkout Session
  POST /portal           — authenticated; creates Customer Portal session
  POST /webhook          — raw Stripe webhook (validates HMAC signature)
  GET  /subscription     — authenticated; returns current subscription status
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from deps import CurrentUser, require_auth
from email_service import send_upgrade_email, send_cancellation_email
from models import Subscription, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

_APP_URL = os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3001")


def _stripe_client():
    """Return the stripe module configured with the secret key, or raise 503."""
    import stripe as _stripe  # noqa: PLC0415
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    if not key:
        raise HTTPException(
            status_code=503,
            detail={"code": "BILLING_UNAVAILABLE", "message": "Billing is not yet configured"},
        )
    _stripe.api_key = key
    return _stripe


def _webhook_secret() -> str:
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    if not secret:
        raise HTTPException(
            status_code=503,
            detail={"code": "WEBHOOK_NOT_CONFIGURED", "message": "Webhook secret not set"},
        )
    return secret


def _price_id(plan: str) -> str:
    key = "STRIPE_PRICE_PRO_MONTHLY" if plan == "monthly" else "STRIPE_PRICE_PRO_ANNUAL"
    price = os.environ.get(key, "")
    if not price:
        raise HTTPException(
            status_code=503,
            detail={"code": "BILLING_UNAVAILABLE", "message": f"Price ID for '{plan}' plan is not configured"},
        )
    return price


def _now() -> datetime:
    return datetime.utcnow()


def _interval_to_plan(sub_data: dict) -> str:
    try:
        interval = sub_data["items"]["data"][0]["plan"]["interval"]
        return "annual" if interval == "year" else "monthly"
    except (KeyError, IndexError):
        return "monthly"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

class CreateCheckoutRequest(BaseModel):
    plan: str  # "monthly" | "annual"


@router.post("/create-checkout")
async def create_checkout(
    body: CreateCheckoutRequest,
    user: CurrentUser = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Create a Stripe Checkout Session. Redirects user to Stripe-hosted payment page."""
    if body.plan not in ("monthly", "annual"):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_PLAN", "message": "Plan must be 'monthly' or 'annual'"},
        )

    stripe = _stripe_client()
    price_id = _price_id(body.plan)

    # Block re-subscribing if already active
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if sub and sub.status in ("active", "trialing"):
        raise HTTPException(
            status_code=409,
            detail={"code": "ALREADY_SUBSCRIBED", "message": "You already have an active Pro subscription"},
        )

    db_user = db.query(User).filter(User.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "User not found"})

    # Reuse existing Stripe customer so billing history is preserved
    customer_id = sub.stripe_customer_id if sub else None
    if not customer_id:
        customer = stripe.Customer.create(
            email=db_user.email,
            name=db_user.name or db_user.email,
            metadata={"user_id": user.id},
        )
        customer_id = customer.id

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        # {CHECKOUT_SESSION_ID} is a Stripe literal — NOT a Python format variable
        success_url=f"{_APP_URL}/upgrade/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{_APP_URL}/upgrade?cancelled=1",
        subscription_data={"metadata": {"user_id": user.id}},
        metadata={"user_id": user.id},
    )

    logger.info("Checkout session created for user %s (plan=%s)", user.id, body.plan)
    return {"url": session.url}


@router.post("/portal")
async def create_portal(
    user: CurrentUser = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Create a Stripe Customer Portal session for subscription management."""
    stripe = _stripe_client()
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub:
        raise HTTPException(
            status_code=404,
            detail={"code": "NO_SUBSCRIPTION", "message": "No billing record found"},
        )

    portal = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=f"{_APP_URL}/account",
    )
    return {"url": portal.url}


@router.get("/subscription")
def get_subscription(
    user: CurrentUser = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's current subscription record."""
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub:
        return {"subscription": None}
    return {
        "subscription": {
            "status": sub.status,
            "plan": sub.plan,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "cancel_at_period_end": sub.cancel_at_period_end,
        }
    }


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(default=None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    """
    Receive and process Stripe webhook events.
    Stripe-Signature header is verified against STRIPE_WEBHOOK_SECRET.
    This is the authoritative source of truth for subscription state changes.
    """
    stripe = _stripe_client()
    webhook_secret = _webhook_secret()
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, webhook_secret)
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed")
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_SIGNATURE", "message": "Webhook signature verification failed"},
        )
    except Exception as exc:
        logger.error("Stripe webhook parse error: %s", exc)
        raise HTTPException(status_code=400, detail={"code": "INVALID_PAYLOAD", "message": "Could not parse event"})

    _handle_event(event, db)
    return {"received": True}


def _handle_event(event: dict, db: Session) -> None:
    event_type = event["type"]
    obj = event["data"]["object"]
    logger.info("Stripe event: %s id=%s", event_type, event.get("id"))

    dispatch = {
        "checkout.session.completed": _on_checkout_completed,
        "customer.subscription.created": _on_subscription_upserted,
        "customer.subscription.updated": _on_subscription_upserted,
        "customer.subscription.deleted": _on_subscription_deleted,
        "invoice.payment_failed": _on_payment_failed,
    }
    handler = dispatch.get(event_type)
    if handler:
        handler(obj, db)
    else:
        logger.debug("No handler for Stripe event: %s", event_type)


def _on_checkout_completed(session: dict, db: Session) -> None:
    user_id = (session.get("metadata") or {}).get("user_id")
    subscription_id = session.get("subscription")
    customer_id = session.get("customer")

    if not user_id or not subscription_id:
        logger.warning("checkout.session.completed missing user_id or subscription_id")
        return

    try:
        stripe_sub = _stripe_client().Subscription.retrieve(subscription_id)
    except Exception as exc:
        logger.error("Failed to retrieve subscription %s: %s", subscription_id, exc)
        return

    _upsert_subscription(user_id, customer_id, subscription_id, stripe_sub, db)


def _on_subscription_upserted(sub_data: dict, db: Session) -> None:
    subscription_id = sub_data["id"]
    customer_id = sub_data["customer"]
    # Find user by customer_id or subscription_id
    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == subscription_id)
        .first()
    ) or (
        db.query(Subscription)
        .filter(Subscription.stripe_customer_id == customer_id)
        .first()
    )

    if not sub:
        logger.warning("subscription.updated: no record for sub=%s / customer=%s", subscription_id, customer_id)
        return

    # Guard against stale events for old subscriptions: if we found the row via customer_id
    # fallback but it already tracks a different subscription_id, this event is for a superseded
    # subscription and should not overwrite the current row.
    if sub.stripe_subscription_id and sub.stripe_subscription_id != subscription_id:
        logger.info(
            "Skipping stale subscription event for %s — row already tracks %s",
            subscription_id, sub.stripe_subscription_id,
        )
        return

    status = sub_data["status"]
    period_end_ts = sub_data.get("current_period_end")
    period_end = datetime.utcfromtimestamp(period_end_ts) if period_end_ts is not None else None
    plan = _interval_to_plan(sub_data)

    sub.stripe_subscription_id = subscription_id
    sub.status = status
    sub.plan = plan
    sub.current_period_end = period_end
    sub.cancel_at_period_end = sub_data.get("cancel_at_period_end", False)
    sub.updated_at = _now()

    user = db.query(User).filter(User.id == sub.user_id).first()
    if user:
        user.tier = "pro" if status in ("active", "trialing") else "free"
        user.updated_at = _now()

    db.commit()
    logger.info("Subscription upserted: %s status=%s", subscription_id, status)


def _on_subscription_deleted(sub_data: dict, db: Session) -> None:
    subscription_id = sub_data["id"]
    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == subscription_id)
        .first()
    )
    if not sub:
        logger.warning("subscription.deleted: no record for %s", subscription_id)
        return

    sub.status = "canceled"
    sub.updated_at = _now()

    user = db.query(User).filter(User.id == sub.user_id).first()
    if user:
        user.tier = "free"
        user.updated_at = _now()

    db.commit()
    logger.info("Subscription deleted: %s → user %s downgraded to free", subscription_id, sub.user_id)

    # Lifecycle email: cancellation confirmation
    if user:
        period_end_str = (
            sub.current_period_end.strftime("%B %-d, %Y")
            if sub.current_period_end else None
        )
        send_cancellation_email(user.email, user.name, period_end_str)


def _on_payment_failed(invoice: dict, db: Session) -> None:
    customer_id = invoice.get("customer")
    sub = db.query(Subscription).filter(Subscription.stripe_customer_id == customer_id).first()
    if not sub:
        return
    sub.status = "past_due"
    sub.updated_at = _now()
    # Keep tier=pro during grace period — Stripe will retry, then cancel
    db.commit()
    logger.info("Payment failed for customer %s — status=past_due (tier retained during grace period)", customer_id)


def _upsert_subscription(
    user_id: str,
    customer_id: str,
    subscription_id: str,
    stripe_sub: dict,
    db: Session,
) -> None:
    status = stripe_sub["status"]
    period_end_ts = stripe_sub.get("current_period_end")
    period_end = datetime.utcfromtimestamp(period_end_ts) if period_end_ts is not None else None
    plan = _interval_to_plan(stripe_sub)

    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if sub:
        sub.stripe_customer_id = customer_id
        sub.stripe_subscription_id = subscription_id
        sub.status = status
        sub.plan = plan
        sub.current_period_end = period_end
        sub.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)
        sub.updated_at = _now()
    else:
        sub = Subscription(
            user_id=user_id,
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_id,
            status=status,
            plan=plan,
            current_period_end=period_end,
            cancel_at_period_end=stripe_sub.get("cancel_at_period_end", False),
        )
        db.add(sub)

    user = db.query(User).filter(User.id == user_id).first()
    was_pro = user.tier == "pro" if user else False
    if user:
        user.tier = "pro" if status in ("active", "trialing") else "free"
        user.updated_at = _now()

    db.commit()
    logger.info("Subscription upserted for user %s: status=%s plan=%s", user_id, status, plan)

    # Lifecycle email: send upgrade confirmation once on first activation
    if user and status in ("active", "trialing") and not was_pro:
        send_upgrade_email(user.email, user.name, plan)
