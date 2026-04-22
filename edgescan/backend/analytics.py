"""analytics.py — Sector heatmap and rebalancing diff logic."""

import json
from datetime import datetime, timedelta
from sqlalchemy import text
from database import SessionLocal
from models import ScanResult


def get_sector_heatmap(n_months: int = 6) -> dict:
    """
    Compute average composite score per sector per month from scan_results.
    Returns last n_months of data.
    """
    db = SessionLocal()
    try:
        # Get recent scans grouped by month + sector
        rows = db.execute(text("""
            SELECT
                strftime('%Y-%m', scanned_at) AS month,
                sector,
                AVG(score) AS avg_score,
                COUNT(*) AS stock_count
            FROM scan_results
            WHERE sector IS NOT NULL AND sector != ''
            GROUP BY month, sector
            ORDER BY month DESC, avg_score DESC
        """)).fetchall()

        # If PostgreSQL (no strftime), use to_char
        if not rows:
            rows = db.execute(text("""
                SELECT
                    TO_CHAR(scanned_at, 'YYYY-MM') AS month,
                    sector,
                    AVG(score) AS avg_score,
                    COUNT(*) AS stock_count
                FROM scan_results
                WHERE sector IS NOT NULL AND sector != ''
                GROUP BY TO_CHAR(scanned_at, 'YYYY-MM'), sector
                ORDER BY TO_CHAR(scanned_at, 'YYYY-MM') DESC, AVG(score) DESC
            """)).fetchall()

        # Build structure
        all_months = sorted(set(r[0] for r in rows), reverse=False)[-n_months:]
        sectors_data: dict[str, dict] = {}

        for row in rows:
            month, sector, avg_score, stock_count = row[0], row[1], float(row[2]), int(row[3])
            if month not in all_months:
                continue
            if sector not in sectors_data:
                sectors_data[sector] = {"sector": sector, "monthly_scores": {}, "stock_count": stock_count}
            sectors_data[sector]["monthly_scores"][month] = round(avg_score, 1)
            sectors_data[sector]["stock_count"] = stock_count

        # Compute avg score per sector
        for s in sectors_data.values():
            scores = list(s["monthly_scores"].values())
            s["avg_score"] = round(sum(scores) / len(scores), 1) if scores else 0

        return {
            "months": all_months,
            "sectors": sorted(sectors_data.values(), key=lambda x: x["avg_score"], reverse=True)
        }
    except Exception as e:
        # Fallback: try PostgreSQL syntax directly
        db2 = SessionLocal()
        try:
            rows2 = db2.execute(text("""
                SELECT
                    TO_CHAR(scanned_at, 'YYYY-MM') AS month,
                    sector,
                    AVG(score) AS avg_score,
                    COUNT(*) AS stock_count
                FROM scan_results
                WHERE sector IS NOT NULL AND sector != ''
                GROUP BY TO_CHAR(scanned_at, 'YYYY-MM'), sector
                ORDER BY TO_CHAR(scanned_at, 'YYYY-MM') DESC, AVG(score) DESC
            """)).fetchall()
            all_months2 = sorted(set(r[0] for r in rows2), reverse=False)[-n_months:]
            sectors_data2: dict[str, dict] = {}
            for row in rows2:
                month, sector, avg_score, stock_count = row[0], row[1], float(row[2]), int(row[3])
                if month not in all_months2:
                    continue
                if sector not in sectors_data2:
                    sectors_data2[sector] = {"sector": sector, "monthly_scores": {}, "stock_count": stock_count}
                sectors_data2[sector]["monthly_scores"][month] = round(avg_score, 1)
            for s in sectors_data2.values():
                scores = list(s["monthly_scores"].values())
                s["avg_score"] = round(sum(scores) / len(scores), 1) if scores else 0
            return {
                "months": all_months2,
                "sectors": sorted(sectors_data2.values(), key=lambda x: x["avg_score"], reverse=True)
            }
        finally:
            db2.close()
    finally:
        db.close()


def get_rebalance_suggestions(universe: str = "sp500") -> dict:
    """
    Compare current top-3 picks to last month's top-3.
    Returns what to buy, sell, and hold.
    """
    db = SessionLocal()
    try:
        from datetime import date
        today = date.today()
        month_str = today.strftime("%Y-%m")

        # Get last month string
        if today.month == 1:
            prev_month = f"{today.year - 1}-12"
        else:
            prev_month = f"{today.year}-{today.month - 1:02d}"

        def top3_for_period(start_dt, end_dt):
            rows = db.execute(text("""
                SELECT ticker, score, sector, current_price, name
                FROM scan_results
                WHERE scanned_at >= :start AND scanned_at < :end
                ORDER BY score DESC
                LIMIT 3
            """), {"start": start_dt, "end": end_dt}).fetchall()
            return [{"ticker": r[0], "score": r[1], "sector": r[2], "current_price": r[3], "name": r[4]} for r in rows]

        from datetime import datetime
        # This month: last 2 days of scans
        this_month_start = datetime.utcnow() - timedelta(days=2)
        this_month_end = datetime.utcnow() + timedelta(days=1)

        # Last month: scans from prev_month
        prev_month_start = datetime(today.year if today.month > 1 else today.year - 1,
                                    today.month - 1 if today.month > 1 else 12, 1)
        prev_month_end = datetime(today.year, today.month, 1)

        current_picks = top3_for_period(this_month_start, this_month_end)
        prev_picks = top3_for_period(prev_month_start, prev_month_end)

        current_tickers = {p["ticker"] for p in current_picks}
        prev_tickers = {p["ticker"] for p in prev_picks}

        to_buy = [t for t in current_tickers if t not in prev_tickers]
        to_sell = [t for t in prev_tickers if t not in current_tickers]
        to_hold = [t for t in current_tickers if t in prev_tickers]

        alloc = 6000.0 / max(len(current_picks), 1)

        return {
            "month": month_str,
            "universe": universe,
            "top_picks": current_picks,
            "previous_picks": prev_picks,
            "to_buy": to_buy,
            "to_sell": to_sell,
            "to_hold": to_hold,
            "alloc_per_stock": round(alloc, 2),
        }
    finally:
        db.close()
