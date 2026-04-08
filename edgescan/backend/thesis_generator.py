"""
thesis_generator.py — Claude API integration for EdgeScan "Why now" thesis.

Generates a 2-3 sentence equity research thesis per stock.
Caches in DB; only regenerates when composite score shifts >5 pts.
Gracefully degrades to a rule-based fallback if ANTHROPIC_API_KEY is absent.
"""

import os
from typing import Optional

from sqlalchemy.orm import Session
from models import ThesisCache


SCORE_REGEN_THRESHOLD = 5  # regenerate thesis if score changes by more than this


def generate_thesis(
    ticker: str,
    metrics: dict,
    signals: dict,
    current_score: int,
    db: Session,
) -> str:
    """
    Return a thesis string for the given ticker.
    Checks the cache first; calls Claude API only when needed.
    """
    # Check cache
    cached = db.query(ThesisCache).filter(ThesisCache.ticker == ticker).first()
    if cached:
        score_delta = abs((cached.score_at_generation or 0) - current_score)
        if score_delta <= SCORE_REGEN_THRESHOLD:
            return cached.thesis_text

    # Generate fresh thesis
    thesis = _call_claude(ticker, metrics, signals) or _rule_based_thesis(ticker, metrics, signals)

    # Upsert cache
    if cached:
        cached.thesis_text = thesis
        cached.score_at_generation = current_score
        from datetime import datetime
        cached.generated_at = datetime.utcnow()
    else:
        cached = ThesisCache(
            ticker=ticker,
            thesis_text=thesis,
            score_at_generation=current_score,
        )
        db.add(cached)
    db.commit()

    return thesis


def _call_claude(ticker: str, metrics: dict, signals: dict) -> Optional[str]:
    """Call Anthropic Claude API. Returns None if API key is missing or call fails."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        recent_catalyst = metrics.get("recent_catalyst", "None")
        fwd_pe = f"{metrics['fwd_pe']:.1f}" if metrics.get("fwd_pe") else "N/A"
        sector_pe = f"{metrics.get('sector_pe', 20.0):.1f}"

        prompt = f"""You are a sharp equity research analyst. Write a 2-3 sentence "Why now" thesis \
for {ticker} as a 1-2 month trade idea. Be specific — reference actual numbers. \
Do not use generic language. Focus on what changed recently that creates the entry point.

Data:
- Revenue growth YoY: {metrics.get('rev_growth', 0):.1f}%
- EPS growth YoY: {metrics.get('eps_growth', 0):.1f}%
- Forward P/E: {fwd_pe}x vs sector median {sector_pe}x
- FCF yield: {metrics.get('fcf_yield', 0):.1f}%
- ROE: {metrics.get('roe', 0):.1f}%
- Stock vs 52W high: {signals.get('from_52w_high', 0):.1f}%
- MACD: {signals.get('macd_status', 'unknown')}
- RSI: {signals.get('rsi', 50)}
- vs 200MA: {signals.get('pct_above_200ma', 0):.1f}%
- Recent catalyst: {recent_catalyst}

Output: 2-3 sentences only. No preamble. No bullet points."""

        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()

    except Exception as e:
        print(f"  [thesis_generator] Claude API call failed for {ticker}: {e}")
        return None


def _rule_based_thesis(ticker: str, metrics: dict, signals: dict) -> str:
    """
    Deterministic fallback thesis using scored metrics.
    Used when ANTHROPIC_API_KEY is absent or the API call fails.
    """
    parts = []

    rev = metrics.get("rev_growth", 0)
    eps = metrics.get("eps_growth", 0)
    fwd_pe = metrics.get("fwd_pe")
    sector_pe = metrics.get("sector_pe", 20.0)
    fcf = metrics.get("fcf_yield", 0)
    rsi = signals.get("rsi", 50)
    macd = signals.get("macd_status", "")
    from_high = signals.get("from_52w_high", 0)
    pct_200ma = signals.get("pct_above_200ma", 0)

    # Growth sentence
    if rev > 15 and eps > 15:
        parts.append(
            f"{ticker} is delivering exceptional growth with revenue up {rev:.0f}% and EPS up {eps:.0f}% YoY, "
            f"well above the pace needed to justify current valuations."
        )
    elif rev > 5 or eps > 5:
        parts.append(
            f"{ticker} shows steady fundamental momentum with {rev:.0f}% revenue growth and {eps:.0f}% EPS growth YoY."
        )
    else:
        parts.append(f"{ticker} is in a low-growth phase with revenue up {rev:.0f}% and EPS up {eps:.0f}% YoY.")

    # Valuation sentence
    if fwd_pe and sector_pe and fwd_pe < sector_pe * 0.9:
        disc = round((1 - fwd_pe / sector_pe) * 100)
        parts.append(
            f"At {fwd_pe:.1f}x forward P/E — a {disc}% discount to the sector median of {sector_pe:.1f}x — "
            f"the stock offers a compelling valuation entry."
        )
    elif fcf > 4:
        parts.append(
            f"A {fcf:.1f}% free cash flow yield provides a durable margin of safety at current prices."
        )

    # Technical entry sentence
    if macd == "bullish_crossover" and 35 <= rsi <= 65:
        parts.append(
            f"Technically, a MACD bullish crossover with RSI at {rsi:.0f} signals improving near-term momentum "
            f"without overbought conditions."
        )
    elif abs(from_high) >= 15 and pct_200ma > 0:
        parts.append(
            f"The stock is {abs(from_high):.0f}% off its 52-week high while holding above the 200-day MA, "
            f"offering a reset entry within an intact uptrend."
        )
    elif macd == "above_signal":
        parts.append(
            f"MACD remains above its signal line, and RSI at {rsi:.0f} leaves room for further upside "
            f"before reaching overbought territory."
        )

    return " ".join(parts) if parts else (
        f"{ticker} warrants attention based on its current composite score; "
        f"monitor for a technical confirmation before entering."
    )
