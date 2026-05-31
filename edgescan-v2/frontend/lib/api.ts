import type { ScanResult, ScannerResponse, OHLCVBar, WatchlistItem } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const V1 = `${BASE}/api/v1`

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${V1}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  scanner: {
    list: (params?: { sector?: string }) =>
      apiFetch<ScannerResponse>(`/scanner${params?.sector ? `?sector=${params.sector}` : ''}`),
    movers: () =>
      apiFetch<{ risers: ScanResult[]; fallers: ScanResult[] }>('/scanner/movers'),
  },
  stocks: {
    detail: (ticker: string) => apiFetch<ScanResult>(`/stocks/${ticker}`),
    history: (ticker: string, period: '3m' | '6m' | '1y' = '1y') =>
      apiFetch<{ bars: OHLCVBar[] }>(`/stocks/${ticker}/history?period=${period}`),
    scoreHistory: (ticker: string) =>
      apiFetch<{ history: { score: number; scanned_at: string }[] }>(
        `/stocks/${ticker}/score-history`
      ),
  },
  watchlist: {
    list: () => apiFetch<{ items: WatchlistItem[] }>('/watchlist'),
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
