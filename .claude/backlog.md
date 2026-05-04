# EdgeScan Product Backlog

---

### ✅ [DONE] UX polish sprint — 7 items
1. One-tap refresh, sector badge on mobile, star cross-tab reactivity, watchlist size guard, swipe-to-remove, dark/light theme toggle, heatmap click-through.

### ✅ [DONE] Leaderboard transparency + drill-down + time windows
Dollar amounts, HowItWorks collapsible, HoldingsModal, WindowTabs (All / 7d / 30d).

### ✅ [DONE] Score trend arrow + On-demand Scan Now button
TrendArrow, ScanButton with DB-backed scan state, last-scanned banner.

### ✅ [DONE] Industry multiples + value-based portfolio + unified search
IndustryMultiples, amount-based portfolio form, TickerSearch.

### ✅ [DONE] Sparkline fix + touch targets + toast

### ✅ [DONE] Friends leaderboard

### ✅ [DONE] Multi-profile system

### ✅ [DONE] Portfolio value history chart
SVG polyline from first trade date; per-holding entry dates respected; `GET /api/portfolio/history`.

### ✅ [DONE] Scanner mobile layout fix
Sparkline hidden on mobile, tighter gap/padding, score ring 44px, price label shortened.

### ✅ [DONE] Stock chart hover fix
XAxis keyed on raw ISO date; tooltip shows correct bar at cursor.

---

## READY

### [READY] Similar stocks panel on stock detail
"You might also like" below Industry Multiples — 3–5 stocks in the same sector with the closest score.
- `GET /api/stock/{ticker}/similar` — pure DB query, no yfinance.
- `SimilarStocks.tsx` client component; each result links to that stock's detail page.
**Scope:** new endpoint in `main.py`, `components/SimilarStocks.tsx`, `app/stock/[ticker]/page.tsx`.

---

### [READY] Score distribution histogram on scanner
Small histogram below sector pills showing how today's scores are distributed.
- 10 buckets (0–10 … 90–100); derived from already-loaded `results` — no API call.
- Collapsed by default (expandable chevron).
**Scope:** `app/scanner/page.tsx` only.

---

### [READY] Skeleton loading screens
Replace spinners with `animate-pulse` skeleton cards.
- Scanner: 8–10 `StockRow`-shaped pulse cards.
- Stock detail `loading.tsx`: matching skeleton layout.
- Shared `components/SkeletonRow.tsx`.
**Scope:** `app/scanner/page.tsx`, `app/stock/[ticker]/loading.tsx`, `components/SkeletonRow.tsx`.

---

### [READY] Earnings calendar
`/earnings` page — upcoming earnings in next 30 days for watchlisted + top-scoring stocks.
- `earnings_date` already in `scan_results` — pure DB query.
**Scope:** new page + `GET /api/earnings/upcoming` endpoint.

---

### [READY] Head-to-head profile compare
`/leaderboard/vs/[a]/[b]` — two profiles side-by-side, overall + 7d/30d return, shared vs. unique holdings.
- Zero new backend data.
**Scope:** new Next.js page + reuse existing leaderboard endpoint.

---

### [READY] Mobile-friendly comparison page
`app/compare/page.tsx` overflows on phones.
- Below 640px: vertically stacked cards per stock.
- Tailwind `sm:` prefixes only.
**Scope:** `app/compare/page.tsx` only.

---

### [READY] Newsletter / weekly digest
`GET /api/newsletter/weekly-digest` — top 5 picks, biggest score movers, sector summary.
**Decision needed:** Resend API vs. in-app `/newsletter-preview` page.

---

## BACKLOG

- **Sector badge avg score on pills** — "Technology · avg 61"; no API call, derived from loaded results.
- **Watchlist lazy loading** — paginate/virtualise to avoid 50 simultaneous stock fetches.
- **Share a stock card** — Web Share API on mobile, copy-to-clipboard fallback.
- **Portfolio Monte Carlo simulator** — 1,000 paths, 252 days, fan chart. `POST /api/portfolio/simulate`.
- **Alert / push notification** — push when watchlisted stock score changes >5 pts between scans.
- **Heatmap drill-down modal** — click cell → list individual stocks in that sector/month.
- **Portfolio import via CSV** — bulk upload from broker export.
- **News sentiment overlay** — annotate price chart with news events + sentiment score.
- **EGX30 universe** — Egyptian Exchange 30; decision needed on tab vs. section.
