import type {
  TopOpportunitiesResponse,
  StockResult,
  PriceHistoryResponse,
  Period,
  MarketPulse,
  SearchResponse,
} from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } })
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
}
