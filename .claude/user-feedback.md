# EdgeScan User Feedback Log

Written by the User Tester agent after each sprint. The PM agent reads this at the start of every sprint.

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
