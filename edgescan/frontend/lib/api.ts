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
} from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
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
    return get<PortfolioResponse>(`/api/portfolio/${encodeURIComponent(username)}`)
  },

  addHolding(username: string, ticker: string, shares: number, buyPrice: number, buyDate?: string): Promise<{ status: string; ticker: string }> {
    return fetch(`${BASE}/api/portfolio/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, shares, buy_price: buyPrice, buy_date: buyDate ?? null }),
      cache: 'no-store',
    }).then(r => r.json())
  },

  deleteHolding(username: string, ticker: string): Promise<{ status: string; ticker: string }> {
    return fetch(`${BASE}/api/portfolio/${encodeURIComponent(username)}/${encodeURIComponent(ticker)}`, {
      method: 'DELETE',
      cache: 'no-store',
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
}
