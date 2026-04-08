'use client'

import Link from 'next/link'
import ScoreRing from './ScoreRing'
import Sparkline from './Sparkline'
import type { StockResult, OHLCVBar } from '@/lib/types'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#4f8ef7',
  Financials: '#f5a623',
  Healthcare: '#22d47e',
  Energy: '#f75f5f',
  Industrials: '#a78bfa',
  'Consumer Discretionary': '#fb923c',
  'Consumer Staples': '#34d399',
  Materials: '#f472b6',
  'Real Estate': '#60a5fa',
  Utilities: '#94a3b8',
  'Communication Services': '#c084fc',
}

interface Props {
  stock: StockResult
  rank: number
  history?: OHLCVBar[]
}

function fmt(n: number | null, prefix = '', suffix = '') {
  if (n == null) return '—'
  return `${prefix}${n.toFixed(2)}${suffix}`
}

export default function StockRow({ stock, rank, history = [] }: Props) {
  const sectorColor = SECTOR_COLORS[stock.sector ?? ''] ?? '#6b7a99'
  const upside = stock.upside_pct ?? 0
  const upsideColor = upside >= 0 ? '#22d47e' : '#f75f5f'

  const sparkData = history.slice(-7).map(b => ({ close: b.close }))
  const isPositive =
    sparkData.length >= 2
      ? sparkData[sparkData.length - 1].close >= sparkData[0].close
      : true

  return (
    <Link
      href={`/stock/${stock.ticker}`}
      className="flex items-center gap-4 px-4 py-3 rounded-cell transition-colors hover:bg-white/[0.03] group"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Rank */}
      <span
        className="w-6 text-center text-sm font-semibold flex-shrink-0"
        style={{ color: '#6b7a99' }}
      >
        {rank}
      </span>

      {/* Ticker + name + sector */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: '#e2e8f8' }}>
            {stock.ticker}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-pill hidden sm:inline"
            style={{
              background: `${sectorColor}18`,
              color: sectorColor,
              border: `1px solid ${sectorColor}30`,
            }}
          >
            {stock.sector ?? 'N/A'}
          </span>
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: '#6b7a99' }}>
          {stock.name ?? stock.ticker}
        </p>
      </div>

      {/* 7-day sparkline */}
      <div className="hidden md:block flex-shrink-0">
        <Sparkline data={sparkData} positive={isPositive} />
      </div>

      {/* Price + upside */}
      <div className="text-right flex-shrink-0 min-w-[80px]">
        <p className="text-sm font-semibold" style={{ color: '#e2e8f8' }}>
          {fmt(stock.current_price, '$')}
        </p>
        <p className="text-xs font-medium" style={{ color: upsideColor }}>
          {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% target
        </p>
      </div>

      {/* Score ring */}
      <div className="flex-shrink-0">
        <ScoreRing score={stock.score} size={48} />
      </div>
    </Link>
  )
}
