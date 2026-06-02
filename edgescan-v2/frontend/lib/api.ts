import type { ScanResult, ScannerResponse, OHLCVBar, WatchlistItem, SubscriptionInfo } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const V1 = `${BASE}/api/v1`

// For server-side fetches: use internal service URL when available (avoids external round-trip in containers)
const SERVER_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const SERVER_V1 = `${SERVER_BASE}/api/v1`

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
// NOTE: do NOT use (await cookies()).toString() — it encodeURIComponent-encodes values, corrupting session tokens.
export async function serverFetch<T>(path: string, cookieHeader: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_V1}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { Cookie: cookieHeader, ...init?.headers },
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
  total_scan_rows: number
  latest_scan: { started_at: string | null; completed_at: string | null; tickers_scanned: number }
}

export type AdminUsersResponse = {
  users: {
    id: string; email: string; name: string | null; tier: string
    is_admin: boolean; created_at: string
    subscription: { status: string; plan: string; current_period_end: string | null; cancel_at_period_end: boolean } | null
  }[]
  total: number; page: number; per_page: number; pages: number
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
  earnings: () => apiFetch<EarningsResponse>('/earnings'),
  search: (q: string) =>
    apiFetch<{ results: { ticker: string; name: string | null; sector: string | null; score: number | null }[] }>(
      `/search?q=${encodeURIComponent(q)}`
    ),
  admin: {
    stats: () => apiFetch<AdminStatsResponse>('/admin/stats'),
    users: (params?: { page?: number; per_page?: number; tier?: 'pro' | 'free' }) => {
      const q = new URLSearchParams()
      if (params?.page) q.set('page', String(params.page))
      if (params?.per_page) q.set('per_page', String(params.per_page))
      if (params?.tier) q.set('tier', params.tier)
      return apiFetch<AdminUsersResponse>(`/admin/users${q.toString() ? '?' + q.toString() : ''}`)
    },
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
