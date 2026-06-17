import type {
  ScanResult,
  ScannerResponse,
  OHLCVBar,
  WatchlistItem,
  SubscriptionInfo,
  PortfolioResponse,
  PortfolioHistoryResponse,
  TransactionPayload,
} from './types'

export type { PortfolioResponse, PortfolioHistoryResponse } from './types'

// Client-side calls go through the Next.js proxy at /api/v1 (same-origin, auth injected server-side)
const V1 = '/api/v1'

// For server-side fetches: use internal service URL when available (avoids external round-trip in containers)
const SERVER_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const SERVER_V1 = `${SERVER_BASE}/api/v1`
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? ''

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${V1}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body?.error?.message ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Server-side fetch: forwards the incoming request's Cookie header to the backend.
// Call with: const cookieHeader = (await cookies()).getAll().map(c => `${c.name}=${c.value}`).join('; ')
// Optionally pass sessionUser to inject X-Internal-Secret trusted auth headers (bypasses JWE decryption).
// NOTE: do NOT use (await cookies()).toString() — it encodeURIComponent-encodes values, corrupting session tokens.
export async function serverFetch<T>(
  path: string,
  cookieHeader: string,
  init?: RequestInit,
  sessionUser?: { id: string; tier: string; isAdmin: boolean } | null,
): Promise<T> {
  const authHeaders: Record<string, string> = {}
  if (sessionUser?.id && INTERNAL_SECRET) {
    authHeaders['x-internal-secret'] = INTERNAL_SECRET
    authHeaders['x-user-id'] = sessionUser.id
    authHeaders['x-user-tier'] = sessionUser.tier
    authHeaders['x-user-is-admin'] = String(sessionUser.isAdmin)
  }
  const res = await fetch(`${SERVER_V1}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { Cookie: cookieHeader, ...authHeaders, ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body?.error?.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export type AdminStatsResponse = {
  total_users: number
  pro_users: number
  free_users: number
  active_subscriptions: number
  new_users_7d: number
  new_users_30d: number
  conversion_rate: number
  total_scan_rows: number
  latest_scan: { started_at: string | null; completed_at: string | null; tickers_scanned: number }
}

export type AdminUserRow = {
  id: string
  email: string
  name: string | null
  tier: string
  is_admin: boolean
  created_at: string
  subscription: { status: string; plan: string; current_period_end: string | null; cancel_at_period_end: boolean } | null
}

export type AdminUsersResponse = {
  users: AdminUserRow[]
  total: number
  page: number
  per_page: number
  pages: number
}

export type AdminScanRun = {
  id: number
  started_at: string
  completed_at: string | null
  triggered_by: string
  tickers_attempted: number
  tickers_succeeded: number
  tickers_failed: number
  duration_s: number | null
  error: string | null
  data_source: string
}

export type AdminScanHistoryResponse = {
  runs: AdminScanRun[]
}

export type EarningsResponse = {
  tier: string
  earnings: {
    ticker: string
    name: string | null
    sector: string | null
    score: number | null
    earnings_date: string
    current_price: number | null
    upside_pct: number | null
  }[]
}

export const api = {
  scanner: {
    list: (params?: { sector?: string; limit?: number }) => {
      const q = new URLSearchParams()
      if (params?.sector) q.set('sector', params.sector)
      if (params?.limit) q.set('limit', String(params.limit))
      const qs = q.toString()
      return apiFetch<ScannerResponse>(`/scanner${qs ? `?${qs}` : ''}`)
    },
    movers: () =>
      apiFetch<{ risers: ScanResult[]; fallers: ScanResult[] }>('/scanner/movers'),
  },
  stocks: {
    detail: (ticker: string) => apiFetch<ScanResult>(`/stocks/${ticker}`),
    history: (ticker: string, period: '3m' | '6m' | '1y' = '1y') =>
      apiFetch<{ ticker: string; period: string; data: OHLCVBar[] }>(`/stocks/${ticker}/history?period=${period}`),
    scoreHistory: (ticker: string) =>
      apiFetch<{ ticker: string; tier: string; history: { date: string; score: number; fundamental_score: number; technical_score: number }[] }>(
        `/stocks/${ticker}/score-history`
      ),
  },
  watchlist: {
    list: () => apiFetch<{ watchlist: WatchlistItem[]; count: number; limit: number | null }>('/watchlist'),
    add: (ticker: string) =>
      apiFetch<void>(`/watchlist/${ticker}`, { method: 'POST' }),
    remove: (ticker: string) =>
      apiFetch<void>(`/watchlist/${ticker}`, { method: 'DELETE' }),
  },
  portfolio: {
    list: () => apiFetch<PortfolioResponse>('/portfolio'),
    history: () => apiFetch<PortfolioHistoryResponse>('/portfolio/history'),
    addTransaction: (payload: TransactionPayload) =>
      apiFetch<{ id: number; ticker: string; type: string; status: string }>('/portfolio/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateTransaction: (id: number, payload: Partial<Omit<TransactionPayload, 'ticker' | 'type'>>) =>
      apiFetch<{ id: number; status: string }>(`/portfolio/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    deleteTransaction: (id: number) =>
      apiFetch<void>(`/portfolio/transactions/${id}`, { method: 'DELETE' }),
    importCsv: (csv: string) =>
      apiFetch<{ imported: number; errors: string[] }>('/portfolio/import', {
        method: 'POST',
        body: JSON.stringify({ csv }),
      }),
  },
  earnings: () => apiFetch<EarningsResponse>('/earnings'),
  search: (q: string) =>
    apiFetch<{ results: { ticker: string; name: string | null; sector: string | null; score: number | null }[] }>(
      `/search?q=${encodeURIComponent(q)}`
    ),
  admin: {
    stats: () => apiFetch<AdminStatsResponse>('/admin/stats'),
    users: (params?: { page?: number; per_page?: number; tier?: 'pro' | 'free'; search?: string }) => {
      const q = new URLSearchParams()
      if (params?.page) q.set('page', String(params.page))
      if (params?.per_page) q.set('per_page', String(params.per_page))
      if (params?.tier) q.set('tier', params.tier)
      if (params?.search) q.set('search', params.search)
      return apiFetch<AdminUsersResponse>(`/admin/users${q.toString() ? '?' + q.toString() : ''}`)
    },
    updateUser: (id: string, payload: { tier: 'free' | 'pro' }) =>
      apiFetch<{ id: string; email: string; tier: string }>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    triggerScan: () =>
      apiFetch<{ status: string; run_id: number }>('/admin/scan/trigger', { method: 'POST' }),
    scanHistory: (limit?: number) =>
      apiFetch<AdminScanHistoryResponse>(`/admin/scan/history${limit ? `?limit=${limit}` : ''}`),
  },
  health: () =>
    apiFetch<{ status: string; last_scan: string; data_source: string }>('/health'),
  billing: {
    createCheckout: (plan: 'monthly' | 'annual') =>
      apiFetch<{ url: string }>('/billing/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }),
    portal: () =>
      apiFetch<{ url: string }>('/billing/portal', { method: 'POST' }),
    subscription: () =>
      apiFetch<{ subscription: SubscriptionInfo | null }>('/billing/subscription'),
  },
}
