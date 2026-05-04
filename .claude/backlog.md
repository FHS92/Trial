# EdgeScan Product Backlog

Items are ordered by priority. Pick from the top of the READY list each sprint.

---

## READY

### ✅ [DONE] UX polish sprint — 7 items

Completed 2026-05-04.
1. **One-tap refresh** — `RefreshButton.tsx` in stock detail header; `router.refresh()` + 1.5s spin.
2. **Sector badge on mobile** — removed `hidden sm:inline` from `StockRow`; pill always visible.
3. **Star cross-tab reactivity** — `window storage` event listener in `StockRow` syncs starred state across tabs instantly.
4. **Watchlist size guard** — `MAX_WATCHLIST=50`; orange warning at 45+, red block at 50.
5. **Swipe-to-remove** — right-swipe >80px on watchlist cards removes ticker; red trash zone reveals as you drag.
6. **Dark/light theme toggle** — CSS custom properties + `html.light` overrides in `globals.css`; `ThemeToggle.tsx` in More tray; inline script in `<head>` prevents flash on reload.
7. **Heatmap click-through** — sector name column + score cells navigate to `/scanner?sector=X`; "N stocks →" subtitle signals interactivity.

---

### ✅ [DONE — Sprint 11] Leaderboard transparency + drill-down + time windows

Completed 2026-05-04.
- **LB-1:** Dollar amounts, HowItWorks collapsible, time-ago timestamp, badge descriptions.
- **LB-2:** `GET /api/leaderboard/profile/{id}/holdings` endpoint + `HoldingsModal` bottom-sheet showing per-holding cards with position weight bars.
- **LB-3:** `WindowTabs` pill bar (All time | 7 days | 30 days); `rankEntries()` re-sorts client-side; podium + rows show active-window return as headline.

---

### ✅ [DONE — Sprint 10] Score trend arrow + On-demand Scan Now button

Completed 2026-05-04.
- `TrendArrow.tsx` — green ↑ / red ↓ / grey → on scanner cards vs previous scan score.
- `ScanButton.tsx` — POST /api/scan/request (Bearer auth) fires background thread; polls /api/scan/status every 8s; router.refresh() on completion.
- Last-scanned banner with clock icon in scanner header.

---

### ✅ [DONE — Sprint 9] Industry multiples + value-based portfolio + unified search

Completed 2026-05-04.
- `IndustryMultiples.tsx` — P/E, P/S, EV/EBITDA, P/B vs sector median; green if cheaper, red if richer.
- Portfolio form now takes "Amount ($)" + "Price Per Share" instead of raw share count; accumulates with weighted-average cost basis.
- `TickerSearch.tsx` shared component with debounced dropdown, arrow-key nav, price auto-fill; deployed to portfolio, watchlist, and universal search.

---

### ✅ [DONE — Sprint 8] Sparkline fix + touch targets + toast

Completed 2026-05-03. Pure SVG polyline sparkline (no recharts SSR). Watchlist X + More tray close expanded to 44px. Toast on star tap.

---

### ✅ [DONE — Sprint 7] Friends leaderboard

Completed 2026-05-03. Gold/silver/bronze podium, badge system, YOU indicator, stats strip. Sessions migrated to DB table.

---

### ✅ [DONE — Sprint 6] Multi-profile system

Netflix-style profile picker, PIN support, all data scoped per profile.

---

### [READY] Mobile-friendly comparison page

`app/compare/page.tsx` uses fixed-pixel CSS grid that overflows on phones.
- Below 640px: render each stock as a vertically stacked card.
- `MetricRow` collapses to a labelled list item per stock on mobile.
- Tailwind `sm:` prefixes only; no new colours.
**Scope:** `app/compare/page.tsx` only.

---

### [READY] Skeleton loading screens

Replace spinners with `animate-pulse` skeleton cards while scanner/stock detail load.
- Scanner: 8–10 `StockRow`-shaped grey pulse cards.
- Stock detail `loading.tsx`: matching skeleton layout.
- Shared `components/SkeletonRow.tsx`.
**Scope:** `app/scanner/page.tsx`, `app/stock/[ticker]/loading.tsx`, `components/SkeletonRow.tsx`.

---

### [READY] Portfolio delete holding

No way to remove a position today — critical missing CRUD.
- `DELETE /api/portfolio/{ticker}` backend endpoint (auth-scoped).
- Trash icon on each holding card with inline confirm ("tap again to remove").
**Scope:** `app/portfolio/page.tsx`, `edgescan/backend/main.py`.

---

### [READY] Similar stocks panel on stock detail

"You might also like" below Industry Multiples — 3–5 stocks in the same sector with the closest score.
- `GET /api/stock/{ticker}/similar` — pure DB query, no yfinance.
- `SimilarStocks.tsx` client component; each result links to that stock's detail page.
**Scope:** new endpoint in `main.py`, `components/SimilarStocks.tsx`, `app/stock/[ticker]/page.tsx`.

---

### [READY] Portfolio value history chart

Line chart of portfolio total value over time, reconstructed from `price_history × shares`.
- `GET /api/portfolio/history` — queries existing `price_history` table, no new data fetching.
- SVG polyline (same pattern as sparkline — no recharts SSR issues).
**Scope:** new endpoint in `main.py`, chart inline in `app/portfolio/page.tsx`.

---

### [READY] Score distribution histogram on scanner

Small histogram below sector pills showing how today's 500 scores are distributed.
- 10 buckets (0–10 … 90–100); derived from the already-loaded `results` array — no API call.
- Collapsed by default (expandable chevron).
**Scope:** `app/scanner/page.tsx` only.

---

### [READY] Newsletter integration

Weekly digest auto-generated from live scan data.
- `GET /api/newsletter/weekly-digest` endpoint: top 5 picks, biggest score movers, sector summary, one deep-dive.
- No subscriber management in v1.
**Decision needed before building:** manual HTML export vs. Resend/Buttondown API vs. in-app `/newsletter-preview` page.

---

### [READY] Earnings calendar

`/earnings` page listing upcoming earnings in the next 30 days for watchlisted + top-scoring stocks.
- `earnings_date` already stored in `scan_results` — pure DB query, no yfinance.
**Scope:** new page + `GET /api/earnings/upcoming` endpoint.

---

### [READY] Head-to-head profile compare

Shareable `/leaderboard/vs/[a]/[b]` page: two profiles side-by-side, overall + 7d/30d return, shared vs. unique holdings.
- Zero new backend data — all return fields already in leaderboard response.
**Scope:** new Next.js page + reuse existing leaderboard endpoint.

---

### [BACKLOG] Historical score chart on stock detail

Line chart of score over time using `api.scoreHistory` data already available.
Small SVG polyline in the score breakdown section.

---

### [BACKLOG] One-tap refresh on stock detail (single stock)

Re-fetches `GET /api/stock/{ticker}` with cache-bust param. Backend rescores on cache miss. *(Partially addressed by RefreshButton added in UX polish sprint — may already be sufficient.)*

---

### [BACKLOG] Sector badge score average on scanner pills

Each sector filter pill shows "Technology · avg 61". Derived from already-loaded `results` — no API call.
**Scope:** `app/scanner/page.tsx` only.

---

### [BACKLOG] Watchlist lazy loading

Switch watchlist page to paginated/virtualised loading to avoid firing dozens of simultaneous `api.stock()` calls on mount for large lists.

---

### [BACKLOG] Share a stock card

"Share" button on stock detail using the Web Share API (mobile) or copy a pre-formatted text snippet. No backend needed.

---

### [BACKLOG] Portfolio Monte Carlo simulator

1,000 simulated price paths forward 252 trading days. Fan chart (median, 10th/90th bands). "80% chance above $X in 12 months."
- `POST /api/portfolio/simulate`; numpy already installed.
**Decision needed:** time horizon options, confidence bands.

---

### [BACKLOG] Scheduled scan via Cloud Scheduler

Cloud Scheduler job that POSTs to `/api/scan/request` daily at market close. Deployment config only — no code change.

---

### [BACKLOG] Alert / push notification

Push when a watchlisted stock's score changes >5 pts between scans. Requires web push setup or email hook.

---

### [BACKLOG] Sector rotation heatmap drill-down

Click a heatmap cell → show a modal/panel listing the individual stocks in that sector for that month (not just the average score). *(Heatmap click now navigates to scanner — this would be a richer in-place expansion.)*

---

### [BACKLOG] Portfolio import via CSV

Bulk upload holdings from a broker export.

---

### [BACKLOG] News sentiment overlay on price chart

Annotate the sparkline/detail chart with news events and their sentiment score.

---

### [BACKLOG] Egyptian Exchange 30 universe

Same scanner/watchlist/portfolio experience for the EGX30. Sparse yfinance coverage expected for some fields.
**Decision needed:** separate tab vs. separate section.

