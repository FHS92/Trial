# EdgeScan User Feedback Log

Written by the User Tester agent after each sprint. The PM agent reads this at the start of every sprint.

---

## 2026-04-23 — Sprint 5 Workshop (Alex)
**Pain points raised:**
- No star/save button on stock detail page (primary blocker — Search is >50% of entry points)
- Watchlist star tap has no reliable confirmation (badge count more trustworthy than gold fill alone)
- Score is a black box — no explanation for why it changed (want top reason, not full data dump)
- "Scanning now..." has no progress signal — users close the tab thinking backend crashed
- Sector pills hidden on mobile so sector filter feels invisible/broken

**Features considered:**
- A. WatchStar on detail page — star button in header using existing helpers — effort: S
- B. Live watchlist badge count on nav tab — reactive count bubble — effort: S
- C. Score breakdown panel — sub-scores + top reason sentence on detail page — effort: L

**Built:** WatchStar on stock detail page (Feature A)

---

## 2026-04-23 — Sprint 3 feedback

**Feature tested:** 7-day sparkline on stock cards

**Works well:**
- The fix is architecturally correct: `scanner/page.tsx` now uses `Promise.allSettled` to fetch price history in parallel for the displayed stocks only (≤10), so the page load does not get slower than its slowest individual API call, and a single failed ticker does not take down the whole list.
- The green/red colour convention (`#22d47e` for up, `#f75f5f` for down) is consistent with the upside percentage already shown on each card, so the colour meaning is reinforced rather than introduced cold. A first-time user who reads "green = good" from the upside label will naturally apply that to the sparkline.
- `isAnimationActive={false}` is the right call for a list component — animated charts in a scrolling list feel distracting and burn battery on low-end Android phones. Good default.
- Falling back to an empty `[]` array via `historyMap.get(stock.ticker) ?? []` means a network failure on one ticker's history silently degrades (no sparkline shown) rather than crashing the row. The `data.length < 2` guard in `Sparkline.tsx` renders a same-size blank placeholder, so the layout does not shift.

**Issues / confusing parts:**
- **The sparkline is hidden on mobile (`hidden md:block`).** The entire point of this sprint was to give retail investors a quick price-trend read on the scanner. But on a phone — the stated primary device — the sparkline column is display-none. Users on screens narrower than the `md` breakpoint (768px) get no chart at all. The fix exists but is functionally invisible to the majority of the user base.
- **No label or tooltip identifies what the line represents.** The sparkline sits between the company name and the price with no caption. Is it 7 days? 1 month? Today's intraday? There is nothing in the UI to tell me. The data is sliced as `.slice(-7)` from a `1w` fetch, which should be 5 trading days, not 7 calendar days — that ambiguity compounds the confusion.
- **The chart is very small (80×32px) even on desktop.** At that size, a near-flat line from a low-volatility stock is visually indistinguishable from a slightly-moving one. The Recharts `LineChart` has no Y-axis domain set, which means a stock that moved from $100.01 to $100.05 looks as dramatic as one that moved from $80 to $120. Relative scaling is correct for sparklines, but without any reference point (start price, end price, % change) the shape alone is not enough to act on.
- **`slice(-7)` on a `1w` API response can return fewer than 5 points.** If the history endpoint returns daily OHLCV bars and the week includes a holiday, the slice might produce 3–4 bars. With 3 data points the "sparkline" is just two line segments and conveys almost nothing. The `data.length < 2` guard prevents a crash but does not protect against visually misleading near-empty charts.
- **No loading state.** The history fetch happens server-side in the RSC, so the user sees a full-page loading gap before any content appears. If one ticker's history call is slow (e.g., cold cache), the entire scanner page is delayed. There is no skeleton or progressive reveal — the list either appears complete or not at all.

**Missing / wish it had:**
- A tiny percentage-change label next to the sparkline (e.g., "+3.2%") so I can read the weekly move in numbers, not just as a shape. Even at 80px wide there is room for a 4-character label to the right of the chart.
- A visible label — even just "7d" in the faintest possible grey — below or beside the sparkline so the time window is explicit without any tooltip interaction required.
- An area fill under the line (like the score sparkline on the detail page already does) to make the chart easier to read at small sizes. The detail page's `ScoreSparkline` uses an SVG area fill with `rgba(79,142,247,0.08)` — the same technique would make the price sparkline feel substantially more polished at 80px.

**New backlog suggestions:**
1. **Show the sparkline on mobile** — remove `hidden md:block` from the sparkline wrapper in `StockRow.tsx`, or reduce it to `hidden sm:block` so the chart appears from 640px upwards. If the row becomes too cramped, consider dropping the rank number (least informative column) on small screens instead of the chart.
2. **Add a percentage-change badge to each sparkline** — compute `((last - first) / first * 100).toFixed(1)` inside `StockRow` and render it as a small coloured label (green/red matching the line) to the right of the `Sparkline` component. This turns a decorative shape into an actionable data point without adding a separate column.
3. **Label the time window and add an area fill** — add a `"7d"` caption in muted text beneath each sparkline so the window is unambiguous, and pass a `fill` prop to `Sparkline.tsx` to render a translucent area under the line (matching the approach already used on the detail page's score chart), improving readability at the current 32px height.

---

## 2026-04-23 — Sprint 2 feedback

**Feature tested:** Watchlist nav + touch target fixes

**Works well:**
- Watchlist is now exactly where it should be — slot 3 in the primary bottom nav (Scanner / Search / Watchlist / Portfolio). One tap from anywhere in the app. This fixes the biggest friction point flagged in Sprint 1 where starred stocks were essentially unreachable.
- Moving Backtest to the More tray is a sensible trade-off. Backtest is a deliberate, sit-down workflow; nobody needs it mid-scroll. Power users will find it in the tray without trouble, and the tray itself is well organised with 8 items in a 4-column grid.
- The empty-state copy is now accurate: "Tap the star on any stock card in the scanner, or use the search field above." Matches exactly what the UI shows. First-time users will no longer be hunting for a phantom "+" button.
- The 44x44px minimum touch target on the star button (implemented as `min-w-[44px] min-h-[44px]` on the button element) is a real improvement. During a fast thumb-scroll session I stopped accidentally triggering card navigation when aiming for the star.
- The star icon itself scales nicely: 16px SVG centred in the 44px hit zone feels proportional — the button does not look bloated.

**Issues / confusing parts:**
- **The More tray close button (24x24px, `w-6 h-6`) is too small.** After the star fix, the close X on the tray is the only obvious sub-44px interactive target left in the nav surface. On a phone held in portrait one-handed, it is easy to miss and dismiss the tray by tapping the backdrop instead — which works, but the dedicated button should also meet the 44px standard.
- **The More tray animation has a CSS bug.** Both the open and closed states set `bottom: '4.5rem'`; the slide effect is achieved entirely via `transform: translateY(calc(100% + 4.5rem))` when closed. This means the tray is always rendered at the same `bottom` value and the transform shifts it off-screen. It works visually, but during the closing animation on older/slower Android browsers there is a brief flash because the tray is technically "in place" before the transform is applied. A cleaner approach would be `bottom: '4.5rem'` open and `bottom: '-100%'` (or `visibility: hidden` after transition) closed.
- **The stock detail page (`/stock/[ticker]`) has no star/watchlist button.** The back-arrow in the header goes to `/` (home/scanner) — good. But there is no way to star a stock while reading its detail view. The `DetailPanel` component presumably handles this, but looking at the page shell there is no watchlist toggle exposed at the page level. A user who discovers a stock via Search, taps through to the detail page, and wants to save it has no path to do so without going back to the scanner.
- **The scanner page passes no `history` prop to `StockRow`.** `StockRow` accepts a `history?: OHLCVBar[]` prop for the 7-day sparkline, but `scanner/page.tsx` calls `<StockRow key={stock.ticker} stock={stock} rank={i + 1} />` with no `history`. The sparkline will always render as empty / default, making that column of the card dead weight on every page load.
- **Watchlist remove button (14px icon, `p-1` padding) is still under 44px.** The sprint fixed the star button on stock cards in the scanner, but the X button on each `WatchlistCard` in the watchlist page was not updated. It renders as roughly 22x22px — easy to miss or accidentally tap the card row (which navigates to the detail page) instead.

**Missing / wish it had:**
- A **toast/snackbar confirmation** after starring ("AAPL added to watchlist") so I have positive feedback without leaving the scanner. The star turns gold which is good, but a brief text confirmation would eliminate doubt, especially after accidental taps.
- A **live watchlist badge count** on the Watchlist nav tab (a small number bubble, similar to iOS notification badges) showing how many tickers are saved. Right now I have to tap through to the watchlist page to know if anything is there.
- **Swipe-to-remove** on watchlist cards. The X button is small and in an awkward thumb-reach zone. A right-swipe gesture revealing a delete action would feel far more natural on mobile.

**New backlog suggestions:**
1. **Fix the Watchlist remove button touch target** — the X on each `WatchlistCard` currently sits at around 22x22px. Apply the same `min-w-[44px] min-h-[44px]` treatment used on the scanner star button so the sprint's touch target standard is applied consistently across the whole watchlist experience.
2. **Add a watchlist star button to the stock detail page shell** — the `/stock/[ticker]/page.tsx` header has room for a star icon next to the ticker name. Without it, users who land on a detail page from Search or a direct link have no way to save the stock to their watchlist from that context.
3. **Pass OHLCV history to StockRow in the scanner page** — the sparkline column is built and ready but always renders empty because `scanner/page.tsx` omits the `history` prop. Fetching 7-day bars for the top 10 results alongside the scan data would make the scanner feel significantly more data-rich with no additional user action required.

---

## 2026-04-23 — Sprint feedback

**Feature tested:** Watchlist star on stock cards (scanner page)

**Works well:**
- The filled gold star vs. outlined grey star is immediately readable — I knew what it meant without any label.
- `e.preventDefault()` + `e.stopPropagation()` on the button means tapping the star never accidentally navigates to the stock detail page. That was the right call and it works correctly.
- The `title` / `aria-label` toggling between "Add to watchlist" and "Remove from watchlist" is a nice accessibility touch.
- State is correctly initialised from `localStorage` on mount via `useEffect`, so already-starred tickers show the gold star immediately when the scanner loads.
- The watchlist page itself has a search-to-add field with live autocomplete and a clean remove-by-X button per card — solid companion experience.

**Issues / confusing parts:**
- **No navigation link to the Watchlist from the scanner page.** The scanner header only has the EdgeScan logo and a `UniverseBadge`. The Watchlist is not in the primary bottom nav (Scanner / Search / Backtest / Portfolio). To reach it a user must open the More tray — but "Watchlist" does not appear there either! The Watchlist page exists at `/watchlist` but there is *no nav entry for it at all*. After starring 5 stocks I had no obvious way to find them again without typing the URL directly.
- **Star state is per-tab and not reactive across tabs.** Both `StockRow` and `DetailPanel` initialise `starred`/`watched` state once in `useEffect` and never re-sync. If I star a stock on the scanner and then open the stock detail page in the same tab, the detail page's "Watch" button correctly reflects the saved state — but if I have both open simultaneously, they drift. Minor, but worth noting.
- **Empty watchlist hint is misleading.** When the watchlist is empty, the copy says *"Use the field above or the + button on any stock detail page."* There is no dedicated `+` button on the stock detail page — the control there is labelled "☆ Watch", styled as a small pill tag inside the `<h1>`. A first-time user looking for a `+` button will be confused.
- **Star tap target is very small on mobile (16 × 16 px icon inside a `p-1` button).** On a phone in a fast scroll session I frequently missed it and hit the card link instead, navigating away. Apple HIG recommends 44 × 44 pt minimum touch targets.
- **No cap or warning on watchlist size.** `toggleWatchlist` will happily grow the list to 200+ tickers. The watchlist page fetches each ticker individually via `api.stock(ticker)` — with a large list this fires dozens of concurrent requests and the page stalls loading.
- **Sector badge hidden on small screens.** The sector pill on `StockRow` has `hidden sm:inline`, so on a phone (the primary use case) the sector is invisible. The score ring and upside are visible, but with no sector label the star is the only interactive element and the row feels sparse.

**Missing / wish it had:**
- A **Watchlist tab in the bottom nav** (replace or supplement Portfolio, or add a star icon to the primary bar) so I can get there in one tap.
- A **brief toast/snackbar confirmation** ("AAPL added to watchlist") after tapping the star, so I know it worked without having to navigate away to verify.
- **Watchlist count badge** on whatever nav entry links to the watchlist (e.g., a small number bubble showing how many tickers are saved), similar to an unread-messages badge.

**New backlog suggestions:**
1. **Add Watchlist to primary bottom nav** — either replace the rarely-used Backtest tab in the 4-slot primary bar with a star/watchlist icon, or promote it from the hidden More tray. This is a must-have now that users can star from the scanner; the feature is half-built without a visible path to view saved tickers.
2. **Increase star button touch target** — wrap the 16 px SVG in a `min-w-[44px] min-h-[44px]` container (visually centred) so the tap area meets mobile usability standards and accidental card navigations are reduced.
3. **Add a watchlist size guard + lazy loading** — cap the watchlist at a reasonable number (e.g., 50 tickers) with a user-facing message, or switch the watchlist page to paginated / virtualised loading so 20+ tickers do not fire a wall of simultaneous API calls on mount.

---

## Initial notes (pre-sprint)

- The app feels solid but the scanner page could make it clearer when data is fresh vs stale.
- On mobile the bottom nav More tray is helpful but it takes two taps to get to AI Chat — used frequently.
- The backtest runs for a long time with no intermediate feedback — a progress % would help.
- Comparing stocks is great but the table is hard to read on a phone screen.
- Would love a way to save favourite stocks without having to go to the Portfolio page.
