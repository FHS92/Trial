import type { ScanResult, ScannerResponse, OHLCVBar, WatchlistItem } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const V1 = `${BASE}/api/v1`

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
  return res.json()
}

export const api = {
  scanner: {
    list: (params?: { sector?: string }) =>
      apiFetch<ScannerResponse>(`/scanner${params?.sector ? `?sector=${encodeURIComponent(params.sector)}` : ''}`),
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
  search: (q: string) =>
    apiFetch<{ results: { ticker: string; name: string; sector: string }[] }>(
      `/search?q=${encodeURIComponent(q)}`
    ),
  health: () =>
    apiFetch<{ status: string; last_scan: string; data_source: string }>('/health'),
}
