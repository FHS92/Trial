# EdgeScan — S&P 500 Stock Scanner

Composite fundamental + technical scoring for all 500 S&P 500 stocks.  
Surfaces the top 10 buy opportunities with AI-generated "Why now" theses and 2-month price targets.

---

## Quick start (Docker — recommended)

```bash
cd edgescan

# 1. Copy and fill in your API key
cp backend/.env.example backend/.env
# → set ANTHROPIC_API_KEY=sk-ant-...

# 2. Start everything
docker compose up --build
```

| Service   | URL                         |
|-----------|-----------------------------|
| Frontend  | http://localhost:3000       |
| API       | http://localhost:8000       |
| API docs  | http://localhost:8000/docs  |

---

## Quick start (local, no Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in ANTHROPIC_API_KEY

# Start API (uses SQLite locally — no Postgres needed)
uvicorn main:app --reload --port 8000

# In a second terminal — run the scheduler
python scheduler.py
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev   # → http://localhost:3000
```

---

## Environment variables

| Variable              | Required | Description                                      |
|-----------------------|----------|--------------------------------------------------|
| `ANTHROPIC_API_KEY`   | Yes      | Enables AI "Why now" thesis generation           |
| `DATABASE_URL`        | No       | PostgreSQL URL. Defaults to `sqlite:///./edgescan.db` |
| `SCAN_SECRET`         | No       | Auth token for `POST /api/scan/trigger`          |
| `SCAN_BATCH_SIZE`     | No       | Tickers per batch (default 50)                   |
| `BATCH_DELAY_SECONDS` | No       | Sleep between batches (default 2.0)              |
| `NEXT_PUBLIC_API_URL` | No       | Backend URL for frontend (default localhost:8000)|

---

## Architecture

```
edgescan/
├── backend/
│   ├── main.py            FastAPI app — 6 REST endpoints
│   ├── scanner.py         Scoring engine (fundamental 60pt + technical 40pt)
│   ├── data_fetcher.py    yfinance wrapper + S&P 500 ticker list
│   ├── technicals.py      pandas-ta: RSI, MACD, MA, volume
│   ├── thesis_generator.py  Claude API + rule-based fallback
│   ├── scheduler.py       APScheduler — 6am/12pm/6pm ET scans
│   ├── models.py          SQLAlchemy ORM (scan_results, price_history, thesis_cache)
│   ├── database.py        Engine setup (PostgreSQL or SQLite)
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx              Dashboard — top-10 ranked list
│   │   ├── stock/[ticker]/       Stock detail page
│   │   ├── search/               Real-time ticker search
│   │   └── watchlist/            localStorage watchlist
│   ├── components/
│   │   ├── ScoreRing.tsx         Circular SVG score indicator
│   │   ├── StockRow.tsx          Dashboard list row
│   │   ├── DetailPanel.tsx       Full stock detail panel
│   │   ├── PriceChart.tsx        Recharts chart + 50/200 MA
│   │   ├── MetricsGrid.tsx       3×3 fundamentals grid
│   │   ├── SignalRow.tsx         Technical signal with dot
│   │   ├── MarketStrip.tsx       SPX / VIX / 10Y live chips
│   │   └── Sparkline.tsx         7-day mini chart
│   └── lib/
│       ├── types.ts              TypeScript interfaces
│       └── api.ts                API client
│
└── docker-compose.yml    db + backend + frontend + scheduler
```

## Scoring model

| Component          | Max pts | Key factors                              |
|--------------------|---------|------------------------------------------|
| Revenue growth     | 10      | >20% = 10, 10-20% = 7, 5-10% = 4 …     |
| EPS growth         | 10      | Same scale                               |
| FCF yield          |  8      | >6% = 8, 4-6% = 6 …                     |
| ROE                |  8      | >25% = 8, 15-25% = 6 …                  |
| Gross margin trend |  6      | Expanding QoQ = 6                        |
| Debt / Equity      |  6      | <0.3 = 6                                 |
| EPS revisions      |  6      | Raised = 6, flat = 3, cut = 0            |
| Fwd P/E vs sector  |  6      | Below median = 6                         |
| RSI (14d)          |  8      | 40-60 = 8 (ideal entry)                  |
| MACD               |  8      | Bullish crossover = 8                    |
| vs 200 MA          |  8      | 0-10% above = 8                          |
| Volume             |  6      | Up days on high vol = 6                  |
| 52W position       |  6      | 15-35% below high = 6                    |
| Earnings penalty   | -8      | Within 7 days = -8, within 14 = -4      |

**Total: 100 points.** Green ≥ 80 · Amber 60-79 · Red < 60

## API endpoints

| Method | Path                          | Description                        |
|--------|-------------------------------|------------------------------------|
| GET    | `/api/top-opportunities`      | Top 10 stocks from latest scan     |
| GET    | `/api/stock/{ticker}`         | Full detail + thesis for any ticker|
| GET    | `/api/stock/{ticker}/history` | OHLCV history (period param)       |
| GET    | `/api/search?q=`              | Ticker autocomplete                |
| GET    | `/api/market-pulse`           | SPX / VIX / 10Y (5-min cache)     |
| POST   | `/api/scan/trigger`           | Manual scan (X-Scan-Secret header) |
