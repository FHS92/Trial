# EdgeScan Product Backlog

Items are ordered by priority. The Coder agent picks the top READY item each sprint.
After completing an item, move it to Done and promote the next item.

---

## 🔴 READY (pick from top)

### [READY-1] Watchlist nav entry + star UX polish (Sprint 2 top item — three fixes bundled)
Three urgent follow-ups from the Sprint 1 Watchlist star feature. All three touch the same
narrow file set and together make the Watchlist feature actually usable end-to-end. Split
into sub-tasks below but should ship as one atomic PR.

**Sub-task A — Add Watchlist to primary bottom nav (CRITICAL)**
The Watchlist page at `/watchlist` has no navigation entry anywhere in the app: it is absent
from `PRIMARY_NAV`, absent from `MORE_NAV`, and the scanner header has no shortcut to it.
Users can star stocks but have no visible path to find them again.
- Move `Backtest` out of `PRIMARY_NAV` and into `MORE_NAV` (Backtest is low-frequency).
- Insert a `Watchlist` entry into `PRIMARY_NAV` with a star/bookmark SVG icon.
- Optionally render a small count badge (number of saved tickers from `loadWatchlist`) on the
  Watchlist tab label so users can see at a glance how many stocks they have saved.
**Scope:** `components/BottomNav.tsx`

**Sub-task B — Fix empty-state copy on Watchlist page (QUICK)**
The empty-state hint reads *"Use the field above or the + button on any stock detail page."*
There is no `+` button on the stock detail page — the control is labelled "☆ Watch".
- Update the empty-state string to accurately describe the star icon on scanner cards and the
  "☆ Watch" pill on the stock detail page.
**Scope:** `app/watchlist/WatchlistClient.tsx`

**Sub-task C — Increase star touch target to 44 × 44 px (ACCESSIBILITY)**
The star SVG is 16 × 16 px inside a `p-1` wrapper (~24 px hit area). On mobile in a fast-scroll
session users frequently miss the target and trigger card navigation instead.
- Wrap the star `<button>` in `min-w-[44px] min-h-[44px]` with `flex items-center justify-center`
  so the tap area meets Apple HIG / WCAG 2.5.5 minimum (the visible icon stays 16–20 px).
**Scope:** `components/StockRow.tsx`

> **Deliberately deferred from this bundle:** Toast/snackbar confirmation after starring. This
> requires installing or building a toast primitive (no existing one in the codebase) and is a
> separate scope. It is queued as READY-2 immediately below.

---

### [READY-2] Toast/snackbar confirmation after starring a stock
After tapping the star on a `StockRow`, users get no feedback that the action succeeded beyond
the icon fill changing — which is easy to miss mid-scroll. A brief toast ("AAPL added to
watchlist") closes the loop.
- Implement a lightweight toast component (fixed bottom-center, above the nav bar, auto-dismisses
  after ~2 s). Check if a toast utility already exists before creating one.
- Trigger from `StockRow.tsx` on each `toggleWatchlist` call, passing the ticker and
  add/remove direction.
- No external library required; a simple CSS transition with `useState` + `useEffect` timeout
  is sufficient to keep the bundle lean.
**Scope:** `components/StockRow.tsx`, new `components/Toast.tsx` (if no existing primitive).

---

### [READY-3] Mobile-friendly comparison page
The compare page table (`app/compare/page.tsx`) uses a CSS grid with fixed pixel columns
(`gridTemplateColumns: '160px repeat(…)'`) which overflows on small screens.
- Below 640 px: render each stock as a vertically stacked card instead of columns.
- The `MetricRow` component should collapse to a labelled list item per stock on mobile.
- Use Tailwind responsive prefixes (`sm:`) and existing dark-palette CSS variables — no new colours.
**Scope:** `app/compare/page.tsx` only.

---

### [READY-4] Score trend arrow on stock cards
Show a small ↑ ↓ → indicator next to each score on the scanner page comparing the current score
to the most recent previous score (via `api.scoreHistory(ticker)`).
- Green ↑ if score improved > 3 pts, red ↓ if dropped > 3 pts, grey → otherwise.
- Fetch score history per-ticker client-side in `StockRow` (lazy, non-blocking).
- `api.scoreHistory` already exists in `lib/api.ts`; `ScoreHistoryResponse` type is in `lib/types.ts`.
**Scope:** `components/StockRow.tsx`, possibly a new small `components/TrendArrow.tsx`.

---

### [READY-5] Skeleton loading screens
Replace blank/spinner states with animated skeleton placeholder cards while the scanner loads.
- Scanner page (`app/scanner/page.tsx`) already has a spinner fallback; replace with 8–10 skeleton
  `StockRow`-shaped grey pulse cards.
- Use Tailwind `animate-pulse` and existing `#1e2540` background colour (already used in
  `WatchlistClient.tsx` skeleton rows).
- Also apply to the stock detail loading state (`app/stock/[ticker]/loading.tsx`).
**Scope:** `app/scanner/page.tsx`, `app/stock/[ticker]/loading.tsx`, optionally a shared
`components/SkeletonRow.tsx`.

---

### [READY-6] Last-scanned timestamp banner
Show a subtle banner at the top of the scanner page: "Last scanned 42 min ago · 47 stocks".
The `meta` string is already computed in `getTopStocks()` and rendered as a `<p>` subtitle.
Promote it to a more visible sticky banner with a refresh icon.
**Scope:** `app/scanner/page.tsx` only.

---

### [READY-7] One-tap refresh for a single stock
On the stock detail page, add a "Refresh" button that re-fetches `GET /api/stock/{ticker}`
with a cache-bust query param so the user gets a fresh score without waiting for the next full scan.
The backend already rescores on cache miss; `api.stock(ticker)` in `lib/api.ts` is the call to reuse.
**Scope:** `app/stock/[ticker]/page.tsx`.

---

### [READY-8] Sector badge score average
Each sector filter pill on the scanner page should show the average score of stocks in that sector
in small text below the sector name (e.g. "Technology · avg 61").
Derive from the already-loaded `results` array — no extra API call.
**Scope:** `app/scanner/page.tsx` only.

---

## 🟡 BACKLOG (not yet refined — PM should refine before marking READY)

- Watchlist size guard + lazy loading: cap at ~50 tickers with a user-facing warning; or switch
  watchlist page to paginated/virtualised loading so large lists do not fire dozens of simultaneous
  `api.stock()` calls on mount (flagged by User Tester, Sprint 1)
- Star state cross-tab reactivity: `StockRow` and `DetailPanel` both init starred state once in
  `useEffect` and drift when both open simultaneously — fix with a `storage` event listener
- Sector badge hidden on mobile: `StockRow` hides the sector pill with `hidden sm:inline`; reconsider
  layout so the sector is visible on phones (primary use case)
- Watchlist count badge on nav entry (can be added once Watchlist is in primary nav — READY-1A)
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

- [READY-1] Watchlist — star icon on stock cards (scanner page integration) — completed Sprint 1 (2026-04-23)
  - Star button live on `StockRow.tsx`; fills gold when in watchlist, outline when not
  - State initialised from `localStorage` on mount; `e.stopPropagation()` prevents accidental navigation
  - `aria-label` toggles between "Add to watchlist" / "Remove from watchlist"
- Universe selection landing page (S&P 500 vs Russell 1000)
- Bottom nav redesign (5 tabs + More tray)
- AI chat fix (input above nav bar)
- MarketStrip shows RUI index when Russell 1000 selected
- Price target renamed and recalculated to true 1-month horizon
- Cloud Run startup hang fixed (DB timeout + migration)
- Backtest "Status check failed" fixed (synchronous endpoint)
