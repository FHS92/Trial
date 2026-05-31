export type Tier = 'free' | 'pro'

export interface User {
  id: string
  email: string
  name: string | null
  tier: Tier
  isAdmin: boolean
}

export interface ScoreBreakdown {
  rev_growth_pts: number
  eps_growth_pts: number
  fcf_yield_pts: number
  roe_pts: number
  gross_margin_pts: number
  debt_equity_pts: number
  eps_revision_pts: number
  fwd_pe_pts: number
  rsi_pts: number
  macd_pts: number
  ma200_pts: number
  volume_pts: number
  high52w_pts: number
  earnings_penalty: number
}

export interface Signals {
  rsi: number
  macd_status: 'bullish_crossover' | 'above_signal' | 'below_signal' | 'unknown'
  pct_above_200ma: number
  from_52w_high: number
  volume_status: 'bullish' | 'bearish' | 'neutral'
  ma50: number
  ma200: number
  adx: number
  obv_slope_pct: number
  roc_20: number
  rs_vs_spy: number
}

export interface Metrics {
  rev_growth: number
  eps_growth: number
  fcf_yield: number
  roe: number
  gross_margin: number
  debt_to_equity: number
  fwd_pe: number | null
  trailing_pe: number | null
  price_to_sales: number | null
  price_to_book: number | null
  ev_ebitda: number | null
  sector_pe: number
  analyst_target: number | null
  recent_catalyst: string
}

export interface ScanResult {
  ticker: string
  name: string
  sector: string | null
  industry: string | null
  score: number
  fundamental_score: number
  technical_score: number
  current_price: number | null
  price_target_1m: number | null
  upside_pct: number | null
  signals: Signals
  metrics: Metrics
  score_breakdown: ScoreBreakdown
  earnings_date: string | null
  scanned_at: string
  data_source?: string
}

export interface ScannerResponse {
  results: ScanResult[]
  tier: Tier
  total_available: number
  as_of: string
  data_source: string
}

export interface OHLCVBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  adj_close: number
  volume: number
}

export interface WatchlistItem {
  ticker: string
  name: string
  score: number
  current_price: number | null
  added_at: string
}

// Augment next-auth session types
declare module 'next-auth' {
  interface User {
    id: string
    tier: Tier
    is_admin: boolean
  }
  interface Session {
    user: User & {
      id: string
      tier: Tier
      is_admin: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    tier: Tier
    is_admin: boolean
  }
}
