"""
backtest_engine.py — Core backtest logic for EdgeScan.

Strategy:
  - Universe  : top N stocks from SP500_TICKERS
  - Signal    : composite score = technical (5 indicators) + fundamental (EDGAR)
  - Technical : RSI, MACD, 200MA, directional volume, 52W-high distance
  - Fundamental: revenue growth, EPS growth, FCF yield, ROE, gross margin,
                 D/E ratio, trailing P/E vs dynamic sector median.
                 All sourced from SEC EDGAR filings (point-in-time, no
                 look-ahead bias). Cached in Neon after first fetch.
  - Entry     : close of first trading day of each month
  - Exit      : close of last trading day of same month
  - Sizing    : portfolio_value / n_valid_picks (equal weight, full rebalance)
  - Hold      : 1 or 3 months between full rebalances
  - Benchmark : SPY buy-and-hold from Jan 2020
"""

import warnings
from collections import defaultdict
from datetime import date, timedelta
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf

warnings.filterwarnings("ignore")

from data_fetcher import (
    SP500_TICKERS, get_universe_tickers,
    SECTOR_REV_GROWTH_MEDIANS,
    SECTOR_EPS_GROWTH_MEDIANS,
    SECTOR_FCF_YIELD_MEDIANS,
    SECTOR_EBITDA_MARGIN_MEDIANS,
    SECTOR_DEBT_COVERAGE_MEDIANS,
)
from scanner import (
    _score_distance_from_52w_high,
    _score_macd,
    _score_price_vs_200ma,
    _score_rsi,
    _score_volume,
    _score_ev_ebitda_vs_sector,
    _score_eps_revision,
    _score_fwd_pe_vs_sector,
)
from technicals import _ema, _rsi, _sma


# ---------------------------------------------------------------------------
# Backtest-local fundamental scoring (sector-relative where data permits)
# ---------------------------------------------------------------------------

def _bt_score_rev_growth(pct: float, sector: str) -> int:
    median = SECTOR_REV_GROWTH_MEDIANS.get(sector, SECTOR_REV_GROWTH_MEDIANS["Unknown"])
    diff = pct - median
    if diff > 10:  return 10
    if diff > 5:   return 7
    if diff > 0:   return 4
    if diff > -5:  return 2
    return 0


def _bt_score_eps_growth(pct: float, sector: str) -> int:
    median = SECTOR_EPS_GROWTH_MEDIANS.get(sector, SECTOR_EPS_GROWTH_MEDIANS["Unknown"])
    diff = pct - median
    if diff > 10:  return 10
    if diff > 5:   return 7
    if diff > 0:   return 4
    if diff > -5:  return 2
    return 0


def _bt_score_fcf_yield(pct: float, sector: str) -> int:
    median = SECTOR_FCF_YIELD_MEDIANS.get(sector, SECTOR_FCF_YIELD_MEDIANS["Unknown"])
    diff = pct - median
    if diff > 3:   return 8
    if diff > 1:   return 6
    if diff > 0:   return 4
    if diff > -1:  return 2
    return 0


def _bt_score_ebitda_margin(gross_margin: float, sector: str) -> int:
    # Approximation: gross margin as proxy for EBITDA margin vs sector benchmark.
    # Gross margins run ~15-20 pts higher than EBITDA margins, so we offset the
    # sector EBITDA benchmarks upward to keep comparisons meaningful.
    sector_ebitda = SECTOR_EBITDA_MARGIN_MEDIANS.get(sector, SECTOR_EBITDA_MARGIN_MEDIANS["Unknown"])
    sector_gross_proxy = sector_ebitda + 18.0   # typical gross→EBITDA spread
    diff = gross_margin - sector_gross_proxy
    if diff > 10:  return 6
    if diff > 5:   return 5
    if diff > 0:   return 3
    if diff > -5:  return 1
    return 0


def _bt_score_debt_coverage(ocf: Optional[float], debt: Optional[float], sector: str) -> int:
    # OCF / total_debt as a proxy for EBITDA/debt coverage ratio.
    sector_median = SECTOR_DEBT_COVERAGE_MEDIANS.get(sector, SECTOR_DEBT_COVERAGE_MEDIANS["Unknown"])
    if debt is None or debt <= 0:
        return 6   # effectively debt-free
    if ocf is None or ocf <= 0:
        return 0
    coverage = ocf / debt
    if sector_median <= 0:
        return 3
    ratio = coverage / sector_median
    if ratio > 2.0:  return 6
    if ratio > 1.5:  return 5
    if ratio > 1.0:  return 3
    if ratio > 0.7:  return 1
    return 0

START = date(2020, 1, 1)
STARTING_CAPITAL = 6_000.0
PICKS = 3


# ---------------------------------------------------------------------------
# Price-series helpers
# ---------------------------------------------------------------------------

def _month_list() -> list[date]:
    today = date.today()
    months, d = [], date(START.year, START.month, 1)
    while True:
        next_m = date(d.year + (d.month // 12), (d.month % 12) + 1, 1)
        if (next_m - timedelta(days=1)) >= today:
            break
        months.append(d)
        d = next_m
    return months


def _to_series(x) -> pd.Series:
    if isinstance(x, pd.DataFrame):
        return x.iloc[:, 0]
    return x


def _px_on_or_after(s, d: date):
    s = _to_series(s)
    sub = s[s.index >= pd.Timestamp(d)]
    if not len(sub):
        return None
    val = sub.iloc[0]
    return float(val.iloc[0]) if isinstance(val, pd.Series) else float(val)


def _px_on_or_before(s, d: date):
    s = _to_series(s)
    sub = s[s.index <= pd.Timestamp(d)]
    if not len(sub):
        return None
    val = sub.iloc[-1]
    return float(val.iloc[0]) if isinstance(val, pd.Series) else float(val)


def _val_before(s: pd.Series, cutoff: pd.Timestamp) -> float:
    idx = s.index.searchsorted(cutoff, side="left") - 1
    if idx < 0:
        return np.nan
    v = s.iloc[idx]
    return float(v) if not pd.isna(v) else np.nan


# ---------------------------------------------------------------------------
# Technical indicators — precomputed once per stock
# ---------------------------------------------------------------------------

def _precompute_indicators(
    close: pd.Series,
    volume: pd.Series,
    high: pd.Series,
    low: pd.Series,
) -> dict | None:
    if len(close) < 50:
        return None

    rsi_s = _rsi(close, 14)

    macd_line      = _ema(close, 12) - _ema(close, 26)
    signal_s       = _ema(macd_line, 9)
    macd_above_s   = (macd_line >= signal_s)
    crossed_up_s   = macd_above_s & ~macd_above_s.shift(1).fillna(False)
    recent_cross_s = crossed_up_s.rolling(5, min_periods=1).sum() > 0

    ma200_s   = _sma(close, 200) if len(close) >= 200 else _sma(close, len(close))
    pct_200_s = (close - ma200_s) / ma200_s.replace(0, np.nan) * 100

    w52_high_s = high.rolling(252, min_periods=50).max()
    from_52w_s = (close - w52_high_s) / w52_high_s.replace(0, np.nan) * 100

    avg_vol_20    = volume.rolling(20, min_periods=10).mean()
    high_vol_day  = volume > avg_vol_20
    price_up      = close.diff() > 0
    up_hvol_s     = (price_up & high_vol_day).rolling(5, min_periods=1).sum()
    down_hvol_s   = (~price_up & high_vol_day).rolling(5, min_periods=1).sum()
    vol_status_s  = pd.Series(0.0, index=close.index)
    vol_status_s[up_hvol_s >= 2]   = 1.0
    vol_status_s[down_hvol_s >= 2] = -1.0

    return {
        "rsi":          rsi_s,
        "macd_above":   macd_above_s,
        "recent_cross": recent_cross_s,
        "pct_200ma":    pct_200_s,
        "from_52w":     from_52w_s,
        "vol_status":   vol_status_s,
        "close":        close,
    }


def _score_at_cutoff(ind: dict, cutoff: pd.Timestamp) -> float:
    rsi = _val_before(ind["rsi"], cutoff)
    if np.isnan(rsi):
        return 0.0

    macd_above   = bool(_val_before(ind["macd_above"],   cutoff))
    recent_cross = bool(_val_before(ind["recent_cross"], cutoff))
    macd_status  = "bullish_crossover" if recent_cross else ("above_signal" if macd_above else "below_signal")

    pct_200ma = _val_before(ind["pct_200ma"], cutoff)
    from_52w  = _val_before(ind["from_52w"],  cutoff)
    vol_raw   = _val_before(ind["vol_status"], cutoff)

    if np.isnan(pct_200ma): pct_200ma = 0.0
    if np.isnan(from_52w):  from_52w  = 0.0
    if np.isnan(vol_raw):   vol_raw   = 0.0

    volume_status = "bullish" if vol_raw >= 1.0 else ("bearish" if vol_raw <= -1.0 else "neutral")

    return float(
        _score_rsi(rsi)
        + _score_macd(macd_status)
        + _score_price_vs_200ma(pct_200ma)
        + _score_volume(volume_status)
        + _score_distance_from_52w_high(from_52w)
    )


# ---------------------------------------------------------------------------
# Fundamental data — EDGAR snapshots + scoring
# ---------------------------------------------------------------------------

def _load_or_fetch_snapshots(tickers: list[str]) -> dict[str, list[dict]]:
    """
    Load fundamental snapshots from Neon; fetch from EDGAR for any ticker
    not yet cached. Returns {ticker: [snapshot_dict, ...]}.
    Converts ORM objects to plain dicts before returning to avoid
    detached-state issues after the session closes.
    """
    from models import FundamentalSnapshot
    from database import SessionLocal
    from edgar_client import get_cik, fetch_company_facts, build_snapshots

    db = SessionLocal()
    try:
        existing = {
            row[0]
            for row in db.query(FundamentalSnapshot.ticker).distinct().all()
        }
        missing = [t for t in tickers if t not in existing]

        if missing:
            print(f"[backtest] Fetching EDGAR data for {len(missing)} tickers…")
            for ticker in missing:
                cik = get_cik(ticker)
                if not cik:
                    print(f"[backtest]   {ticker}: no CIK, skipped")
                    continue
                try:
                    sector = yf.Ticker(ticker).info.get("sector", "Unknown") or "Unknown"
                except Exception:
                    sector = "Unknown"

                facts = fetch_company_facts(cik)
                if not facts:
                    print(f"[backtest]   {ticker}: EDGAR fetch failed, skipped")
                    continue

                snaps = build_snapshots(ticker, facts, sector)
                inserted = 0
                for s in snaps:
                    try:
                        db.add(FundamentalSnapshot(
                            ticker=s["ticker"],
                            period_end=date.fromisoformat(s["period_end"]),
                            filed_at=date.fromisoformat(s["filed_at"]),
                            form_type=s["form_type"],
                            sector=s["sector"],
                            revenue=s["revenue"],
                            gross_profit=s["gross_profit"],
                            net_income=s["net_income"],
                            operating_cash_flow=s["operating_cash_flow"],
                            capital_expenditure=s["capital_expenditure"],
                            stockholders_equity=s["stockholders_equity"],
                            total_debt=s["total_debt"],
                            shares_outstanding=s["shares_outstanding"],
                        ))
                        inserted += 1
                    except Exception:
                        db.rollback()
                try:
                    db.commit()
                    print(f"[backtest]   {ticker}: {inserted} snapshots stored")
                except Exception as exc:
                    db.rollback()
                    print(f"[backtest]   {ticker}: commit failed — {exc}")

        rows = (
            db.query(FundamentalSnapshot)
            .filter(FundamentalSnapshot.ticker.in_(tickers))
            .all()
        )

        result: dict[str, list[dict]] = defaultdict(list)
        for row in rows:
            result[row.ticker].append({
                "period_end":          row.period_end,
                "filed_at":            row.filed_at,
                "form_type":           row.form_type,
                "sector":              row.sector,
                "revenue":             row.revenue,
                "gross_profit":        row.gross_profit,
                "net_income":          row.net_income,
                "operating_cash_flow": row.operating_cash_flow,
                "capital_expenditure": row.capital_expenditure,
                "stockholders_equity": row.stockholders_equity,
                "total_debt":          row.total_debt,
                "shares_outstanding":  row.shares_outstanding,
            })
        return dict(result)

    finally:
        db.close()


def _fund_metrics_at(
    snap_list: list[dict],
    cutoff: pd.Timestamp,
    close_s: pd.Series,
) -> dict:
    """
    Compute point-in-time fundamental metrics using only filings
    submitted at or before cutoff. Returns {} if no data is available.
    """
    cutoff_date = cutoff.date()
    filed = [s for s in snap_list if s["filed_at"] <= cutoff_date]
    if not filed:
        return {}

    # Annual 10-K rows sorted newest-first (flow metrics come from here)
    annual = sorted(
        [s for s in filed if s["form_type"] == "10-K" and s["revenue"] is not None],
        key=lambda s: s["filed_at"],
        reverse=True,
    )
    # All rows sorted newest-first (balance sheet uses most recent of any form)
    by_date = sorted(filed, key=lambda s: s["filed_at"], reverse=True)

    if not annual:
        return {}

    cur = annual[0]
    bs  = by_date[0]   # most recent balance sheet snapshot

    # Revenue growth (requires ≥2 annual filings)
    rev_growth = 0.0
    if len(annual) >= 2 and annual[1]["revenue"]:
        r0, r1 = cur["revenue"], annual[1]["revenue"]
        rev_growth = (r0 - r1) / abs(r1) * 100

    # Net income / EPS growth
    eps_growth = 0.0
    if len(annual) >= 2 and annual[1]["net_income"]:
        n1 = annual[1]["net_income"]
        if n1 != 0:
            eps_growth = ((cur["net_income"] or 0.0) - n1) / abs(n1) * 100

    # Gross margin
    gross_margin = 0.0
    if cur["gross_profit"] and cur["revenue"]:
        gross_margin = cur["gross_profit"] / cur["revenue"] * 100

    # FCF yield = (OCF − CapEx) / market_cap_at_cutoff
    fcf_yield = 0.0
    if cur["operating_cash_flow"] is not None and cur["capital_expenditure"] is not None:
        fcf    = cur["operating_cash_flow"] - cur["capital_expenditure"]
        price  = _val_before(close_s, cutoff)
        shares = bs["shares_outstanding"]
        if price and shares and price > 0 and shares > 0:
            fcf_yield = fcf / (price * shares) * 100

    eq   = bs["stockholders_equity"]
    debt = bs["total_debt"]
    ocf  = cur["operating_cash_flow"]

    # Trailing P/E = market_cap_at_cutoff / annual_net_income
    trailing_pe = None
    price  = _val_before(close_s, cutoff)
    shares = bs["shares_outstanding"]
    ni     = cur["net_income"]
    if price and shares and ni and price > 0 and shares > 0 and ni > 0:
        pe = (price * shares) / ni
        if 0 < pe <= 300:
            trailing_pe = pe

    return {
        "sector":       cur["sector"] or "Unknown",
        "rev_growth":   rev_growth,
        "eps_growth":   eps_growth,
        "gross_margin": gross_margin,
        "fcf_yield":    fcf_yield,
        "ocf":          ocf,
        "debt":         debt,
        "trailing_pe":  trailing_pe,
    }


def _score_trailing_pe(stock_pe: Optional[float], sector_median: Optional[float]) -> int:
    """Score P/E relative to dynamically-computed sector median for that month."""
    if not stock_pe or stock_pe <= 0 or not sector_median or sector_median <= 0:
        return 3  # neutral when data is absent
    if stock_pe < sector_median * 0.90:    # >10% below sector median = cheap
        return 6
    if stock_pe <= sector_median * 1.10:   # within ±10% of sector median
        return 3
    return 0                               # >10% above = expensive vs peers


def _fundamental_score(metrics: dict, sector_median_pe: Optional[float]) -> int:
    if not metrics:
        return 0
    sector = metrics.get("sector", "Unknown")
    return (
        _bt_score_rev_growth(metrics["rev_growth"], sector)
        + _bt_score_eps_growth(metrics["eps_growth"], sector)
        + _bt_score_fcf_yield(metrics["fcf_yield"], sector)
        + _score_ev_ebitda_vs_sector(None, 14.0)           # no historical EV/EBITDA data → neutral
        + _bt_score_ebitda_margin(metrics["gross_margin"], sector)
        + _bt_score_debt_coverage(metrics.get("ocf"), metrics.get("debt"), sector)
        + 3                                                 # neutral proxy for analyst rec
        + _score_trailing_pe(metrics["trailing_pe"], sector_median_pe)
    )


# ---------------------------------------------------------------------------
# Main backtest entry point
# ---------------------------------------------------------------------------

def run_backtest(n_stocks: int = 100, hold_months: int = 1, universe: str = "sp500") -> dict:
    tickers = get_universe_tickers(universe)[:n_stocks]
    months  = _month_list()

    dl_start = f"{START.year - 1}-01-01"
    raw = yf.download(tickers, start=dl_start, auto_adjust=True, progress=False, threads=True)

    if isinstance(raw.columns, pd.MultiIndex):
        close_all  = raw["Close"].ffill()
        volume_all = raw["Volume"].ffill()
        high_all   = raw["High"].ffill()
        low_all    = raw["Low"].ffill()
    else:
        close_all  = raw[["Close"]].ffill().rename(columns={"Close": tickers[0]})
        volume_all = raw[["Volume"]].ffill().rename(columns={"Volume": tickers[0]})
        high_all   = raw[["High"]].ffill().rename(columns={"High": tickers[0]})
        low_all    = raw[["Low"]].ffill().rename(columns={"Low": tickers[0]})

    available = [t for t in tickers if t in close_all.columns]

    # SPY benchmark
    spy_raw   = yf.download("SPY", start=dl_start, auto_adjust=True, progress=False)
    spy_close = _to_series(
        spy_raw["Close"].ffill() if "Close" in spy_raw.columns else spy_raw.iloc[:, 0].ffill()
    )
    spy_entry     = _px_on_or_after(spy_close, START)
    spy_today     = float(spy_close.iloc[-1])
    spy_total_ret = (spy_today - spy_entry) / spy_entry
    spy_final     = STARTING_CAPITAL * (1 + spy_total_ret)

    # Precompute technical indicator series once per stock
    precomputed: dict[str, dict] = {}
    for t in available:
        ind = _precompute_indicators(
            close_all[t].dropna(),
            volume_all[t].dropna(),
            high_all[t].dropna(),
            low_all[t].dropna(),
        )
        if ind is not None:
            precomputed[t] = ind

    scored_tickers = list(precomputed.keys())

    # Load (or fetch from EDGAR) fundamental snapshots for all tickers
    print("[backtest] Loading fundamental snapshots…")
    fund_snaps: dict[str, list[dict]] = {}
    try:
        fund_snaps = _load_or_fetch_snapshots(scored_tickers)
    except Exception as exc:
        print(f"[backtest] Fundamental data unavailable, using technical-only: {exc}")

    # Pass 1: score every month — technical + fundamental composite
    all_monthly_scores: list[dict[str, float]] = []
    for m in months:
        cutoff = pd.Timestamp(m)

        # Phase A: compute per-stock metrics + trailing PE
        month_metrics: dict[str, dict] = {}
        for t in scored_tickers:
            snaps = fund_snaps.get(t, [])
            month_metrics[t] = _fund_metrics_at(snaps, cutoff, close_all[t]) if snaps else {}

        # Phase B: sector median trailing PE from this month's universe
        sector_pes: dict[str, list[float]] = defaultdict(list)
        for t, m_data in month_metrics.items():
            pe     = m_data.get("trailing_pe")
            sector = m_data.get("sector", "Unknown")
            if pe and pe > 0:
                sector_pes[sector].append(pe)
        sector_median_pe: dict[str, float] = {
            s: float(np.median(pes)) for s, pes in sector_pes.items() if pes
        }

        # Phase C: composite = technical + fundamental
        scores: dict[str, float] = {}
        for t in scored_tickers:
            tech    = _score_at_cutoff(precomputed[t], cutoff)
            metrics = month_metrics[t]
            sec     = metrics.get("sector", "Unknown")
            fund    = _fundamental_score(metrics, sector_median_pe.get(sec))
            composite = tech + fund
            if composite > 0:
                scores[t] = composite

        all_monthly_scores.append(scores)

    # Pass 2: simulate — full equal-weight rebalance every hold_months
    portfolio_value = STARTING_CAPITAL
    monthly_results: list[dict] = []
    held_positions: dict[str, float] = {}
    held_scores:    dict[str, float] = {}

    for i, m in enumerate(months):
        is_rebal  = (i % hold_months == 0)
        next_m    = date(m.year + (m.month // 12), (m.month % 12) + 1, 1)
        month_end = next_m - timedelta(days=1)

        if is_rebal:
            scores = all_monthly_scores[i]
            if len(scores) >= PICKS:
                top3 = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:PICKS]
                held_scores = {t: s for t, s in top3}

                valid_entries: dict[str, float] = {}
                for t, _ in top3:
                    ep = _px_on_or_after(close_all[t], m)
                    if ep and ep > 0:
                        valid_entries[t] = ep

                if valid_entries:
                    alloc = portfolio_value / len(valid_entries)
                    held_positions = {t: alloc / ep for t, ep in valid_entries.items()}
                else:
                    held_positions = {}
            else:
                held_positions = {}

        if not held_positions:
            continue

        month_pnl = 0.0
        holdings: list[dict] = []

        for t, shares in held_positions.items():
            if t not in close_all.columns:
                continue
            ep = _px_on_or_after(close_all[t], m)
            xp = _px_on_or_before(close_all[t], month_end)
            if not ep or not xp or ep <= 0 or shares <= 0:
                continue
            pnl = shares * (xp - ep)
            ret = (xp - ep) / ep * 100
            month_pnl += pnl
            holdings.append({
                "ticker":     t,
                "score":      round(held_scores.get(t, 0), 0),
                "entry":      round(ep, 2),
                "exit":       round(xp, 2),
                "return_pct": round(ret, 2),
                "pnl":        round(pnl, 2),
            })

        if not holdings:
            continue

        port_ret        = month_pnl / portfolio_value * 100
        portfolio_value += month_pnl

        spy_ep  = _px_on_or_after(spy_close, m)
        spy_xp  = _px_on_or_before(spy_close, month_end)
        spy_ret = ((spy_xp - spy_ep) / spy_ep * 100) if (spy_ep and spy_xp) else None

        monthly_results.append({
            "month":           m.strftime("%Y-%m"),
            "holdings":        holdings,
            "port_return_pct": round(port_ret, 2),
            "portfolio_value": round(portfolio_value, 2),
            "spy_return_pct":  round(spy_ret, 2) if spy_ret is not None else None,
            "vs_spy_pct":      round(port_ret - spy_ret, 2) if spy_ret is not None else None,
        })

    if not monthly_results:
        return {"error": "No results computed"}

    df = pd.DataFrame(monthly_results)
    df["year"] = df["month"].apply(lambda s: int(s[:4]))
    yearly = []
    for year, grp in df.groupby("year"):
        first_val = grp["portfolio_value"].iloc[0] / (1 + grp["port_return_pct"].iloc[0] / 100)
        last_val  = grp["portfolio_value"].iloc[-1]
        yr_port   = (last_val - first_val) / first_val * 100
        spy_rets  = grp["spy_return_pct"].dropna()
        yr_spy    = ((1 + spy_rets / 100).prod() - 1) * 100
        yearly.append({
            "year":               int(year),
            "port_return_pct":    round(yr_port, 2),
            "spy_return_pct":     round(yr_spy, 2),
            "outperformance_pct": round(yr_port - yr_spy, 2),
            "end_value":          round(last_val, 2),
        })

    final_val  = monthly_results[-1]["portfolio_value"]
    total_ret  = (final_val - STARTING_CAPITAL) / STARTING_CAPITAL * 100
    winners    = sum(1 for r in monthly_results if r["port_return_pct"] > 0)
    beat_spy   = sum(1 for r in monthly_results if r["vs_spy_pct"] is not None and r["vs_spy_pct"] > 0)
    n          = len(monthly_results)

    return {
        "monthly": monthly_results,
        "yearly":  yearly,
        "summary": {
            "start_date":           months[0].strftime("%Y-%m"),
            "end_date":             months[-1].strftime("%Y-%m"),
            "n_stocks":             n_stocks,
            "stocks_available":     len(scored_tickers),
            "months_traded":        n,
            "starting_capital":     STARTING_CAPITAL,
            "final_value":          round(final_val, 2),
            "total_return_pct":     round(total_ret, 2),
            "spy_final_value":      round(spy_final, 2),
            "spy_total_return_pct": round(spy_total_ret * 100, 2),
            "outperformance_pct":   round(total_ret - spy_total_ret * 100, 2),
            "winning_months":       winners,
            "winning_months_pct":   round(winners / n * 100, 1),
            "beat_spy_months":      beat_spy,
            "beat_spy_months_pct":  round(beat_spy / n * 100, 1),
            "hold_months":          hold_months,
        },
    }
