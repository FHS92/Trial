# EdgeScan v2 — Deployment Guide

Services: Neon (DB) · Google Cloud Run (backend) · Vercel (frontend)

---

## 1 — Neon (already done)

Connection string is set as `DATABASE_URL` in Cloud Run.

---

## 2 — Google Cloud Run (backend)

### First deploy
In the Cloud Run console, create a new service:
- **Service name:** `edgescan-v2-backend`
- **Source:** this repo, directory `edgescan-v2/backend`
- **Port:** 8080

### Environment variables to set in Cloud Run
```
DATABASE_URL=<neon connection string>
AUTH_SECRET=<generate: openssl rand -base64 32>
ADMIN_EMAILS=f.h.said@gmail.com
INTERNAL_API_SECRET=<generate: openssl rand -hex 32>
CORS_ORIGINS=https://edgescan-v2.vercel.app
CORS_ORIGIN_REGEX=https://edgescan-v2.*\.vercel\.app
NEXT_PUBLIC_APP_URL=https://edgescan-v2.vercel.app
DATA_PROVIDER_PRIMARY=yfinance
ENV=production
```

After deploy, copy the Cloud Run URL (e.g. `https://edgescan-v2-backend-xxx.run.app`)

---

## 3 — Vercel (frontend)

- **Project name:** `edgescan-v2` (NOT `edgescan`)
- **Root directory:** `edgescan-v2/frontend`
- **Framework:** Next.js

### Environment variables to set in Vercel
```
NEXT_PUBLIC_API_URL=<your Cloud Run URL>
API_URL=<your Cloud Run URL>
AUTH_SECRET=<same value as Cloud Run>
NEXTAUTH_URL=https://edgescan-v2.vercel.app
INTERNAL_API_SECRET=<same value as Cloud Run>
NEXT_PUBLIC_APP_URL=https://edgescan-v2.vercel.app
```

---

## Local dev fix (Windows)

If login fails locally on Windows, change `API_URL` in `frontend/.env.local`:
```
API_URL=http://127.0.0.1:8000
```
Windows Node.js resolves `localhost` to IPv6 but uvicorn listens on IPv4 only.
