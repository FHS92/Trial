"""
scanner.py — EdgeScan composite scoring engine.

Scores each stock 0–100:
  Fundamental score: 60 pts max
  Technical score:   40 pts max (with earnings proximity penalty)

Fundamental factor weights (absolute thresholds — optimized):
  FCF yield:     12 pts  ← highest weight; cash generation is the cleanest signal
  ROE:           10 pts  ← capital efficiency
  Gross margin:  10 pts  ← pricing power / moat
  Rev growth:     8 pts  ← top-line momentum
  EPS growth:     8 pts  ← earnings quality
  D/E ratio:      6 pts  ← balance-sheet safety
  Analyst rec:    4 pts  ← sentiment overlay
  Fwd P/E:        2 pts  ← valuation sanity check

Also computes a 1-month price target as a weighted blend of:
  (a) Analyst consensus target — 40%
  (b) Sector P/E re-rating     — 30%
  (c) FCF-based intrinsic value — 30%
"""

import functools
from datetime import date, datetime
from typing import Optional

from data_fetcher import fetch_fundamentals, fetch_price_history
from technicals import compute_technicals


# ---------------------------------------------------------------------------
# Fundamental sub-scores
# ---------------------------------------------------------------------------

def _score_rev_growth(pct: float) -> int:
    if pct > 20:  return 8
    if pct > 10:  return 6
    if pct > 5:   return 4
    if pct > 0:   return 2
    return 0


def _score_eps_growth(pct: float) -> int:
    if pct > 25:  return 8
    if pct > 15:  return 6
    if pct > 5:   return 4
    if pct > 0:   return 2
    return 0


def _score_fcf_yield(pct: float) -> int:
    if pct > 8:    return 12
    if pct > 5:    return 10
    if pct > 3:    return 7
    if pct > 1.5:  return 4
    return 0


def _score_roe(pct: float) -> int:
    if pct > 25:  return 10
    if pct > 15:  return 8
    if pct > 10:  return 5
    if pct > 5:   return 2
    return 0


def _score_gross_margin(pct: float) -> int:
    if pct > 50:  return 10
    if pct > 35:  return 8
    if pct > 20:  return 5
    if pct > 10:  return 2
    return 0


def _score_debt_equity(ratio: float) -> int:
    if ratio < 0.3:  return 6
    if ratio < 0.7:  return 5
    if ratio < 1.5:  return 3
    if ratio < 3.0:  return 1
    return 0


def _score_eps_revision(recommendation: str) -> int:
    rec = recommendation.lower()
    if rec in ("buy", "strong_buy", "strongbuy"):
        return 4
    if rec in ("hold", "neutral"):
        return 2
    return 0


def _score_fwd_pe_vs_sector(fwd_pe: Optional[float], sector_pe: float) -> int:
    if fwd_pe is None or fwd_pe <= 0:
        return 1  # neutral if missing
    if fwd_pe < sector_pe * 0.85:
        return 2
    if fwd_pe < sector_pe:
        return 1
    return 0


# ---------------------------------------------------------------------------
# Technical sub-scores
# ---------------------------------------------------------------------------

def _score_rsi(rsi: float) -> int:
    if 40 <= rsi <= 60:   return 8
    if 30 <= rsi < 40 or 60 < rsi <= 70:  return 4
    return 0


def _score_macd(macd_status: str) -> int:
    if macd_status == "bullish_crossover":  return 8
    if macd_status == "above_signal":       return 4
    return 0


def _score_price_vs_200ma(pct_above: float) -> int:
    if 0 <= pct_above <= 10:   return 8
    if 10 < pct_above <= 20:   return 4
    return 0  # below 200MA or very extended


def _score_volume(volume_status: str) -> int:
    if volume_status == "bullish":   return 6
    if volume_status == "neutral":   return 3
    return 0


def _score_distance_from_52w_high(from_high_pct: float) -> int:
    below = abs(from_high_pct)
    if 15 <= below <= 35:  return 6
    if 5 <= below < 15:    return 4
    if below < 5:          return 2  # near the high — potentially extended
    return 0  # >35% below — may be in trouble


def _score_obv_slope(obv_slope_pct: float) -> int:
    if obv_slope_pct > 3:   return 6
    if obv_slope_pct > 0:   return 3
    return 0


def _score_roc_20(roc: float) -> int:
    if roc > 15:    return 6
    if roc > 5:     return 4
    if roc > 0:     return 2
    return 0


def _score_adx(adx: float) -> int:
    if adx > 30:    return 6
    if adx > 20:    return 3
    return 0


DEFENSIVE_SECTORS = {"Utilities", "Real Estate", "Consumer Defensive"}

def _score_sector_momentum(sector: str, adx: float) -> int:
    """Penalise defensive-sector stocks that lack trend strength.
    Utilities/REITs/Staples with ADX < 20 are slow drifters, not momentum plays."""
    if sector in DEFENSIVE_SECTORS and adx < 20:
        return -8
    return 0


def _score_relative_strength(rs_vs_spy: float) -> int:
    # rs_vs_spy = stock_3m_return − spy_3m_return (percentage points)
    if rs_vs_spy > 10:  return 8
    if rs_vs_spy > 3:   return 5
    if rs_vs_spy > 0:   return 2
    return 0


@functools.lru_cache(maxsize=1)
def _spy_3m_return_cached(today_str: str) -> float:
    """SPY 3-month return, cached once per day to avoid repeated downloads."""
    try:
        spy_df = fetch_price_history("SPY", period="6mo")
        if spy_df is None or len(spy_df) < 63:
            return 0.0
        c = spy_df["Close"].squeeze().astype(float)
        return float((c.iloc[-1] / c.iloc[-63] - 1) * 100)
    except Exception:
        return 0.0


def _earnings_penalty(earnings_date) -> int:
    if earnings_date is None:
        return 0
    try:
        if isinstance(earnings_date, datetime):
            earnings_date = earnings_date.date()
        days_away = (earnings_date - date.today()).days
        if 0 <= days_away <= 7:   return -8
        if 0 <= days_away <= 14:  return -4
    except Exception:
        pass
    return 0


# ---------------------------------------------------------------------------
# Price target
# ---------------------------------------------------------------------------

def _compute_price_target(
    current_price: float,
    analyst_target: Optional[float],
    fwd_pe: Optional[float],
    sector_pe: float,
    fcf_yield: float,
) -> Optional[float]:
    """
    1-month price target — three components, all scaled to a 1-month horizon.

    (a) Analyst 12-month consensus: scale to 1 month by taking 1/12 of the gap.
    (b) Sector P/E re-rating: momentum stocks re-rate faster; use 1/6 of gap.
    (c) FCF yield fair-value: same fast-reversion assumption, 1/6 of gap.

    Upside capped at 12% (aggressive but realistic for a single month).
    """
    if current_price is None or current_price <= 0:
        return None

    targets_1m = []
    weights = []

    # (a) Analyst consensus (12-month) → scale to 1 month
    if analyst_target and analyst_target > 0:
        gap = analyst_target - current_price
        t1m = current_price + gap / 12.0
        targets_1m.append(t1m)
        weights.append(0.40)

    # (b) Sector P/E re-rating → 1/6 of gap (momentum re-rates faster than mean)
    if fwd_pe and fwd_pe > 0 and sector_pe > 0:
        pe_fair = current_price * (sector_pe / fwd_pe)
        t1m = current_price + (pe_fair - current_price) / 6.0
        targets_1m.append(t1m)
        weights.append(0.30)

    # (c) FCF yield implied value → 1/6 of gap to a 4% fair-yield price
    if fcf_yield > 0:
        fcf_fair = current_price * (fcf_yield / 4.0)
        fcf_fair = min(fcf_fair, current_price * 2.0)
        t1m = current_price + (fcf_fair - current_price) / 6.0
        targets_1m.append(t1m)
        weights.append(0.30)

    if not targets_1m:
        return None

    total_weight = sum(weights)
    normalized = [w / total_weight for w in weights]
    blended = sum(t * w for t, w in zip(targets_1m, normalized))

    # Cap at ±12% for a 1-month horizon
    blended = max(blended, current_price * 0.88)
    blended = min(blended, current_price * 1.12)
    return round(blended, 2)


# ---------------------------------------------------------------------------
# Main scoring function
# ---------------------------------------------------------------------------

def score_stock(ticker: str) -> dict:
    """
    Fetch data and compute the composite EdgeScan score for a single ticker.
    Returns a rich dict ready for API responses and DB storage.
    """
    ticker = ticker.upper().strip()
    print(f"  Scoring {ticker}...")

    # --- Fetch data ---
    fundamentals = fetch_fundamentals(ticker)
    price_df = fetch_price_history(ticker, period="1y")
    signals = compute_technicals(price_df)

    # Use technical price if fundamentals price is missing
    current_price = fundamentals.get("current_price") or signals.get("current_price")

    # ---- Fundamental score (60 pts max) ----
    rev_pts     = _score_rev_growth(fundamentals["rev_growth"])
    eps_pts     = _score_eps_growth(fundamentals["eps_growth"])
    fcf_pts     = _score_fcf_yield(fundamentals["fcf_yield"])
    roe_pts     = _score_roe(fundamentals["roe"])
    margin_pts  = _score_gross_margin(fundamentals["gross_margin"])
    de_pts      = _score_debt_equity(fundamentals["debt_to_equity"])
    rev_est_pts = _score_eps_revision(fundamentals["recommendation"])
    pe_pts      = _score_fwd_pe_vs_sector(fundamentals["fwd_pe"], fundamentals["sector_pe"])

    f_score = rev_pts + eps_pts + fcf_pts + roe_pts + margin_pts + de_pts + rev_est_pts + pe_pts

    # ---- Relative strength vs SPY (3-month) ----
    spy_3m = _spy_3m_return_cached(str(date.today()))
    if len(price_df) >= 63:
        stock_close_s = price_df["Close"].squeeze().astype(float)
        stock_3m = float((stock_close_s.iloc[-1] / stock_close_s.iloc[-63] - 1) * 100)
    else:
        stock_3m = 0.0
    rs_vs_spy = stock_3m - spy_3m

    # ---- Technical score ----
    rsi_pts  = _score_rsi(signals["rsi"])
    macd_pts = _score_macd(signals["macd_status"])
    ma_pts   = _score_price_vs_200ma(signals["pct_above_200ma"])
    vol_pts  = _score_volume(signals["volume_status"])
    hi_pts   = _score_distance_from_52w_high(signals["from_52w_high"])
    penalty  = _earnings_penalty(fundamentals["earnings_date"])

    t_score_raw = rsi_pts + macd_pts + ma_pts + vol_pts + hi_pts
    t_score = max(0, t_score_raw + penalty)

    composite = min(100, f_score + t_score)

    # ---- Price target ----
    price_target = _compute_price_target(
        current_price=current_price,
        analyst_target=fundamentals["analyst_target"],
        fwd_pe=fundamentals["fwd_pe"],
        sector_pe=fundamentals["sector_pe"],
        fcf_yield=fundamentals["fcf_yield"],
    )

    upside_pct = None
    if price_target and current_price and current_price > 0:
        upside_pct = round(((price_target - current_price) / current_price) * 100, 1)

    return {
        "ticker": ticker,
        "name": fundamentals["name"],
        "sector": fundamentals["sector"],
        "score": composite,
        "fundamental_score": f_score,
        "technical_score": t_score,
        "price_target_1m": price_target,
        "current_price": current_price,
        "upside_pct": upside_pct,
        "signals": {
            "rsi": signals["rsi"],
            "macd_status": signals["macd_status"],
            "pct_above_200ma": signals["pct_above_200ma"],
            "from_52w_high": signals["from_52w_high"],
            "volume_status": signals["volume_status"],
            "ma50": signals["ma50"],
            "ma200": signals["ma200"],
            "adx": signals["adx"],
            "obv_slope_pct": signals["obv_slope_pct"],
            "roc_20": signals["roc_20"],
            "rs_vs_spy": round(rs_vs_spy, 2),
        },
        "metrics": {
            "rev_growth": fundamentals["rev_growth"],
            "eps_growth": fundamentals["eps_growth"],
            "fcf_yield": fundamentals["fcf_yield"],
            "roe": fundamentals["roe"],
            "gross_margin": fundamentals["gross_margin"],
            "debt_to_equity": fundamentals["debt_to_equity"],
            "fwd_pe": fundamentals["fwd_pe"],
            "trailing_pe": fundamentals.get("trailing_pe"),
            "price_to_sales": fundamentals.get("price_to_sales"),
            "price_to_book": fundamentals.get("price_to_book"),
            "ev_ebitda": fundamentals.get("ev_ebitda"),
            "sector_pe": fundamentals["sector_pe"],
            "analyst_target": fundamentals["analyst_target"],
            "recent_catalyst": "Earnings upcoming" if fundamentals["earnings_date"] else "None",
        },
        "score_breakdown": {
            "rev_growth_pts": rev_pts,
            "eps_growth_pts": eps_pts,
            "fcf_yield_pts": fcf_pts,
            "roe_pts": roe_pts,
            "gross_margin_pts": margin_pts,
            "debt_equity_pts": de_pts,
            "eps_revision_pts": rev_est_pts,
            "fwd_pe_pts": pe_pts,
            "rsi_pts": rsi_pts,
            "macd_pts": macd_pts,
            "ma200_pts": ma_pts,
            "volume_pts": vol_pts,
            "high52w_pts": hi_pts,
            "earnings_penalty": penalty,
        },
        "earnings_date": str(fundamentals["earnings_date"]) if fundamentals["earnings_date"] else None,
        "scanned_at": datetime.utcnow().isoformat(),
    }


def scan_tickers(tickers: list[str]) -> list[dict]:
    """Score a list of tickers and return results sorted by composite score."""
    results, _ = scan_tickers_with_errors(tickers)
    return results


def scan_tickers_with_errors(tickers: list[str]) -> tuple[list[dict], dict[str, str]]:
    """Score a list of tickers; return (results, {ticker: error_str}) for diagnostics."""
    results = []
    errors = {}
    for ticker in tickers:
        try:
            result = score_stock(ticker)
            results.append(result)
        except Exception as e:
            err = str(e)[:200]
            errors[ticker] = err
            print(f"  [scanner] Failed on {ticker}: {err}")
    results.sort(key=lambda r: r["score"], reverse=True)
    return results, errors
