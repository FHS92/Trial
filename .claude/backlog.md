# EdgeScan Product Backlog

Items are ordered by priority. The Coder agent picks the top READY item each sprint.
After completing an item, move it to Done and promote the next item.

---

## 🔴 READY (pick from top)

### [READY-1] Watchlist — save favourite tickers to localStorage
User can tap a ⭐ icon on any stock card to add it to a personal watchlist stored in localStorage.
A "Watchlist" tab appears in the More tray and shows only those tickers with live scores.
**Scope:** frontend only — no backend changes needed.

### [READY-2] Score trend arrow on stock cards
Show a small ↑ ↓ → indicator next to each score on the scanner page, comparing current score
to the score from the previous scan (use the score-history endpoint).
Green arrow up if score improved >3 pts, red down if dropped >3 pts, grey flat otherwise.
**Scope:** frontend only.

### [READY-3] Sector badge score average
Each sector filter pill on the scanner page should show the average score of stocks in that sector
in small text below the sector name (e.g. "Technology · avg 61").
**Scope:** frontend — derive from the already-loaded top-opportunities data.

### [READY-4] Skeleton loading screens
Replace blank/spinner states with skeleton placeholder cards (grey animated pulses)
while the scanner is loading its initial data.
**Scope:** frontend only.

### [READY-5] Last-scanned timestamp banner
Show a subtle banner at the top of the scanner page: "Last scanned 42 min ago · 47 stocks".
Already available from the top-opportunities API response (last_scanned_minutes_ago, total_scanned).
**Scope:** frontend only.

### [READY-6] One-tap refresh for a single stock
On the stock detail page, add a "Refresh" button that calls POST /api/stock/{ticker}/refresh
(or just re-fetches GET /api/stock/{ticker} with cache-bust) so the user can get a fresh score
without waiting for the next full scan.
**Scope:** frontend only (the backend already rescores on cache miss).

### [READY-7] Mobile-friendly comparison page
The compare page table overflows on small screens. Convert it to vertically stacked cards
on mobile (< 640px) rather than a horizontal grid.
**Scope:** frontend responsive CSS only.

---

## 🟡 BACKLOG (not yet refined — PM should refine before marking READY)

- Alert / push notification when a watchlisted stock's score changes >5 pts
- PDF export of backtest results
- Dark/light theme toggle
- Sector rotation heatmap improvements (click cell to see stocks in that sector/month)
- Historical score chart on the stock detail page (data already available via score-history)
- Russell 1000 scanner results page (separate from S&P 500 tab)
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
