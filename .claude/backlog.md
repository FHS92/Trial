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

### ✅ [DONE — Sprint 11] Leaderboard transparency + drill-down + time windows

Completed 2026-05-04.
- **LB-1 (transparency):** `fmtDollar` + `timeAgo` helpers; BADGE_META extended with `desc`;
  `HowItWorks` collapsible explains return formula, 7d/30d windows, badge criteria; podium + rank
  rows show $ gain; header timestamp uses "Xm ago" instead of raw ISO.
- **LB-2 (drill-down):** New `GET /api/leaderboard/profile/{profile_id}/holdings` backend endpoint
  (auth required, public to all logged-in profiles). `HoldingsModal` bottom-sheet shows invested /
  current value / gain-loss summary strip + per-holding cards (ticker, name, shares, avg→current
  price, $ P&L, position weight % bar). Tap any podium card or rank row to open.
- **LB-3 (time windows):** `WindowTabs` pill bar (All time | 7 days | 30 days). `rankEntries()`
  re-sorts + re-numbers entries client-side for the active window. Podium + RankRow show the
  active-window return as primary headline; secondary context shows other windows grayed.

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

### ✅ [DONE — Sprint 10] Score trend arrow on scanner stock cards (was READY-6)

Completed 2026-05-04. See Sprint 10 entry above.

---

### ✅ [DONE — Sprint 10] Last-scanned timestamp banner (was READY-8)

Completed 2026-05-04. Clock icon + "Last scanned Xm/Xh/Xd ago · N stocks" banner built into
the scanner page header alongside the Scan Now button. See Sprint 10 entry above.

---

### [READY-5] Mobile-friendly comparison page

The compare page table (`app/compare/page.tsx`) uses a CSS grid with fixed pixel columns
(`gridTemplateColumns: '160px repeat(…)'`) which overflows on small screens.
- Below 640 px: render each stock as a vertically stacked card instead of columns.
- The `MetricRow` component should collapse to a labelled list item per stock on mobile.
- Use Tailwind responsive prefixes (`sm:`) and existing dark-palette CSS variables — no new colours.
**Scope:** `app/compare/page.tsx` only.

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

### [READY-10] Newsletter integration

Allow EdgeScan to feed a periodic newsletter (weekly or bi-weekly) with content auto-generated from live scan data. Intended for publishing to subscribers outside the app.

- **Content candidates:** top 5 scanner picks this week, biggest score movers (up/down), sector rotation summary, one featured stock deep-dive (score breakdown + Monte Carlo snapshot).
- **Delivery options to decide:** (a) generate a static HTML email template that the owner exports manually, (b) integrate with a service like Resend or Buttondown via API, (c) a `/newsletter-preview` page in the app that renders the draft.
- Backend: `GET /api/newsletter/weekly-digest` endpoint that assembles the data payload.
- No subscriber management needed in v1 — the publishing platform handles the list.
**Decision needed:** delivery mechanism (manual export vs. Resend/Buttondown API vs. in-app preview page). Confirm before implementation.

---

### [READY-11] Portfolio delete holding

There is currently no way to remove a position from a portfolio — a critical missing CRUD op.
- Backend: `DELETE /api/portfolio/{ticker}` (auth required, scoped to the caller's profile).
- Frontend: trash icon button on each holding card in `app/portfolio/page.tsx`.
- Confirmation: either an inline confirm ("tap again to remove") or a small modal — no accidental deletes.
**Scope:** `app/portfolio/page.tsx`, `edgescan/backend/main.py`.

---

### [READY-12] Similar stocks panel on stock detail

Below the Industry Multiples panel, show "You might also like" — 3–5 stocks with the same sector and the closest score to the current ticker.
- Backend: `GET /api/stock/{ticker}/similar` — pure DB query on latest `scan_results` filtering by sector + ordering by `ABS(score - this_score)`.
- Frontend: new `SimilarStocks.tsx` client component, each result is a tappable pill/card linking to that ticker's detail page.
- No yfinance calls, no extra cost.
**Scope:** new endpoint in `main.py`, new `components/SimilarStocks.tsx`, wired into `app/stock/[ticker]/page.tsx`.

---

### [READY-13] Portfolio value history chart

Show how the total portfolio value has changed over time as a line chart on the Portfolio page.
- Backend: `GET /api/portfolio/history` — for each date in `price_history`, compute `SUM(shares × close)` across all holdings. Returns `[{date, value}]` array.
- Frontend: SVG polyline chart (same pattern as the sparkline — no recharts SSR issues). Show below the summary strip in `app/portfolio/page.tsx`.
- No new data needed — `price_history` already exists from scans.
**Scope:** new endpoint in `main.py`, chart component in `app/portfolio/page.tsx`.

---

### [READY-14] Score distribution histogram on scanner

Give users a sense of calibration: show a small histogram of all current scores so "72" has context against the full S&P 500 distribution.
- Derive from the already-loaded `results` array on the scanner page — no extra API call.
- Render as a small inline bar chart (10 buckets: 0–10, 10–20 … 90–100), with the user's currently visible sector highlighted.
- Place below the sector pills, collapsed by default (expandable chevron).
**Scope:** `app/scanner/page.tsx` only — client-side derivation from existing data.

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

- **Earnings calendar** — `/earnings` page (or scanner sidebar) listing upcoming earnings in the next 30 days for watchlisted and top-scoring stocks. `earnings_date` is already stored in `scan_results`. Pure DB query, no yfinance calls.
- **Head-to-head profile compare** — shareable `/leaderboard/vs/[a]/[b]` page comparing two profiles: overall + 7d/30d return side-by-side, holdings they share vs. differ, who's ahead in each metric. Extends the leaderboard momentum with zero new backend data.
- **Share a stock card** — on stock detail, a "Share" button that triggers the Web Share API (mobile) or copies a pre-formatted text snippet: "AAPL · Score 78 · +14.2% upside via EdgeScan". No backend needed.
- **Scheduled scan (Cloud Scheduler)** — add a Cloud Scheduler job that POSTs to `/api/scan/request` daily at market close (~4 pm ET). No code change — deployment config only. Ensures the data stays fresh without manual "Scan Now" triggers.
- **Portfolio Monte Carlo simulator** — on the Portfolio page, run 1,000 simulated price paths forward 252 trading days using each holding's historical volatility and drift. Render a probability fan chart (median, 10th/90th percentile bands) and surface a single "80% chance above $X in 12 months" number. Backend endpoint `POST /api/portfolio/simulate`; simulation math uses numpy (already installed). Decision needed: confidence interval bands to show, time horizon options.
- **Egyptian Exchange 30 universe** — same scanner/watchlist/portfolio/backtest experience for the EGX30. yfinance supports these tickers. Degraded fields expected: analyst price targets, forward P/E (sparse coverage). New complexity: EGP currency label in UI, SPY benchmark swap for backtest. Decision needed: separate tab vs. separate section.
- **Historical score chart on stock detail** — line chart of score over time using `api.scoreHistory` data already available. Small SVG polyline, placed in the score breakdown section.
- **One-tap refresh for a single stock** — on the stock detail page, add a "Refresh" button that re-fetches `GET /api/stock/{ticker}` with a cache-bust query param. Backend already rescores on cache miss. **Scope:** `app/stock/[ticker]/page.tsx`
- **Sector badge score average** — each sector filter pill on the scanner page shows the average score of stocks in that sector in small text (e.g. "Technology · avg 61"). Derive from the already-loaded `results` array — no extra API call. **Scope:** `app/scanner/page.tsx` only.
- **Watchlist size guard + lazy loading** — cap at ~50 tickers with a user-facing warning; or switch watchlist page to paginated/virtualised loading so large lists do not fire dozens of simultaneous `api.stock()` calls on mount.
- **Star state cross-tab reactivity** — `StockRow` and `DetailPanel` both init starred state once in `useEffect` and drift when both open simultaneously — fix with a `storage` event listener.
- **Sector badge hidden on mobile** — `StockRow` hides the sector pill with `hidden sm:inline`; reconsider layout so the sector is visible on phones (primary use case).
- **Alert / push notification** — when a watchlisted stock's score changes > 5 pts between scans. Requires a web push setup or email hook.
- **Dark/light theme toggle** — CSS variable swap; all colours are already in variables.
- **Sector rotation heatmap improvements** — click a cell to see the stocks in that sector/month.
- **Russell 1000 scanner results page** — separate from the S&P 500 tab.
- **PDF export of backtest results** — browser print-to-PDF or a server-side PDF generation endpoint.
- **Portfolio import via CSV** — bulk upload holdings from a broker export.
- **News sentiment overlay on price chart** — annotate the sparkline/detail chart with news events and their sentiment score.
- **Swipe-to-remove on watchlist cards** — right-swipe gesture revealing a delete action (mobile UX pattern).

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
