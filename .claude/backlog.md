# EdgeScan Product Backlog

Items are ordered by priority. The Coder agent picks the top READY item each sprint.
After completing an item, move it to Done and promote the next item.

---

## 🔴 READY (pick from top)

### ✅ [DONE — Sprint 10] Score trend arrow on scanner stock cards

Completed 2026-05-04. New `TrendArrow.tsx` component. Green ↑ if score improved >3 pts vs
previous scan, red ↓ if dropped >3 pts, grey → if stable. Fetched lazily in `StockRow`
alongside price history — non-blocking, no crash on missing history.

---

### ✅ [DONE — Sprint 10] On-demand Scan Now button on scanner page

Completed 2026-05-04. New `POST /api/scan/request` endpoint (Bearer-token auth, returns
immediately) fires a background thread scanning all S&P 500 tickers. New `GET /api/scan/status`
returns in-progress flag + last_scanned_at. `ScanButton` client component polls every 8s, shows
Starting → Scanning → Done states, then calls `router.refresh()` when the new scan lands.

---

### ✅ [DONE — Sprint 8] Fix 7-day sparkline on scanner page

Completed 2026-05-03. Root cause was `Sparkline.tsx` using recharts `ResponsiveContainer` which
caused SSR hydration mismatches preventing the chart from ever mounting. Fixed by replacing with a
pure SVG polyline — no external library, no SSR issues. `StockRow.tsx` already fetched price
history client-side via `api.priceHistory`; sparklines now render correctly on desktop.

---

### ✅ [DONE — Sprint 8] Touch-target audit: watchlist X + More tray close button

Completed 2026-05-03. Watchlist card X button expanded to `min-w-[44px] min-h-[44px]`.
More tray close button expanded to 44px hit zone with visual circle on inner `<span>`.

---

### ✅ [DONE — Sprint 8] Toast/snackbar after starring a stock

Completed 2026-05-03. New `Toast.tsx` component (fixed-position, CSS fade in/out, auto-dismiss
after 2s). Wired into `StockRow.tsx` — each star tap shows "AAPL added to watchlist" or
"AAPL removed from watchlist".

---

### ✅ [DONE — Sprint 7] Friends leaderboard with podium + weekly/monthly rewards

Completed 2026-05-03. `/leaderboard` page with gold/silver/bronze podium for top 3, ranked list
for 4th+, badge system (👑⚡🥇🚀), YOU indicator, stats strip. Backend `GET /api/leaderboard`
ranks all profiles by portfolio return, computes 7d/30d performance, assigns badges server-side.
Sessions migrated from in-memory dict to `profile_sessions` DB table — logins now survive
backend restarts. Leaderboard added to More tray nav.

---

### ✅ [DONE — Sprint 5] Add watchlist star button to the stock detail page

Completed 2026-04-23. New `WatchStar.tsx` client component added; star appears in the stock
detail page header with 44px touch target, localStorage sync, and cross-component event dispatch.
Commits: `0359636` (feat), `ebcc310` (QA sync fix).

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

### ✅ [DONE — Sprint 9] Industry multiples panel on stock detail page

Completed 2026-05-04. New `GET /api/stock/{ticker}/industry-multiples` endpoint computes sector
peer medians from DB (no extra yfinance calls). New `IndustryMultiples.tsx` client component
renders below MonteCarloPanel showing P/E (Fwd), P/S, EV/EBITDA, P/B vs sector median — green ↓
if cheaper, red ↑ if richer. Scanner now also stores trailing_pe, price_to_sales, price_to_book,
ev_ebitda for all future scans.

---

### ✅ [DONE — Sprint 9] Value-based portfolio position entry (non-destructive)

Completed 2026-05-04. Portfolio add-position form now takes "Amount Invested ($)" + "Price Per
Share ($)" instead of raw share count. Shares derived server-side (amount ÷ price). Adding a
ticker you already hold now accumulates with weighted average cost basis instead of overwriting.

---

### ✅ [DONE — Sprint 9] Unified smart search — name + ticker autocomplete everywhere

Completed 2026-05-04. New shared `TickerSearch` component with arrow-key navigation, live
dropdown showing TICKER · Company Name · $price. Backend `GET /api/search` now queries DB by
ticker OR company name substring (no longer static-list only). Deployed to all three inputs:
universal search page, watchlist add, portfolio add-position (price auto-fills on selection).

---

### [READY-10] Newsletter integration

Allow EdgeScan to feed a periodic newsletter (weekly or bi-weekly) with content auto-generated from live scan data. Intended for publishing to subscribers outside the app.

- **Content candidates:** top 5 scanner picks this week, biggest score movers (up/down), sector rotation summary, one featured stock deep-dive (score breakdown + Monte Carlo snapshot).
- **Delivery options to decide:** (a) generate a static HTML email template that the owner exports manually, (b) integrate with a service like Resend or Buttondown via API, (c) a `/newsletter-preview` page in the app that renders the draft.
- Backend: `GET /api/newsletter/weekly-digest` endpoint that assembles the data payload.
- No subscriber management needed in v1 — the publishing platform handles the list.
**Decision needed:** delivery mechanism (manual export vs. Resend/Buttondown API vs. in-app preview page). Confirm before implementation.

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
