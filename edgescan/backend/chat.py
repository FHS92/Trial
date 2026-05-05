"""
chat.py — Natural language Q&A about EdgeScan stock scores powered by Claude.

Accepts a free-form question + optional ticker context.
Builds a rich context from the DB (latest scores, signals, metrics)
and asks Claude to answer concisely.
"""

import os
from typing import Optional
from anthropic import Anthropic

_api_key = os.getenv("ANTHROPIC_API_KEY", "")
client = Anthropic(api_key=_api_key) if _api_key else None

SYSTEM_PROMPT = """You are EdgeScan AI, an expert stock analysis assistant.
You have access to EdgeScan's composite scoring data for S&P 500 stocks.
Each stock is scored 0-100 combining:
- Technical score (max ~36 pts): RSI, MACD, 200MA position, directional volume, 52-week high distance
- Fundamental score (max ~60 pts): revenue growth, EPS growth, FCF yield, ROE, gross margin, D/E ratio, trailing P/E vs sector median

Answer questions concisely and factually based on the data provided.
If asked why a stock scores high/low, break down which components are driving it.
If asked for recommendations, remind the user this is for educational purposes only.
Keep responses under 200 words unless the user asks for detail."""


def answer_question(
    question: str,
    ticker: Optional[str],
    scan_context: Optional[dict],
    top_picks_context: Optional[list],
) -> str:
    """
    Answer a natural language question about EdgeScan data.

    Args:
        question: The user's question
        ticker: Optional specific ticker being asked about
        scan_context: Full scan result dict for the ticker (if any)
        top_picks_context: List of top 10 current picks (if relevant)
    """
    # Build context block
    context_parts = []

    if scan_context and ticker:
        sb = scan_context.get("score_breakdown", {})
        sig = scan_context.get("signals", {})
        met = scan_context.get("metrics", {})
        context_parts.append(f"""
STOCK DATA FOR {ticker}:
Composite Score: {scan_context.get('score')}/100
  Fundamental: {scan_context.get('fundamental_score')} pts
  Technical: {scan_context.get('technical_score')} pts

Score Breakdown:
  Revenue Growth pts: {sb.get('rev_growth_pts')}
  EPS Growth pts: {sb.get('eps_growth_pts')}
  FCF Yield pts: {sb.get('fcf_yield_pts')}
  ROE pts: {sb.get('roe_pts')}
  Gross Margin pts: {sb.get('gross_margin_pts')}
  D/E Ratio pts: {sb.get('debt_equity_pts')}
  EPS Revision pts: {sb.get('eps_revision_pts')}
  Fwd P/E pts: {sb.get('fwd_pe_pts')}
  RSI pts: {sb.get('rsi_pts')}
  MACD pts: {sb.get('macd_pts')}
  MA200 pts: {sb.get('ma200_pts')}
  Volume pts: {sb.get('volume_pts')}
  52W High pts: {sb.get('high52w_pts')}
  Earnings Penalty: {sb.get('earnings_penalty')}

Technical Signals:
  RSI: {sig.get('rsi')}
  MACD Status: {sig.get('macd_status')}
  % Above 200MA: {sig.get('pct_above_200ma')}%
  From 52W High: {sig.get('from_52w_high')}%
  Volume Status: {sig.get('volume_status')}

Fundamentals:
  Revenue Growth: {met.get('rev_growth')}%
  FCF Yield: {met.get('fcf_yield')}%
  ROE: {met.get('roe')}%
  Gross Margin: {met.get('gross_margin')}%
  D/E Ratio: {met.get('debt_to_equity')}
  Forward P/E: {met.get('fwd_pe')}
  Sector P/E: {met.get('sector_pe')}
  Analyst Target: ${met.get('analyst_target')}

Current Price: ${scan_context.get('current_price')}
Sector: {scan_context.get('sector')}
""")

    if top_picks_context:
        picks_str = "\n".join(
            f"  {i+1}. {p['ticker']} (Score: {p['score']}, Sector: {p.get('sector','?')})"
            for i, p in enumerate(top_picks_context[:10])
        )
        context_parts.append(f"CURRENT TOP PICKS:\n{picks_str}")

    context = "\n".join(context_parts) if context_parts else "No specific stock data provided."

    messages = [
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}"
        }
    ]

    if client is None:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured on the server.")

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    return response.content[0].text
