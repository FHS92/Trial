# EdgeScan Sprint Log

Each sprint entry is written by the sprint coordinator after all 4 agents complete.

---

<!-- Sprint entries will be prepended here by the /sprint command -->

---
## Sprint 2 — 2026-04-23

**Built:** Watchlist nav + touch target + empty-state copy fixes (3 files, commit de7b8ce)

**PM Decision:** Bundle three Watchlist follow-ups — add Watchlist to PRIMARY_NAV (move Backtest to More tray), fix empty-state copy, enlarge star touch target to 44×44px.

**Coder Report:** BottomNav.tsx: Backtest moved to MORE_NAV, Watchlist inserted into PRIMARY_NAV with star icon. WatchlistClient.tsx: empty-state copy updated to reference the ⭐ star. StockRow.tsx: star button expanded to min-w/h-[44px]. TS clean. Commit de7b8ce.

**QA Report:** All clean — zero TS errors. BottomNav now 4+4 (perfect 2×4 MORE grid). Overlay-link pattern from Sprint 1 intact. No bugs found, no fix commit needed.

**User Report:** Single-tap Watchlist now works. Backtest in More tray is acceptable. Two gaps: X button on watchlist cards (~22px) and More tray close button (24px) still under 44px threshold — touch-target fix is incomplete. Critical finds: stock detail page has no star button (users arriving via Search can't save a stock), and the 7-day sparkline on every stock card is permanently empty (no OHLCV data passed to StockRow).

---
## Sprint 1 — 2026-04-23

**Built:** Watchlist ⭐ star button on stock cards — users can now save tickers directly from the scanner page.
**Commits:** `18c3d48` (feat) → `9fe0178` (QA fix: overlay link pattern)

**PM Decision:** Build READY-1 — watchlist star on StockRow.tsx using existing `loadWatchlist`/`toggleWatchlist` from WatchlistClient.tsx. Highest-impact, frontend-only, addresses top user feedback item.

**Coder Report:** Converted StockRow.tsx to `'use client'`, added starred state initialised from localStorage in useEffect, rendered a 16px SVG star button with filled/outline states. TypeScript clean. Pushed as commit 18c3d48.

**QA Report:**
- Imports verified — both functions exist and signatures match
- SSR safety confirmed — localStorage only accessed inside useEffect
- **Bug found & fixed:** `<button>` inside `<Link>` is invalid HTML; fixed with overlay-link pattern (Link as absolute inset-0 overlay, star button as z-1 sibling). Added `type="button"` to prevent accidental form submission.
- Pushed fix as commit 9fe0178

**User Report:** Star mechanic is visually intuitive and localStorage persistence works correctly. Critical gap: Watchlist page has no nav entry — users can star stocks but can't find them again without typing the URL. Star touch target (16px) too small for mobile. Empty state copy references a "+ button" that doesn't exist. No toast confirmation after starring. Feature is half-built without a nav link.
