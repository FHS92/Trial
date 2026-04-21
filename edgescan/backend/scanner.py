"""
scanner.py — EdgeScan composite scoring engine.

Scores each stock 0–100:
  Fundamental score: 60 pts max
  Technical score:   40 pts max (with earnings proximity penalty)

Also computes a 2-month price target as a weighted blend of:
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
    if pct > 20:   return 10
    if pct > 10:   return 7
    if pct > 5:    return 4
    if pct > 0:    return 2
    return 0


def _score_eps_growth(pct: float) -> int:
    if pct > 20:   return 10
    if pct > 10:   return 7
    if pct > 5:    return 4
    if pct > 0:    return 2
    return 0


def _score_fcf_yield(pct: float) -> int:
    if pct > 6:    return 8
    if pct > 4:    return 6
    if pct > 2:    return 4
    if pct > 0:    return 2
    return 0


def _score_roe(pct: float) -> int:
    if pct > 25:   return 8
    if pct > 15:   return 6
    if pct > 10:   return 4
    if pct > 5:    return 2
    return 0


def _score_gross_margin(pct: float) -> int:
    # Without QoQ quarterly data we use absolute level as a proxy.
    # >50% (high-quality business) = 6, 30-50% = 3, <30% = 0
    if pct > 50:   return 6
    if pct > 30:   return 3
    return 0


def _score_debt_equity(ratio: float) -> int:
    if ratio < 0.3:    return 6
    if ratio < 0.7:    return 4
    if ratio < 1.5:    return 2
    return 0


def _score_eps_revision(recommendation: str) -> int:
    # Use analyst recommendation as a proxy for EPS revision direction
    # (true revision data requires a paid data provider)
    rec = recommendation.lower()
    if rec in ("buy", "strong_buy", "strongbuy"):
        return 6
    if rec in ("hold", "neutral"):
        return 3
    return 0


def _score_fwd_pe_vs_sector(fwd_pe: Optional[float], sector_pe: float) -> int:
    if fwd_pe is None or fwd_pe <= 0:
        return 3  # neutral if missing
    if fwd_pe < sector_pe:
        return 6
    if fwd_pe <= sector_pe * 1.1:
        return 3
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
    if 0 <= pct_above <= 10:    return 8
    if 10 < pct_above <= 20:   return 4
    return 0  # below 200MA or very extended


def _score_volume(volume_status: str) -> int:
    if volume_status == "bullish":   return 6
    if volume_status == "neutral":   return 3
    return 0


def _score_distance_from_52w_high(from_high_pct: float) -> int:
    # Reward momentum: stocks near/at 52W high are in strong uptrends
    below = abs(from_high_pct)
    if below <= 3:    return 8   # near/at 52W high — breakout zone
    if below <= 10:   return 6   # strong trend, healthy pullback
    if below <= 20:   return 4   # moderate pullback
    if below <= 35:   return 2   # deeper correction
    return 0                     # >35% down — avoid


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
    if current_price is None or current_price <= 0:
        return None

    targets = []
    weights = []

    # (a) Analyst consensus — 40%
    if analyst_target and analyst_target > 0:
        targets.append(analyst_target)
        weights.append(0.40)

    # (b) Sector P/E re-rating — 30%
    # If stock is trading below sector median P/E, target is re-rating to median
    if fwd_pe and fwd_pe > 0 and sector_pe > 0:
        pe_target = current_price * (sector_pe / fwd_pe)
        targets.append(pe_target)
        weights.append(0.30)

    # (c) FCF yield implied value — 30%
    # If FCF yield > 0, normalize to a "fair" yield of 4%
    if fcf_yield > 0:
        fcf_target = current_price * (fcf_yield / 4.0)
        # Cap at 2x current price to avoid extreme outliers
        fcf_target = min(fcf_target, current_price * 2.0)
        targets.append(fcf_target)
        weights.append(0.30)

    if not targets:
        return None

    # Re-normalize weights
    total_weight = sum(weights)
    normalized = [w / total_weight for w in weights]
    blended = sum(t * w for t, w in zip(targets, normalized))

    # Cap upside at 35%
    max_target = current_price * 1.35
    return round(min(blended, max_target), 2)


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
    rev_pts    = _score_rev_growth(fundamentals["rev_growth"])
    eps_pts    = _score_eps_growth(fundamentals["eps_growth"])
    fcf_pts    = _score_fcf_yield(fundamentals["fcf_yield"])
    roe_pts    = _score_roe(fundamentals["roe"])
    margin_pts = _score_gross_margin(fundamentals["gross_margin"])
    de_pts     = _score_debt_equity(fundamentals["debt_to_equity"])
    rev_est_pts = _score_eps_revision(fundamentals["recommendation"])
    pe_pts     = _score_fwd_pe_vs_sector(fundamentals["fwd_pe"], fundamentals["sector_pe"])

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
    rsi_pts    = _score_rsi(signals["rsi"])
    macd_pts   = _score_macd(signals["macd_status"])
    ma_pts     = _score_price_vs_200ma(signals["pct_above_200ma"])
    obv_pts    = _score_obv_slope(signals["obv_slope_pct"])
    hi_pts     = _score_distance_from_52w_high(signals["from_52w_high"])
    roc_pts    = _score_roc_20(signals["roc_20"])
    adx_pts    = _score_adx(signals["adx"])
    rs_pts     = _score_relative_strength(rs_vs_spy)
    penalty    = _earnings_penalty(fundamentals["earnings_date"])

    t_score_raw = rsi_pts + macd_pts + ma_pts + obv_pts + hi_pts + roc_pts + adx_pts + rs_pts
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
        "price_target_2m": price_target,
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
            "obv_slope_pts": obv_pts,
            "high52w_pts": hi_pts,
            "roc20_pts": roc_pts,
            "adx_pts": adx_pts,
            "rel_strength_pts": rs_pts,
            "earnings_penalty": penalty,
        },
        "earnings_date": str(fundamentals["earnings_date"]) if fundamentals["earnings_date"] else None,
        "scanned_at": datetime.utcnow().isoformat(),
    }


def scan_tickers(tickers: list[str]) -> list[dict]:
    """Score a list of tickers and return results sorted by composite score."""
    results = []
    for ticker in tickers:
        try:
            result = score_stock(ticker)
            results.append(result)
        except Exception as e:
            print(f"  [scanner] Failed on {ticker}: {e}")
    results.sort(key=lambda r: r["score"], reverse=True)
    return results
