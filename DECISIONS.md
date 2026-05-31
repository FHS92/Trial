# EdgeScan — Architectural Decisions

Decisions made during v2 implementation. Each entry records the choice, rationale, alternatives considered, and any license/cost reference where relevant.

---

## Phase 0 — Audit Findings

### D-000: Repository structure unchanged

**Decision:** All v2 EdgeScan work occurs under `edgescan/`. The FactCanvas project at the repo root is left completely untouched.

**Rationale:** They are independent projects sharing a monorepo. Touching the root risks breaking FactCanvas.

---

## Phase 1 — Data Provider  *(to be filled after provider evaluation)*

### D-101: Primary data provider

**Status:** PENDING — requires product owner approval (🔴 REVIEW-REQUIRED phase).

**Candidates to evaluate:**
- **Polygon.io** — Business plan explicitly permits redistribution/display to end users. Strong REST + WebSocket. Best fit for price data and aggregates. Evaluate current plan pricing at build time.
- **Tiingo** — Clean EOD + fundamentals. Commercial/redistribution license available via sales (standard tiers are internal-use only — must upgrade). Cost-effective for EOD-oriented products.
- **Financial Modeling Prep** — Broad fundamental data. Verify redistribution terms before selecting.
- **EODHD** — Global coverage, EOD focus. Redistribution terms vary by plan.

**Decision rule (per spec §3.3):** Choose the provider(s) whose license **explicitly permits displaying data to paying end users**, with EOD freshness. Record the specific plan tier and the relevant license clause below.

**Chosen provider:** `_________`  
**Plan tier:** `_________`  
**License clause / page reference:** `_________`  
**Monthly cost estimate:** `_________`

### D-102: Fallback/secondary provider

**Status:** PENDING — selected alongside D-101.

**Chosen fallback:** `_________`  
**Plan tier:** `_________`  
**License clause / page reference:** `_________`

### D-103: yfinance retained as dev-only adapter

**Decision:** `yfinance` remains in the codebase behind the `DataProvider` abstraction, selectable via `DATA_PROVIDER_PRIMARY=yfinance` in `.env.local`. It is **never** activated in production (any environment where `STRIPE_SECRET_KEY` is a live key or where real users are billed).

**Rationale:** Lowest-friction local dev without API keys. Flagged prominently in code and docs.

---

## Phase 2 — Data Model  *(to be filled)*

### D-201: ORM choice

**Status:** PENDING. Current backend uses SQLAlchemy. v2 spec requires Prisma (Next.js) + SQLAlchemy (FastAPI) sharing the same PostgreSQL schema. Decision: adopt Prisma for migrations and type-safe frontend access while keeping SQLAlchemy for the FastAPI data layer reading the same DB.

---

## Phase 3 — Authentication  *(to be filled)*

### D-301: Auth strategy

**Decision:** Auth.js v5 (`next-auth@5.0.0-beta.25`) with Credentials + Google OAuth providers. JWT sessions stored in the `authjs.session-token` httpOnly cookie (JWE, A256CBC-HS512). FastAPI decrypts the same cookie using a Python HKDF+python-jose implementation that mirrors Auth.js v5's `@auth/core` key derivation exactly. Shared `AUTH_SECRET` across both services.

**Key derivation:** `HKDF(SHA-256, salt="authjs.session-token", info="Auth.js Generated Encryption Key", length=64)` applied to `AUTH_SECRET`.

**JWT payload:** `{ sub/id, tier, is_admin }` — embedded by custom `jwt` + `session` callbacks.

**Rationale:** `fastapi-nextauth-jwt` was considered but doesn't support Auth.js v5's A256CBC-HS512 JWE format. Manual HKDF derivation via Python's `cryptography` package and `python-jose` provides exact parity. The approach avoids a third-party dependency on an unmaintained library.

**Google sign-in:** Auth.js `signIn` callback calls `POST /api/v1/auth/google-upsert` to create/link users in FastAPI's DB immediately upon OAuth login. `tier` and `is_admin` then appear in subsequent JWTs.

**Dev bootstrap:** `Bearer <email>` where email ∈ `ADMIN_EMAILS` env var; creates the admin user if not present. Disabled automatically when `ADMIN_EMAILS` is empty.

**Migration:** No migration from v1 PIN profiles — v2 uses real email/password accounts. Users register fresh.

---

## Phase 5 — Billing  *(to be filled)*

### D-501: Billing stack

**Decision:** Stripe Checkout + Customer Portal + Webhooks. No custom card forms.

**Rationale:** Per spec §6.1. Stripe handles PCI compliance, SCA, dunning, and the portal UI. Reduces liability and maintenance burden.

### D-502: Pricing

**Decision:** $15/month or $144/year (2 months free). Configured via env vars `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_PRO_ANNUAL`. Never hardcoded.

**Rationale:** Per spec §5.4.

---

## Phase 6 — Compliance  *(to be filled)*

### D-601: Financial disclaimer placement

**Status:** PENDING. Disclaimers required on: stock page, scanner, backtest, AI Chat output, `/methodology`, footer.

---

## Standing Rules

- **No `yfinance` in production.** If a paying user can reach it, it's production.
- **Tier enforcement is always server-side.** UI locks are cosmetic; API guards are authoritative.
- **All prices via env vars.** Never hardcode pricing.
- **Webhook is source of truth for billing state.** Never flip tier from client.
- **Grandfather existing subscribers** if pricing changes; document the policy here.
