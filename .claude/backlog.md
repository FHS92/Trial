# EdgeScan Product Backlog

Items are ordered by priority. The Coder agent picks the top READY item each sprint.
After completing an item, move it to Done and promote the next item.

---

## 🔴 READY (pick from top)

### [READY-1] Fix 7-day sparkline: pass OHLCV history to StockRow on the scanner page (Sprint 3 top item)

The 7-day sparkline column rendered on every `StockRow` has been permanently empty since it
shipped. `StockRow` accepts a `history?: OHLCVBar[]` prop and correctly slices the last 7 bars,
but `scanner/page.tsx` never passes that prop — every card renders an invisible 80×32 px blank
area instead of a price line. This is a broken UI element visible to 100% of scanner users on
every page load and must be fixed before any cosmetic enhancements.

**Root cause (confirmed by code review):**
`scanner/page.tsx` line 129:
```tsx
<StockRow key={stock.ticker} stock={stock} rank={i + 1} />
```
The `history` prop is absent. `StockRow` defaults to `history = []`, so `sparkData` is always
empty and `Sparkline` returns a blank `<div>`.

**Approach — parallel server-side fetch for the displayed stocks only:**
`scanner/page.tsx` is an `async` server component (already `force-dynamic`). The fix stays
entirely server-side — no client state, no new hooks, no layout changes.

1. After `getTopStocks()` resolves, take `displayed` (the top 10 or sector-filtered list, max
   10 by default).
2. Fetch `api.priceHistory(ticker, '1w')` for each ticker in `displayed` in parallel using
   `Promise.allSettled` (so a single bad ticker does not break the whole page).
3. Build a `Map<string, OHLCVBar[]>` keyed by ticker from the settled results (skip rejected
   promises silently — `StockRow` already handles an empty array gracefully).
4. Pass `history={historyMap.get(stock.ticker) ?? []}` on each `<StockRow>`.

**Important constraints:**
- Fetch only for `displayed` (≤10 tickers by default, ≤ full filtered set when "show all" is
  active). Do NOT fetch history for every result in `results` (up to 100 rows) — that would
  fire 100 parallel requests on every page load.
- `api.priceHistory` already exists in `lib/api.ts` and returns `PriceHistoryResponse` with
  `data: OHLCVBar[]`. The `OHLCVBar` type is in `lib/types.ts`. No backend changes needed.
- Keep `getTopStocks()` as a pure helper that returns `StockResult[]`; the history fetching
  belongs in the page component body, not inside that helper.
- The sparkline renders on `md:` and above (`hidden md:block` wrapper in `StockRow`). No change
  to that visibility rule is needed.

**Scope:** `app/scanner/page.tsx` only. No other files require changes.

**Acceptance criteria:**
- On a desktop viewport (≥768 px) each stock card in the scanner shows a coloured 7-day price
  line (green if net positive over the week, red if net negative).
- A ticker whose history fetch fails (network error, 404) still renders a blank sparkline slot —
  no error boundary or console crash.
- TypeScript compiles clean (`tsc --noEmit`).

---

### ✅ [DONE — Sprint 7] Friends leaderboard with podium + weekly/monthly rewards

Completed 2026-05-03. `/leaderboard` page with gold/silver/bronze podium for top 3, ranked list
for 4th+, badge system (👑⚡🥇🚀), YOU indicator, stats strip. Backend `GET /api/leaderboard`
ranks all profiles by portfolio return, computes 7d/30d performance, assigns badges server-side.
Sessions migrated from in-memory dict to `profile_sessions` DB table — logins now survive
backend restarts. Leaderboard added to More tray nav.

---

### [READY-2] Complete touch-target audit: fix X button on WatchlistCard and close button on More tray

Two interactive controls were missed by the Sprint 2 touch-target pass and remain under the
44×44 px WCAG 2.5.5 / Apple HIG minimum.

**Sub-task A — Watchlist card X button (~22 px)**
Each `WatchlistCard` in `app/watchlist/WatchlistClient.tsx` has a remove button with a small
icon and `p-1` padding. Apply the same `min-w-[44px] min-h-[44px] flex items-center
justify-center` treatment used on the scanner star button in Sprint 2.
**Scope:** `app/watchlist/WatchlistClient.tsx`

**Sub-task B — More tray close button (24 px)**
The close X in `BottomNav.tsx` is `w-6 h-6` (24 px). Expand to `min-w-[44px] min-h-[44px]`
with `flex items-center justify-center`; the visual circle background can stay at its current
size by applying it to an inner `<span>` rather than the button itself, or by simply enlarging
the button hit zone with a negative-margin / padding trick.

Also note the CSS animation bug flagged by the User Tester: both open and closed states share
`bottom: '4.5rem'`; the closed state relies entirely on a `translateY` transform. While it works
visually, consider setting `bottom: '4.5rem'` for open and moving to `visibility: hidden` /
`pointer-events: none` after the close transition completes to prevent interaction with off-screen
elements on slow browsers.
**Scope:** `components/BottomNav.tsx`

Ship both sub-tasks as one atomic commit.

---

### ✅ [DONE — Sprint 5] Add watchlist star button to the stock detail page

Completed 2026-04-23. New `WatchStar.tsx` client component added; star appears in the stock
detail page header with 44px touch target, localStorage sync, and cross-component event dispatch.
Commits: `0359636` (feat), `ebcc310` (QA sync fix).

---

### [READY-4] Toast/snackbar confirmation after starring a stock

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

### [READY-5] Mobile-friendly comparison page

The compare page table (`app/compare/page.tsx`) uses a CSS grid with fixed pixel columns
(`gridTemplateColumns: '160px repeat(…)'`) which overflows on small screens.
- Below 640 px: render each stock as a vertically stacked card instead of columns.
- The `MetricRow` component should collapse to a labelled list item per stock on mobile.
- Use Tailwind responsive prefixes (`sm:`) and existing dark-palette CSS variables — no new colours.
**Scope:** `app/compare/page.tsx` only.

---

### [READY-6] Score trend arrow on stock cards

Show a small ↑ ↓ → indicator next to each score on the scanner page comparing the current score
to the most recent previous score (via `api.scoreHistory(ticker)`).
- Green ↑ if score improved > 3 pts, red ↓ if dropped > 3 pts, grey → otherwise.
- Fetch score history per-ticker client-side in `StockRow` (lazy, non-blocking).
- `api.scoreHistory` already exists in `lib/api.ts`; `ScoreHistoryResponse` type is in `lib/types.ts`.
**Scope:** `components/StockRow.tsx`, possibly a new small `components/TrendArrow.tsx`.

---

### [READY-7] Skeleton loading screens

Replace blank/spinner states with animated skeleton placeholder cards while the scanner loads.
- Scanner page (`app/scanner/page.tsx`) already has a spinner fallback; replace with 8–10 skeleton
  `StockRow`-shaped grey pulse cards.
- Use Tailwind `animate-pulse` and existing `#1e2540` background colour (already used in
  `WatchlistClient.tsx` skeleton rows).
- Also apply to the stock detail loading state (`app/stock/[ticker]/loading.tsx`).
**Scope:** `app/scanner/page.tsx`, `app/stock/[ticker]/loading.tsx`, optionally a shared
`components/SkeletonRow.tsx`.

---

### [READY-8] Last-scanned timestamp banner

Show a subtle banner at the top of the scanner page: "Last scanned 42 min ago · 47 stocks".
The `meta` string is already computed in `getTopStocks()` and rendered as a `<p>` subtitle.
Promote it to a more visible sticky banner with a refresh icon.
**Scope:** `app/scanner/page.tsx` only.

---

### [READY-9] Industry multiples section on the stock detail page

Show a valuation-in-context panel on `app/stock/[ticker]/page.tsx` comparing the stock's key multiples (P/E, EV/EBITDA, P/S, P/B) against the median for its sector/industry peers already in the S&P 500 universe. Helps users instantly see whether a stock is cheap or expensive relative to its industry.

- Pull the stock's sector from the already-loaded `stock` object.
- Filter `ScanResult` rows for same-sector tickers (latest scan only) and compute median multiples from stored fundamental data — no extra yfinance calls.
- Render as a compact 2-column table: metric name | stock value vs industry median, coloured green if cheaper, red if more expensive.
- Backend: new `GET /api/stock/{ticker}/industry-multiples` endpoint.
- Frontend: new `IndustryMultiples` client component rendered below `MonteCarloPanel`.
**Decision needed:** which multiples to surface (P/E, P/S, EV/EBITDA, P/B suggested). Confirm before implementation.

---

### [READY-10] Newsletter integration

Allow EdgeScan to feed a periodic newsletter (weekly or bi-weekly) with content auto-generated from live scan data. Intended for publishing to subscribers outside the app.

- **Content candidates:** top 5 scanner picks this week, biggest score movers (up/down), sector rotation summary, one featured stock deep-dive (score breakdown + Monte Carlo snapshot).
- **Delivery options to decide:** (a) generate a static HTML email template that the owner exports manually, (b) integrate with a service like Resend or Buttondown via API, (c) a `/newsletter-preview` page in the app that renders the draft.
- Backend: `GET /api/newsletter/weekly-digest` endpoint that assembles the data payload.
- No subscriber management needed in v1 — the publishing platform handles the list.
**Decision needed:** delivery mechanism (manual export vs. Resend/Buttondown API vs. in-app preview page). Confirm before implementation.

---

### [READY-11] Friends leaderboard with portfolio rankings and rewards

A social leaderboard page where each profile's portfolio performance is ranked against the others. Designed to be fun and competitive for a small group of friends all using the same app instance.

**Visual design:**
- Top 3 profiles stand on podium pedestals (1st tallest centre, 2nd left, 3rd right) with avatar circles, profile names, and their total portfolio return %.
- Positions 4 and below rendered as a ranked list underneath the podium with rank number, avatar, name, return %, and portfolio value.
- Animated confetti or glow effect on the #1 spot.

**Rewards / badges:**
- Weekly reward: crown badge awarded to the top performer over the rolling 7-day period, shown on their podium/card.
- Monthly reward: gold medal badge for the month's best return.
- Badges persist on the profile and display on their leaderboard card and profile picker avatar.
- "Biggest mover this week" badge for the largest % gain in 7 days regardless of rank.

**Data:**
- Backend computes each profile's portfolio return % from their `PortfolioHolding` rows using stored price history — no live price fetch on page load.
- New `GET /api/leaderboard` endpoint returning ranked list with return %, portfolio value, badges earned.
- Badge logic computed server-side and stored per profile (new `badges_json` column on `Profile`).

**Scope:** new `app/leaderboard/page.tsx`, new `components/Podium.tsx`, backend endpoint + badge logic. Add Leaderboard to the bottom nav (swap into a primary slot or the More tray).
**Decision needed:** how to handle profiles with no portfolio holdings (show as 0% or exclude). Confirm before implementation.

---

## 🟡 BACKLOG (not yet refined — PM should refine before marking READY)

- **Portfolio Monte Carlo simulator** — on the Portfolio page, run 1,000 simulated price paths forward 252 trading days using each holding's historical volatility and drift. Render a probability fan chart (median, 10th/90th percentile bands) and surface a single "80% chance above $X in 12 months" number. Backend endpoint `POST /api/portfolio/simulate`; simulation math uses numpy (already installed). Decision needed: confidence interval bands to show, time horizon options. — same scanner/watchlist/portfolio/backtest experience for the Egyptian Exchange 30. yfinance supports `.CA` suffix tickers. Degraded fields expected: analyst price targets, forward P/E (sparse coverage). New complexity: EGP currency label in UI, SPY benchmark swap for backtest. Scope: new ticker list in `data_fetcher.py`, new universe option in frontend, currency indicator in StockRow. Decision needed: separate tab vs. separate section.

- One-tap refresh for a single stock: on the stock detail page, add a "Refresh" button that
  re-fetches `GET /api/stock/{ticker}` with a cache-bust query param. Backend already rescores
  on cache miss; `api.stock(ticker)` in `lib/api.ts` is the call to reuse.
  **Scope:** `app/stock/[ticker]/page.tsx`
- Sector badge score average: each sector filter pill on the scanner page should show the average
  score of stocks in that sector in small text (e.g. "Technology · avg 61"). Derive from the
  already-loaded `results` array — no extra API call. **Scope:** `app/scanner/page.tsx` only.
- Watchlist size guard + lazy loading: cap at ~50 tickers with a user-facing warning; or switch
  watchlist page to paginated/virtualised loading so large lists do not fire dozens of simultaneous
  `api.stock()` calls on mount (flagged by User Tester, Sprint 1)
- Star state cross-tab reactivity: `StockRow` and `DetailPanel` both init starred state once in
  `useEffect` and drift when both open simultaneously — fix with a `storage` event listener
- Sector badge hidden on mobile: `StockRow` hides the sector pill with `hidden sm:inline`; reconsider
  layout so the sector is visible on phones (primary use case)
- Watchlist count badge on nav entry (can be added once Watchlist is in primary nav — already done)
- Historical score chart on the stock detail page (data already available via `api.scoreHistory`)
- Alert / push notification when a watchlisted stock's score changes > 5 pts
- Dark/light theme toggle
- Sector rotation heatmap improvements (click cell to see stocks in that sector/month)
- Russell 1000 scanner results page (separate from S&P 500 tab)
- PDF export of backtest results
- Portfolio import via CSV
- News sentiment overlay on price chart
- Swipe-to-remove on watchlist cards (right-swipe gesture revealing delete action)
- Live watchlist badge count on the Watchlist nav tab (number bubble showing saved ticker count)

---

## ✅ DONE

### Sprint 6 — 2026-04-25: Multi-Profile System — DONE

Netflix-style profile picker replaces the landing page. Profiles stored server-side with optional PIN, all watchlist/portfolio data scoped per profile, persists across devices.
Commits: `a4f3a52`, `ea96232`, `ac7d785`

### Sprint 2 — 2026-04-23: Watchlist nav + touch target + empty-state copy fixes

**[READY-1] Watchlist nav entry + star UX polish (three fixes bundled) — completed Sprint 2 (2026-04-23)**
- **Sub-task A:** `Backtest` moved from `PRIMARY_NAV` to `MORE_NAV`; `Watchlist` inserted into
  `PRIMARY_NAV` (slot 3) with star SVG icon. **File:** `components/BottomNav.tsx`
- **Sub-task B:** Empty-state copy updated to accurately reference the star icon on scanner cards
  (no longer mentions a phantom "+" button). **File:** `app/watchlist/WatchlistClient.tsx`
- **Sub-task C:** Star `<button>` expanded to `min-w-[44px] min-h-[44px]` with `flex items-center
  justify-center` to meet WCAG 2.5.5 / Apple HIG 44 px minimum. **File:** `components/StockRow.tsx`
- Commit: `de7b8ce`

### Sprint 1 — 2026-04-23: Watchlist star on stock cards

**[READY-1] Watchlist — star icon on stock cards (scanner page integration) — completed Sprint 1 (2026-04-23)**
- Star button live on `StockRow.tsx`; fills gold when in watchlist, outline when not
- State initialised from `localStorage` on mount; `e.stopPropagation()` prevents accidental navigation
- `aria-label` toggles between "Add to watchlist" / "Remove from watchlist"
- QA fix: overlay-link pattern to resolve invalid `<button>` inside `<Link>` HTML
- Commits: `18c3d48` (feat), `9fe0178` (QA fix)

### Earlier sprints

- Universe selection landing page (S&P 500 vs Russell 1000)
- Bottom nav redesign (5 tabs + More tray)
- AI chat fix (input above nav bar)
- MarketStrip shows RUI index when Russell 1000 selected
- Price target renamed and recalculated to true 1-month horizon
- Cloud Run startup hang fixed (DB timeout + migration)
- Backtest "Status check failed" fixed (synchronous endpoint)
