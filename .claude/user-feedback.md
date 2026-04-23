# EdgeScan User Feedback Log

Written by the User Tester agent after each sprint. The PM agent reads this at the start of every sprint.

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
