import type {
  TopOpportunitiesResponse,
  StockResult,
  PriceHistoryResponse,
  Period,
  MarketPulse,
  SearchResponse,
  PortfolioResponse,
  ScoreHistoryResponse,
  EarningsCalendarResponse,
  NewsResponse,
  WeeklySnapshotResponse,
  ScanMoversResponse,
  PortfolioMetricsResponse,
} from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}
  const token = sessionStorage.getItem('edgescan_profile_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function get<T>(path: string, extraHeaders?: HeadersInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: 'no-store',
    headers: { ...extraHeaders },
  })
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  topOpportunities(): Promise<TopOpportunitiesResponse> {
    return get<TopOpportunitiesResponse>('/api/top-opportunities')
  },

  stock(ticker: string): Promise<StockResult> {
    return get<StockResult>(`/api/stock/${ticker.toUpperCase()}`)
  },

  priceHistory(ticker: string, period: Period = '3m'): Promise<PriceHistoryResponse> {
    return get<PriceHistoryResponse>(
      `/api/stock/${ticker.toUpperCase()}/history?period=${period}`,
    )
  },

  search(q: string): Promise<SearchResponse> {
    return get<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)
  },

  marketPulse(): Promise<MarketPulse> {
    return get<MarketPulse>('/api/market-pulse')
  },

  portfolio(username: string): Promise<PortfolioResponse> {
    return get<PortfolioResponse>(
      `/api/portfolio/${encodeURIComponent(username)}`,
      authHeaders(),
    )
  },

  addHolding(username: string, ticker: string, amount: number, buyPrice: number, buyDate?: string): Promise<{ status: string; ticker: string }> {
    return fetch(`${BASE}/api/portfolio/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ticker, amount, buy_price: buyPrice, buy_date: buyDate ?? null }),
      cache: 'no-store',
    }).then(r => r.json())
  },

  deleteHolding(username: string, ticker: string): Promise<{ status: string; ticker: string }> {
    return fetch(`${BASE}/api/portfolio/${encodeURIComponent(username)}/${encodeURIComponent(ticker)}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
      cache: 'no-store',
    }).then(r => r.json())
  },

  portfolioHistory(): Promise<{ history: { date: string; value: number }[] }> {
    return fetch(`${BASE}/api/portfolio/history`, {
      cache: 'no-store',
      headers: { ...authHeaders() },
    }).then(r => r.json())
  },

  scoreHistory(ticker: string): Promise<ScoreHistoryResponse> {
    return get<ScoreHistoryResponse>(`/api/stock/${ticker.toUpperCase()}/score-history`)
  },

  earningsCalendar(): Promise<EarningsCalendarResponse> {
    return get<EarningsCalendarResponse>('/api/earnings-calendar')
  },

  stockNews(ticker: string): Promise<NewsResponse> {
    return get<NewsResponse>(`/api/stock/${ticker.toUpperCase()}/news`)
  },

  weeklySnapshot(): Promise<WeeklySnapshotResponse> {
    return get<WeeklySnapshotResponse>('/api/weekly-snapshot')
  },

  scanMovers(topN = 10): Promise<ScanMoversResponse> {
    return get<ScanMoversResponse>(`/api/scan/movers?top_n=${topN}`)
  },

  portfolioMetrics(): Promise<PortfolioMetricsResponse> {
    return fetch(`${BASE}/api/portfolio/metrics`, {
      cache: 'no-store',
      headers: { ...authHeaders() },
    }).then(async r => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail ?? `Server error ${r.status}`)
      }
      return r.json()
    })
  },

  async refreshPortfolioPrices(): Promise<{ status: string; rows_updated: number; message?: string }> {
    const r = await fetch(`${BASE}/api/portfolio/refresh-prices`, {
      method: 'POST',
      cache: 'no-store',
      headers: { ...authHeaders() },
    })
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      throw new Error(body.detail ?? `Server error ${r.status}`)
    }
    return r.json()
  },
}
