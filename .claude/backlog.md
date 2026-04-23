# EdgeScan Product Backlog

Items are ordered by priority. The Coder agent picks the top READY item each sprint.
After completing an item, move it to Done and promote the next item.

---

## 🔴 READY (pick from top)

### [READY-1] Watchlist — star icon on stock cards (scanner page integration)
The Watchlist page and localStorage logic (`WatchlistClient.tsx`, `loadWatchlist`, `toggleWatchlist`)
already exist. What is missing is the entry point: a ⭐ icon on each `StockRow` in the scanner
so users can add a ticker without navigating away.
- Import `toggleWatchlist` / `loadWatchlist` from `WatchlistClient.tsx` into `StockRow.tsx`.
- Render a small star button (right of the score ring). Filled gold when in watchlist, outline when not.
- Persist via `toggleWatchlist`; re-read state from `loadWatchlist` on mount.
- The "Watchlist" tab in the More tray already routes to `/watchlist` — no nav changes needed.
**Scope:** `components/StockRow.tsx`, `app/watchlist/WatchlistClient.tsx` (export helpers already present).

### [READY-2] Mobile-friendly comparison page
The compare page table (`app/compare/page.tsx`) uses a CSS grid with fixed pixel columns
(`gridTemplateColumns: '160px repeat(…)'`) which overflows on small screens.
- Below 640 px: render each stock as a vertically stacked card instead of columns.
- The `MetricRow` component should collapse to a labelled list item per stock on mobile.
- Use Tailwind responsive prefixes (`sm:`) and existing dark-palette CSS variables — no new colours.
**Scope:** `app/compare/page.tsx` only.

### [READY-3] Score trend arrow on stock cards
Show a small ↑ ↓ → indicator next to each score on the scanner page comparing the current score
to the most recent previous score (via `api.scoreHistory(ticker)`).
- Green ↑ if score improved > 3 pts, red ↓ if dropped > 3 pts, grey → otherwise.
- Fetch score history per-ticker client-side in `StockRow` (lazy, non-blocking).
- `api.scoreHistory` already exists in `lib/api.ts`; `ScoreHistoryResponse` type is in `lib/types.ts`.
**Scope:** `components/StockRow.tsx`, possibly a new small `components/TrendArrow.tsx`.

### [READY-4] Skeleton loading screens
Replace blank/spinner states with animated skeleton placeholder cards while the scanner loads.
- Scanner page (`app/scanner/page.tsx`) already has a spinner fallback; replace with 8–10 skeleton
  `StockRow`-shaped grey pulse cards.
- Use Tailwind `animate-pulse` and existing `#1e2540` background colour (already used in
  `WatchlistClient.tsx` skeleton rows).
- Also apply to the stock detail loading state (`app/stock/[ticker]/loading.tsx`).
**Scope:** `app/scanner/page.tsx`, `app/stock/[ticker]/loading.tsx`, optionally a shared
`components/SkeletonRow.tsx`.

### [READY-5] Last-scanned timestamp banner
Show a subtle banner at the top of the scanner page: "Last scanned 42 min ago · 47 stocks".
The `meta` string is already computed in `getTopStocks()` and rendered as a `<p>` subtitle.
Promote it to a more visible sticky banner with a refresh icon.
**Scope:** `app/scanner/page.tsx` only.

### [READY-6] One-tap refresh for a single stock
On the stock detail page, add a "Refresh" button that re-fetches `GET /api/stock/{ticker}`
with a cache-bust query param so the user gets a fresh score without waiting for the next full scan.
The backend already rescores on cache miss; `api.stock(ticker)` in `lib/api.ts` is the call to reuse.
**Scope:** `app/stock/[ticker]/page.tsx`.

### [READY-7] Sector badge score average
Each sector filter pill on the scanner page should show the average score of stocks in that sector
in small text below the sector name (e.g. "Technology · avg 61").
Derive from the already-loaded `results` array — no extra API call.
**Scope:** `app/scanner/page.tsx` only.

---

## 🟡 BACKLOG (not yet refined — PM should refine before marking READY)

- Historical score chart on the stock detail page (data already available via `api.scoreHistory`)
- Alert / push notification when a watchlisted stock's score changes > 5 pts
- Dark/light theme toggle
- Sector rotation heatmap improvements (click cell to see stocks in that sector/month)
- Russell 1000 scanner results page (separate from S&P 500 tab)
- PDF export of backtest results
- Portfolio import via CSV
- News sentiment overlay on price chart

---

## ✅ DONE

- Universe selection landing page (S&P 500 vs Russell 1000)
- Bottom nav redesign (5 tabs + More tray)
- AI chat fix (input above nav bar)
- MarketStrip shows RUI index when Russell 1000 selected
- Price target renamed and recalculated to true 1-month horizon
- Cloud Run startup hang fixed (DB timeout + migration)
- Backtest "Status check failed" fixed (synchronous endpoint)
