# EdgeScan — Current State (Phase 0 Audit)

**Prepared:** May 2026  
**Branch:** `claude/edgescan-v2-spec-79anU`  
**Purpose:** Baseline mapping before v2 revamp. Updated after each phase.

---

## Repository Layout

The repo contains **two independent projects**:

| Path | Project | Status |
|---|---|---|
| `/` (root) | **FactCanvas** — Gemini-powered infographic generator (Express + Vite) | Dormant; not EdgeScan |
| `edgescan/` | **EdgeScan** — S&P 500 composite scoring tool | Active development |

All v2 work targets `edgescan/`. The FactCanvas root is untouched.

---

## EdgeScan Directory Tree

```
edgescan/
├── backend/
│   ├── main.py               # FastAPI app — 2 388 lines, 40+ endpoints
│   ├── models.py             # SQLAlchemy ORM — 11 tables
│   ├── scanner.py            # Composite scoring engine (60 fundamental + 40 technical)
│   ├── data_fetcher.py       # yfinance wrapper + hardcoded SP500_TICKERS list
│   ├── technicals.py         # RSI, MACD, MA, volume, 52W indicators (pandas-ta)
│   ├── thesis_generator.py   # Claude API "Why Now" + rule-based fallback
│   ├── scheduler.py          # APScheduler — 3× daily at 6am/12pm/6pm ET
│   ├── chat.py               # Claude Q&A for natural-language stock questions
│   ├── paper_trading.py      # Monthly auto-rebalancing virtual portfolio
│   ├── analytics.py          # Sector heatmap + rebalance suggestions
│   ├── backtest_engine.py    # Historical strategy testing (1/2/3-month hold)
│   ├── edgar_client.py       # SEC EDGAR filing extraction
│   ├── database.py           # SQLAlchemy engine (SQLite dev / PostgreSQL prod)
│   ├── requirements.txt
│   ├── .env.example
│   └── docker-compose.yml
│
└── frontend/
    ├── app/                  # Next.js 14 App Router pages (see Routes below)
    ├── components/           # 21 shared components (see Components below)
    ├── hooks/useUniverse.ts
    ├── lib/api.ts            # All fetch calls to FastAPI backend
    ├── lib/types.ts          # Shared TypeScript types
    ├── package.json
    ├── tailwind.config.ts
    └── tsconfig.json
```

---

## Frontend Routes

| Route | Page | Notes |
|---|---|---|
| `/` | Profile picker landing | Lists all named profiles; no auth required |
| `/scanner` | Top-10 opportunities | Latest scan results, ranked |
| `/stock/[ticker]` | Stock detail | Score, metrics, thesis, chart, news, Monte Carlo |
| `/search` | Ticker autocomplete | |
| `/watchlist` | Profile watchlist | |
| `/portfolio` | Holdings + P&L | Score at buy, cost basis, current value |
| `/leaderboard` | Public rankings | Portfolio return % from May 1 2026 baseline |
| `/leaderboard/vs/[a]/[b]` | Head-to-head | |
| `/earnings` | Earnings calendar | |
| `/backtest` | Backtest results | 1/2/3-month hold strategy |
| `/paper-trading` | Virtual portfolio | Top-3 monthly picks |
| `/heatmap` | Sector heatmap | 6-month score evolution |
| `/compare` | Side-by-side compare | |
| `/chat` | AI Q&A | Claude-backed natural language |
| `/weekly` | Score movers | Gainers/fallers, sector changes |
| `/rebalance` | Portfolio optimizer | Buy/sell/hold suggestions |
| `/settings` | Profile settings | Theme, PIN, avatar |
| `/about` | App info | |

---

## React Components (edgescan/frontend/components/)

| Component | Purpose |
|---|---|
| `AuthGuard.tsx` | Client-side redirect if no session token |
| `BottomNav.tsx` | Mobile nav bar (8 primary routes) |
| `PinModal.tsx` | PIN entry for profile unlock |
| `NewProfileModal.tsx` | Create new profile form |
| `ScoreRing.tsx` | Circular SVG score gauge (0–100, colour-coded) |
| `StockRow.tsx` | Scanner list row (ticker, name, score, price, trend) |
| `DetailPanel.tsx` | Full stock detail (metrics, thesis, price target) |
| `PriceChart.tsx` | Recharts area chart with 50/200 MA overlays |
| `MetricsGrid.tsx` | 3×3 fundamental/technical metrics grid |
| `SignalRow.tsx` | Technical signal display (RSI, MACD, volume) |
| `Sparkline.tsx` | 7-day mini price chart |
| `TickerSearch.tsx` | Search autocomplete |
| `MarketStrip.tsx` | SPX/VIX/10Y live chips |
| `TrendArrow.tsx` | Up/down indicator |
| `WatchStar.tsx` | Add/remove from watchlist |
| `ThemeToggle.tsx` | Dark/light mode switch |
| `ScanButton.tsx` | Trigger manual full scan |
| `RefreshButton.tsx` | Refresh portfolio prices |
| `Toast.tsx` | Notification popups |
| `IndustryMultiples.tsx` | Valuation vs sector peers |
| `MonteCarloPanel.tsx` | Return distribution simulation |

---

## FastAPI Endpoints (edgescan/backend/main.py)

### Profile auth (custom PIN-based)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/profiles` | — | List all profiles |
| GET | `/api/profiles/me` | Bearer | Current profile |
| POST | `/api/profiles` | — | Create (optional PIN) |
| PATCH | `/api/profiles/{id}` | Bearer | Update avatar/name/theme |
| PATCH | `/api/profiles/{id}/pin` | Bearer | Set/change PIN |
| DELETE | `/api/profiles/{id}` | Bearer | Delete profile |
| POST | `/api/profiles/{id}/unlock` | — | Validate PIN → return Bearer token |

### Stock data & scoring
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/top-opportunities` | — | Top 10 from latest scan |
| GET | `/api/stock/{ticker}` | — | Full detail + Claude thesis |
| GET | `/api/stock/{ticker}/history` | — | OHLCV for charting (`?period=3m|6m|1y`) |
| GET | `/api/stock/{ticker}/news` | — | Latest news (yfinance) |
| GET | `/api/stock/{ticker}/score-history` | — | Score over time (90 days) |
| GET | `/api/stock/{ticker}/industry-multiples` | — | Valuation vs sector |
| GET | `/api/stock/{ticker}/monte-carlo` | — | Return distribution |

### Discovery & market data
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/search` | — | Ticker + name autocomplete |
| GET | `/api/market-pulse` | — | SPX/VIX/10Y (5-min cache) |
| GET | `/api/earnings-calendar` | — | Upcoming earnings dates |
| GET | `/api/weekly-snapshot` | — | Score movers + sector avg + top 10 |

### Scanning & jobs
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/scan/status` | — | Poll scan progress |
| POST | `/api/scan/request` | Bearer | User-initiated full scan (async) |
| POST | `/api/scan/trigger` | X-Scan-Secret | Sync scan for cron scheduler |
| GET | `/api/scan/movers` | — | Score risers/fallers (last 2 scans) |

### Portfolio (profile-scoped)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/portfolio/{username}` | Bearer | Holdings + summary |
| POST | `/api/portfolio/{username}` | Bearer | Add/accumulate holding |
| DELETE | `/api/portfolio/{username}/{ticker}` | Bearer | Remove holding |
| GET | `/api/portfolio/history` | Bearer | Daily value history |
| GET | `/api/portfolio/metrics` | Bearer | Sharpe, max drawdown, beta, win rate |
| POST | `/api/portfolio/refresh-prices` | Bearer | Download 1-year price history |

### Watchlist (profile-scoped)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/watchlist` | Bearer | Profile's saved tickers |
| POST | `/api/watchlist/{ticker}` | Bearer | Add |
| DELETE | `/api/watchlist/{ticker}` | Bearer | Remove |
| DELETE | `/api/profiles/{id}/watchlist` | Bearer | Clear all |

### Leaderboard
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/leaderboard` | optional | Rankings by return % |
| GET | `/api/leaderboard/profile/{id}/holdings` | Bearer | Holdings breakdown |

### Analytics & advanced
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/backtest/run` | — | Sync backtest (2–4 min) |
| GET | `/api/backtest/latest` | — | Latest results |
| POST | `/api/backtest/robustness` | — | Bootstrap stress test |
| GET | `/api/analytics/sector-heatmap` | — | Sector score evolution |
| GET | `/api/analytics/rebalance-suggestions` | — | Top 3 vs last month |
| GET | `/api/paper-trading` | — | Virtual positions + P&L |
| POST | `/api/paper-trading/rebalance` | — | Manual rebalance |
| POST | `/api/chat` | — | NLP Q&A (Claude) |
| GET | `/health` | — | Service status |

---

## Database Schema (SQLAlchemy ORM)

| Table | Key Fields | Notes |
|---|---|---|
| `profiles` | id (UUID), name, pin_hash (SHA256), avatar_colour, avatar_emoji, theme_pref | Custom auth; no email/password |
| `profile_sessions` | token (PK), profile_id (FK), created_at | Bearer tokens stored in sessionStorage |
| `scan_results` | ticker, score, fundamental_score, technical_score, current_price, price_target_1m, signals_json, metrics_json, score_breakdown_json, scanned_at | Core scoring output |
| `price_history` | ticker, date, open, high, low, close, volume | 1-year OHLCV |
| `thesis_cache` | ticker (unique), thesis_text, score_at_generation, generated_at | Claude-generated "Why Now" |
| `watchlist_items` | profile_id, ticker (unique per profile) | Profile-scoped |
| `portfolio_holdings` | profile_id, ticker, shares, buy_price, buy_date, score_at_buy | Profile-scoped |
| `backtest_runs` | run_at, n_stocks, months_traded, return figures, monthly_json, yearly_json | Strategy test results |
| `backtest_jobs` | id (12-char hex), status, result_json, error | Async job state |
| `scan_jobs` | id, started_at, completed_at, triggered_by, tickers_done, error | Async scan state |
| `paper_trades` | universe, month (YYYY-MM), ticker, entry/exit price, pnl, status | Virtual portfolio |

---

## Data Pipeline

```
SP500_TICKERS (hardcoded list in data_fetcher.py)
    ↓
yfinance (unofficial Yahoo Finance scraper)
    ↓ fetch_fundamentals + fetch_price_history
pandas-ta (technicals.py)
    ↓ RSI, MACD, MA, OBV, ROC, 52W
scanner.py (composite score 0–100)
    ├── Fundamental: 60 pts (FCF yield 12, ROE 10, gross margin 10, revenue growth 8, EPS growth 8, D/E 6, analyst 4, fwd P/E 2)
    └── Technical: 40 pts (RSI 8, MACD 8, vs 200MA 8, volume 6, 52W position 6, OBV 6, ROC 6; earnings penalty −8/−4)
    ↓
ScanResult rows → PostgreSQL/SQLite
    ↓
thesis_generator.py → Claude API → thesis_cache
```

**Scheduler:** APScheduler — 3× daily at 6am, 12pm, 6pm ET. Batches of 50 tickers with 2s delays between batches.

---

## Auth (Current — Custom Profile System)

- **No email/password, no OAuth.** Named profiles with optional 4-digit PIN.
- PIN stored as **SHA256** (not bcrypt — security gap).
- Bearer token: `secrets.token_urlsafe(32)`, stored in `sessionStorage`.
- All API calls include `Authorization: Bearer <token>`.
- **No tier system, no subscription tracking.**
- Frontend `AuthGuard.tsx` redirects if token absent.
- CORS: `allow_origins=["*"]` (permissive, needs tightening).

---

## What Doesn't Exist Yet (v2 gaps)

| Capability | Status |
|---|---|
| Auth.js v5 / real accounts (email + Google) | ❌ Not built |
| Email verification, password reset | ❌ Not built |
| Stripe billing / subscription tiers | ❌ Not built |
| Free vs Pro tier enforcement | ❌ Not built |
| Licensed data provider (Polygon/Tiingo) | ❌ Still using yfinance |
| Data provider abstraction layer | ❌ Not built |
| Market-calendar-aware scheduler | ❌ Scheduler is not trading-day aware |
| "Not investment advice" disclaimers | ❌ Not present |
| Legal pages (ToS, Privacy, Disclaimer, Refund) | ❌ Not built |
| `/methodology` and `/data-sources` pages | ❌ Not built |
| Account deletion / GDPR export | ❌ Not built |
| Onboarding flow (`/welcome`) | ❌ Not built |
| Landing page for logged-out visitors | ❌ `/` is profile picker |
| ProLock component + upgrade modals | ❌ Not built |
| Empty / loading / error states | ❌ Partial (Toast exists; skeletons absent) |
| Skeleton loaders | ❌ Not built |
| WCAG AA accessibility | ❌ Not audited |
| Admin view | ❌ Not built |
| Analytics instrumentation | ❌ Not built |
| Lifecycle emails (weekly digest, alerts) | ❌ Not built |
| Rate limiting on expensive endpoints | ❌ Not built |
| Score-change alerts (watchlist) | ❌ Not built |
| Referral / growth loops | ❌ Not built |
| Reduced-motion support | ❌ Not verified |
| `DECISIONS.md` | ✅ Created (Phase 0) |
| `CURRENT_STATE.md` | ✅ This file |

---

## Features to Sunset / Move

Per v2 spec:

| Feature | Action |
|---|---|
| **Rebalance** (`/rebalance`) | Preserve in code (branch), remove from nav |
| **Paper Trading** (`/paper-trading`) | Preserve in code (branch), remove from nav |
| **Leaderboard** (`/leaderboard`) | Move to Labs (hidden, not primary nav) |
| **Profile switcher** (`/` picker + PinModal) | Replace with Auth.js v5 auth |
| FactCanvas (root) | Leave untouched |

---

## Phase Completion Tracker

| Phase | Description | Status |
|---|---|---|
| 0 | Audit & baseline | ✅ Complete |
| 1 | Data provider migration | ⬜ Pending |
| 2 | Data model & migrations | ⬜ Pending |
| 3 | Authentication (Auth.js v5) | ⬜ Pending |
| 4 | Tier enforcement scaffolding | ⬜ Pending |
| 5 | Billing & lifecycle (Stripe) | ⬜ Pending |
| 6 | Compliance & trust layer | ⬜ Pending |
| 7 | Navigation & IA revamp | ⬜ Pending |
| 8 | Free/Pro feature split | ⬜ Pending |
| 9 | Onboarding & landing | ⬜ Pending |
| 10 | States, accessibility, performance, responsive | ⬜ Pending |
| 11 | Analytics, lifecycle messaging, admin | ⬜ Pending |
| 12 | Final QA & launch readiness | ⬜ Pending |
