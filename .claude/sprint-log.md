# EdgeScan Sprint Log

Each sprint entry is written by the sprint coordinator after all 4 agents complete.

---

<!-- Sprint entries will be prepended here by the /sprint command -->

---
## Sprint 5 — 2026-04-23
**Feature:** WatchStar on stock detail page
**Discovered via:** Alex (AI user workshop)
**Coder commit:** 0359636 / QA fix: ebcc310
**QA verdict:** SHIP IT — TypeScript clean, all acceptance criteria passed, bonus cross-component sync added
**What shipped:** Users can now star/unstar a stock directly from the detail page header, whether they arrived via Search or a direct link.

---
## Sprint 4 — 2026-04-23 (4 parallel teams)

**Merged commits:** `84a5bf7` (team-1) · `0595c5c` (team-3) · `0432c76` (team-4)

| Team | Feature | File | Result |
|------|---------|------|--------|
| 1 | Sparkline visible on mobile | `StockRow.tsx` | ✅ shipped — `hidden md:block` removed, rank badge hidden on mobile |
| 2 | Star on stock detail page | `app/stock/[ticker]/page.tsx` | ❌ rate limit hit — not implemented |
| 3 | Last-scanned timestamp banner | `app/scanner/page.tsx` | ✅ shipped — clock icon + "Last scanned Xm ago · N stocks" |
| 4 | Mobile comparison page | `app/compare/page.tsx` | ✅ shipped — stacked cards on mobile, grid on desktop |

**Note:** Agents shared a single git working tree so branches got mixed commits. Resolved by cherry-picking the 3 clean commits directly. Team 2 (star on detail page) is rolled back to backlog for next sprint.

---
## Sprint 3 — 2026-04-23

**Built:** Fix 7-day sparkline — pass OHLCV history to StockRow so price charts actually render.
**Commit:** `3cfed39`

**PM Decision:** Sparkline permanently empty is the most universally broken element — visible to 100% of scanner users. One-file fix in `scanner/page.tsx`: fetch `api.priceHistory` in parallel via `Promise.allSettled` for displayed stocks, pass result to each `<StockRow>`.

**Coder Report:** `scanner/page.tsx` — added `OHLCVBar` type import, inserted parallel `Promise.allSettled` fetch for displayed stocks, built `Map<string, OHLCVBar[]>`, passed `history` prop to each `<StockRow>`. TS clean. Commit `3cfed39`.

**QA Report:** All clean — no browser globals in `api.priceHistory`, `displayed` defined before fetch block, graceful `?? []` fallback if API is down, `OHLCVBar` shape matches across all files. Zero TS errors. No fix needed.

**User Report:** Fix is structurally correct and colour convention (green/red) is readable — but the sparkline column is wrapped in `hidden md:block`, making it invisible on all phones. The sprint's benefit is currently zero for mobile users. Also: no label indicating what the line represents (7-day?), and the 80×32px canvas too small to read without a `+3.2%` number beside it.

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
