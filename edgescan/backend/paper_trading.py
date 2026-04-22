"""
paper_trading.py — Auto paper-trading portfolio for EdgeScan.

Follows the model's top-3 picks each month with a virtual $6,000.
Rebalances on the 1st of each month. Tracks real P&L vs SPY.
Called by the monthly scheduler in main.py.
"""

from datetime import date, datetime
from typing import Optional
import yfinance as yf
from sqlalchemy.orm import Session

from database import SessionLocal
from models import PaperTrade, ScanResult
from sqlalchemy import func, text


STARTING_CAPITAL = 6_000.0
PICKS = 3


def _current_price(ticker: str) -> Optional[float]:
    try:
        info = yf.Ticker(ticker).fast_info
        return round(float(info.last_price), 2)
    except Exception:
        return None


def _top_picks(universe: str, db: Session) -> list[dict]:
    """Return the top PICKS stocks from the most recent scan for this universe."""
    latest_ts = db.execute(
        text("SELECT MAX(scanned_at) FROM scan_results")
    ).scalar()
    if not latest_ts:
        return []
    if isinstance(latest_ts, str):
        from datetime import timedelta
        latest_ts = datetime.fromisoformat(latest_ts)
    from datetime import timedelta
    cutoff = latest_ts - timedelta(minutes=10)
    rows = (
        db.query(ScanResult)
        .filter(ScanResult.scanned_at >= cutoff)
        .order_by(ScanResult.score.desc())
        .limit(PICKS)
        .all()
    )
    return [{"ticker": r.ticker, "score": r.score, "price": r.current_price} for r in rows]


def run_monthly_rebalance(universe: str = "sp500") -> dict:
    """
    Close last month's open positions and open this month's top-3.
    Called on the 1st of each month by the scheduler.
    Returns summary of what was bought/sold.
    """
    db = SessionLocal()
    try:
        today = date.today()
        month_str = today.strftime("%Y-%m")

        # Skip if already rebalanced this month
        existing = (
            db.query(PaperTrade)
            .filter(PaperTrade.universe == universe, PaperTrade.month == month_str)
            .first()
        )
        if existing:
            return {"status": "already_rebalanced", "month": month_str}

        # Close last month's open positions
        open_positions = (
            db.query(PaperTrade)
            .filter(PaperTrade.universe == universe, PaperTrade.status == "open")
            .all()
        )
        for pos in open_positions:
            exit_px = _current_price(pos.ticker)
            if exit_px and pos.entry_price and pos.shares:
                pos.pnl = round(pos.shares * (exit_px - pos.entry_price), 2)
                pos.return_pct = round((exit_px - pos.entry_price) / pos.entry_price * 100, 2)
                pos.exit_price = exit_px
            pos.status = "closed"
            pos.exited_at = datetime.utcnow()
        db.commit()

        # Calculate current portfolio value
        portfolio_value = _portfolio_value(universe, db)

        # Open new positions
        picks = _top_picks(universe, db)
        if len(picks) < PICKS:
            return {"status": "insufficient_picks", "month": month_str, "found": len(picks)}

        alloc = portfolio_value / len(picks)
        opened = []
        for pick in picks[:PICKS]:
            px = pick["price"] or _current_price(pick["ticker"])
            if not px or px <= 0:
                continue
            shares = alloc / px
            db.add(PaperTrade(
                universe=universe,
                month=month_str,
                ticker=pick["ticker"],
                score=pick["score"],
                entry_price=px,
                shares=round(shares, 4),
                status="open",
            ))
            opened.append(pick["ticker"])
        db.commit()

        return {
            "status": "rebalanced",
            "month": month_str,
            "closed": [p.ticker for p in open_positions],
            "opened": opened,
            "portfolio_value": round(portfolio_value, 2),
        }
    finally:
        db.close()


def _portfolio_value(universe: str, db: Session) -> float:
    """Sum up current market value of all closed P&L + starting capital."""
    closed = (
        db.query(PaperTrade)
        .filter(PaperTrade.universe == universe, PaperTrade.status == "closed")
        .all()
    )
    total_pnl = sum(p.pnl or 0.0 for p in closed)
    return STARTING_CAPITAL + total_pnl


def get_paper_portfolio(universe: str = "sp500") -> dict:
    """Return full paper trading portfolio state for the frontend."""
    db = SessionLocal()
    try:
        # Open positions with live prices
        open_pos = (
            db.query(PaperTrade)
            .filter(PaperTrade.universe == universe, PaperTrade.status == "open")
            .all()
        )
        positions = []
        live_pnl = 0.0
        for p in open_pos:
            px = _current_price(p.ticker)
            if px and p.entry_price and p.shares:
                unrealized = p.shares * (px - p.entry_price)
                ret_pct = (px - p.entry_price) / p.entry_price * 100
            else:
                unrealized, ret_pct = None, None
            if unrealized:
                live_pnl += unrealized
            positions.append({
                "ticker": p.ticker,
                "month": p.month,
                "score": p.score,
                "entry_price": p.entry_price,
                "current_price": px,
                "shares": p.shares,
                "unrealized_pnl": round(unrealized, 2) if unrealized is not None else None,
                "return_pct": round(ret_pct, 2) if ret_pct is not None else None,
            })

        # Monthly history (closed months)
        all_months: dict[str, dict] = {}
        closed_trades = (
            db.query(PaperTrade)
            .filter(PaperTrade.universe == universe, PaperTrade.status == "closed")
            .order_by(PaperTrade.month.asc())
            .all()
        )
        running = STARTING_CAPITAL
        for t in closed_trades:
            m = t.month
            if m not in all_months:
                all_months[m] = {"month": m, "trades": [], "month_pnl": 0.0}
            all_months[m]["trades"].append(t.ticker)
            all_months[m]["month_pnl"] += t.pnl or 0.0

        monthly_history = []
        running = STARTING_CAPITAL
        for m_data in sorted(all_months.values(), key=lambda x: x["month"]):
            running += m_data["month_pnl"]
            monthly_history.append({
                "month": m_data["month"],
                "picks": m_data["trades"],
                "month_pnl": round(m_data["month_pnl"], 2),
                "portfolio_value": round(running, 2),
            })

        realized_pnl = _portfolio_value(universe, db) - STARTING_CAPITAL
        current_value = STARTING_CAPITAL + realized_pnl + live_pnl

        return {
            "universe": universe,
            "starting_capital": STARTING_CAPITAL,
            "current_value": round(current_value, 2),
            "total_return_pct": round((current_value - STARTING_CAPITAL) / STARTING_CAPITAL * 100, 2),
            "open_positions": positions,
            "monthly_history": monthly_history,
        }
    finally:
        db.close()
