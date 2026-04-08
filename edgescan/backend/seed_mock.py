"""
seed_mock.py — Populate the local SQLite DB with realistic mock data.

Run once before starting the API:
    python seed_mock.py

Then start the API:
    uvicorn main:app --reload --port 8000
"""

import json, os, sys, random
from datetime import datetime, date, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite:///./edgescan.db")
sys.path.insert(0, os.path.dirname(__file__))

from database import init_db, SessionLocal
from models import ScanResult, PriceHistory, ThesisCache

# ─── Mock stock universe ──────────────────────────────────────────────────────

STOCKS = [
    dict(ticker="NVDA", name="NVIDIA Corporation",          sector="Technology",             score=88, f=54, t=34, price=875.40, target=1050.00, rev=122.4, eps=168.0, fcf=3.2,  roe=91.0, gm=74.6, de=0.41, fwd_pe=28.0, sp=35.0, rsi=54.0, macd="above_signal",      p200=12.0, from52=-8.0,  vol="bullish"),
    dict(ticker="META", name="Meta Platforms Inc.",          sector="Technology",             score=84, f=50, t=34, price=512.20, target=620.00, rev=27.3,  eps=73.0, fcf=7.8,  roe=36.0, gm=81.0, de=0.12, fwd_pe=22.0, sp=27.0, rsi=49.0, macd="above_signal",      p200=7.5,  from52=-11.0, vol="bullish"),
    dict(ticker="AAPL", name="Apple Inc.",                   sector="Technology",             score=79, f=46, t=33, price=182.30, target=210.00, rev=8.1,   eps=12.0, fcf=6.2,  roe=147.0,gm=44.5, de=1.99, fwd_pe=26.0, sp=28.0, rsi=52.0, macd="above_signal",      p200=4.2,  from52=-18.0, vol="neutral"),
    dict(ticker="JPM",  name="JPMorgan Chase & Co.",         sector="Financials",             score=77, f=48, t=29, price=198.70, target=230.00, rev=19.8,  eps=22.0, fcf=5.1,  roe=17.0, gm=62.0, de=1.20, fwd_pe=11.0, sp=12.5, rsi=58.0, macd="above_signal",      p200=9.1,  from52=-6.0,  vol="neutral"),
    dict(ticker="LLY",  name="Eli Lilly and Company",        sector="Healthcare",             score=75, f=44, t=31, price=762.80, target=900.00, rev=36.0,  eps=88.0, fcf=4.4,  roe=55.0, gm=79.2, de=0.85, fwd_pe=38.0, sp=42.0, rsi=43.0, macd="bullish_crossover", p200=3.8,  from52=-22.0, vol="bullish"),
    dict(ticker="MSFT", name="Microsoft Corporation",        sector="Technology",             score=73, f=45, t=28, price=415.50, target=480.00, rev=17.6,  eps=21.0, fcf=5.8,  roe=39.0, gm=69.8, de=0.31, fwd_pe=30.0, sp=28.0, rsi=61.0, macd="above_signal",      p200=14.0, from52=-4.0,  vol="neutral"),
    dict(ticker="V",    name="Visa Inc.",                    sector="Financials",             score=70, f=42, t=28, price=278.90, target=315.00, rev=10.4,  eps=14.0, fcf=8.2,  roe=44.0, gm=80.5, de=0.62, fwd_pe=24.0, sp=25.0, rsi=56.0, macd="above_signal",      p200=6.4,  from52=-12.0, vol="neutral"),
    dict(ticker="XOM",  name="Exxon Mobil Corporation",      sector="Energy",                 score=65, f=38, t=27, price=112.40, target=130.00, rev=-4.2,  eps=8.0,  fcf=6.9,  roe=15.0, gm=33.0, de=0.20, fwd_pe=13.0, sp=14.0, rsi=46.0, macd="above_signal",      p200=2.1,  from52=-19.0, vol="neutral"),
    dict(ticker="JNJ",  name="Johnson & Johnson",             sector="Healthcare",             score=61, f=37, t=24, price=152.60, target=170.00, rev=3.4,   eps=4.0,  fcf=5.5,  roe=22.0, gm=68.4, de=0.44, fwd_pe=15.0, sp=18.0, rsi=42.0, macd="below_signal",      p200=-2.0, from52=-24.0, vol="neutral"),
    dict(ticker="HD",   name="The Home Depot Inc.",           sector="Consumer Discretionary", score=58, f=34, t=24, price=346.20, target=385.00, rev=2.1,   eps=3.0,  fcf=4.8,  roe=None, gm=33.8, de=None, fwd_pe=21.0, sp=22.0, rsi=38.0, macd="below_signal",      p200=-5.0, from52=-28.0, vol="bearish"),
]

THESES = {
    "NVDA": "NVIDIA's data center revenue surged 409% YoY as hyperscalers ramp H100/H200 orders, yet the stock sits 8% below its 52-week high — a rare reset entry into the dominant AI infrastructure play. At 28x forward earnings versus a 35x sector median, the valuation discount is widening even as consensus estimates continue to rise.",
    "META": "Meta's 27% revenue acceleration combined with a 73% operating margin expansion signals the 'year of efficiency' is compounding into durable FCF growth. RSI at 49 and MACD holding above its signal line after a 11% pullback from highs offers a technically clean re-entry.",
    "AAPL": "Apple's services segment is now growing at 14% — four times the pace of hardware — driving gross margin expansion toward 46%. Trading 18% below its 52-week high at 26x forward earnings, the stock offers a valuation reset into a business generating $6.2% FCF yield.",
    "JPM":  "JPMorgan's net interest income beat by $800M last quarter as higher-for-longer rates extend the tailwind into 2025. At 11x forward P/E — a 12% discount to financial sector peers — the risk/reward skews favorably with ROE holding above 17%.",
    "LLY":  "Eli Lilly's GLP-1 franchise (Mounjaro + Zepbound) is tracking toward $20B in combined 2025 revenue, yet the stock is 22% below its recent peak following broader healthcare sector rotation. A fresh MACD bullish crossover with RSI at 43 signals the flush may be complete.",
    "MSFT": "Microsoft's Azure grew 29% in constant currency, accelerating for the second consecutive quarter on Copilot adoption. The 30x forward P/E is at a 6% discount to the sector median — unusual for a business with 70% gross margins and $5.8% FCF yield.",
    "V":    "Visa's cross-border volume grew 16% as international travel normalizes, adding an incremental revenue layer on top of its 80% gross margin base. At 24x forward earnings with RSI at 56, the setup is neither stretched nor broken — a steady accumulation zone.",
    "XOM":  "Exxon's Pioneer acquisition closes the FCF yield gap to 6.9%, underpinning the dividend and buyback program even at $70/barrel. The stock is 19% off its 52-week high while holding above the 200-day MA — energy stocks are pricing in a much worse macro than current fundamentals imply.",
    "JNJ":  "Johnson & Johnson's MedTech segment returned to 6% organic growth post-talc settlement clarity, removing the key overhang. At 15x forward P/E — a 17% discount to healthcare peers — the stock screens as the sector's cheapest large-cap with improving EPS revision momentum.",
    "HD":   "Home Depot's comparable sales have bottomed as housing turnover shows early signs of recovery with mortgage rates stabilizing. The stock is 28% off its 52-week high and approaching a technically oversold RSI of 38 — patient buyers are being rewarded with a 2.6% dividend yield.",
}

# ─── Build DB rows ────────────────────────────────────────────────────────────

def make_price_history(ticker: str, current_price: float, days: int = 365):
    """Generate a realistic-looking price series using a random walk."""
    rows = []
    price = current_price * random.uniform(0.70, 0.90)  # start lower ~1yr ago
    base = date.today() - timedelta(days=days)

    for i in range(days):
        d = base + timedelta(days=i)
        if d.weekday() >= 5:          # skip weekends
            continue
        change = random.gauss(0.0004, 0.013)  # ~10% annual vol
        price = max(price * (1 + change), 1.0)

        # Nudge toward current_price in last 20 days
        if i > days - 20:
            price = price * 0.97 + current_price * 0.03

        rows.append(PriceHistory(
            ticker=ticker,
            date=d,
            open=round(price * random.uniform(0.993, 1.002), 2),
            high=round(price * random.uniform(1.002, 1.015), 2),
            low=round(price * random.uniform(0.985, 0.998), 2),
            close=round(price, 2),
            volume=round(random.uniform(15e6, 80e6), 0),
        ))
    return rows


def seed():
    init_db()
    db = SessionLocal()

    # Wipe existing mock data
    db.query(ScanResult).delete()
    db.query(PriceHistory).delete()
    db.query(ThesisCache).delete()
    db.commit()

    now = datetime.utcnow()

    for s in STOCKS:
        upside = round((s["target"] / s["price"] - 1) * 100, 1)

        signals = dict(
            rsi=s["rsi"],
            macd_status=s["macd"],
            pct_above_200ma=s["p200"],
            from_52w_high=s["from52"],
            volume_status=s["vol"],
            ma50=round(s["price"] * 0.97, 2),
            ma200=round(s["price"] / (1 + s["p200"] / 100), 2),
        )
        metrics = dict(
            rev_growth=s["rev"],
            eps_growth=s["eps"],
            fcf_yield=s["fcf"],
            roe=s["roe"] or 0.0,
            gross_margin=s["gm"],
            debt_to_equity=s["de"] or 0.0,
            fwd_pe=s["fwd_pe"],
            sector_pe=s["sp"],
            analyst_target=s["target"],
            recent_catalyst="None",
        )

        db.add(ScanResult(
            ticker=s["ticker"],
            name=s["name"],
            sector=s["sector"],
            score=s["score"],
            fundamental_score=s["f"],
            technical_score=s["t"],
            current_price=s["price"],
            price_target_2m=s["target"],
            upside_pct=upside,
            signals_json=json.dumps(signals),
            metrics_json=json.dumps(metrics),
            score_breakdown_json=json.dumps({}),
            scanned_at=now,
        ))

        db.add(ThesisCache(
            ticker=s["ticker"],
            thesis_text=THESES[s["ticker"]],
            score_at_generation=s["score"],
            generated_at=now,
        ))

        # Price history
        random.seed(s["ticker"])  # deterministic per ticker
        for row in make_price_history(s["ticker"], s["price"]):
            db.add(row)

        print(f"  Seeded {s['ticker']:6s}  score={s['score']}  price=${s['price']:.2f}  upside={upside}%")

    db.commit()
    db.close()
    print(f"\nDone — {len(STOCKS)} stocks seeded into edgescan.db")
    print("Now run:  uvicorn main:app --reload --port 8000")


if __name__ == "__main__":
    seed()
