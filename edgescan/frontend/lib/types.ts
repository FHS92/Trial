// ─── Core domain types ────────────────────────────────────────────────────────

export interface Signals {
  rsi: number
  macd_status: 'bullish_crossover' | 'above_signal' | 'below_signal'
  pct_above_200ma: number
  from_52w_high: number
  volume_status: 'bullish' | 'neutral' | 'bearish'
  ma50: number
  ma200: number
}

export interface Metrics {
  rev_growth: number
  eps_growth: number
  fcf_yield: number
  roe: number
  gross_margin: number
  debt_to_equity: number
  fwd_pe: number
  sector_pe: number
  analyst_target: number
  recent_catalyst: string
}

export interface ScoreBreakdown {
  rev_growth_pts?: number
  eps_growth_pts?: number
  fcf_yield_pts?: number
  roe_pts?: number
  gross_margin_pts?: number
  debt_equity_pts?: number
  eps_revision_pts?: number
  fwd_pe_pts?: number
  rsi_pts?: number
  macd_pts?: number
  vs_200ma_pts?: number
  volume_pts?: number
  distance_52w_pts?: number
  earnings_penalty?: number
}

export interface StockResult {
  ticker: string
  name: string | null
  sector: string | null
  score: number
  fundamental_score: number
  technical_score: number
  current_price: number | null
  price_target_2m: number | null
  upside_pct: number | null
  signals: Signals
  metrics: Metrics
  score_breakdown: ScoreBreakdown
  earnings_date: string | null
  scanned_at: string | null
  thesis?: string | null
}

export interface TopOpportunitiesResponse {
  results: StockResult[]
  total_scanned: number
  last_scanned_minutes_ago: number | null
  scanned_at: string | null
}

// ─── Price history ────────────────────────────────────────────────────────────

export interface OHLCVBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface PriceHistoryResponse {
  ticker: string
  period: string
  data: OHLCVBar[]
}

export type Period = '1w' | '1m' | '3m' | '6m' | '1y'

// ─── Market pulse ─────────────────────────────────────────────────────────────

export interface MarketPulse {
  spx: number | null
  vix: number | null
  ten_year_yield: number | null
  cached_at: string
  error?: string
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResponse {
  query: string
  results: string[]
}

// ─── Signal display helpers ───────────────────────────────────────────────────

export type SignalStatus = 'green' | 'amber' | 'red'

export interface SignalDisplay {
  label: string
  value: string
  status: SignalStatus
}
