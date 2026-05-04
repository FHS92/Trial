'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ScoreRing from './ScoreRing'
import Sparkline from './Sparkline'
import Toast from './Toast'
import TrendArrow from './TrendArrow'
import type { StockResult, OHLCVBar } from '@/lib/types'
import { getServerWatchlist, toggleWatchlist } from '@/app/watchlist/WatchlistClient'
import { api } from '@/lib/api'

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
}

function fmt(n: number | null, prefix = '', suffix = '') {
  if (n == null) return '—'
  return `${prefix}${n.toFixed(2)}${suffix}`
}

export default function StockRow({ stock, rank }: Props) {
  const sectorColor = SECTOR_COLORS[stock.sector ?? ''] ?? '#6b7a99'
  const upside = stock.upside_pct ?? 0
  const upsideColor = upside >= 0 ? '#22d47e' : '#f75f5f'

  const [history, setHistory] = useState<OHLCVBar[]>([])
  const [starred, setStarred] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [scoreDelta, setScoreDelta] = useState<number | null>(null)

  const sparkData = history.slice(-7).map(b => ({ close: b.close }))
  const isPositive =
    sparkData.length >= 2
      ? sparkData[sparkData.length - 1].close >= sparkData[0].close
      : true

  useEffect(() => {
    getServerWatchlist().then(list => setStarred(list.includes(stock.ticker)))
    api.priceHistory(stock.ticker, '1w')
      .then(r => setHistory(r.data))
      .catch(() => {})
    api.scoreHistory(stock.ticker)
      .then(r => {
        const h = r.history
        if (h.length >= 2) {
          setScoreDelta(h[h.length - 1].score - h[h.length - 2].score)
        }
      })
      .catch(() => {})

    function onStorage(e: StorageEvent) {
      if (e.key === 'edgescan_watchlist') {
        try {
          const list: string[] = JSON.parse(e.newValue ?? '[]')
          setStarred(list.includes(stock.ticker))
        } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [stock.ticker])

  const handleStar = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const next = toggleWatchlist(stock.ticker)
      setStarred(next)
      setToast(next ? `${stock.ticker} added to watchlist` : `${stock.ticker} removed from watchlist`)
    },
    [stock.ticker],
  )

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-cell transition-colors hover:bg-white/[0.03] group"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}
    >
      <Link
        href={`/stock/${stock.ticker}`}
        className="absolute inset-0"
        aria-label={`View ${stock.ticker}`}
      />

      {/* Rank */}
      <span
        className="hidden sm:inline-block w-6 text-center text-sm font-semibold flex-shrink-0 relative"
        style={{ color: '#6b7a99' }}
      >
        {rank}
      </span>

      {/* Ticker + name + sector */}
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: '#e2e8f8' }}>
            {stock.ticker}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-pill"
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
      <div className="flex-shrink-0 relative">
        <Sparkline data={sparkData} positive={isPositive} />
      </div>

      {/* Price + upside */}
      <div className="text-right flex-shrink-0 min-w-[80px] relative">
        <p className="text-sm font-semibold" style={{ color: '#e2e8f8' }}>
          {fmt(stock.current_price, '$')}
        </p>
        <p className="text-xs font-medium" style={{ color: upsideColor }}>
          {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% target
        </p>
      </div>

      {/* Score ring + trend arrow */}
      <div className="flex-shrink-0 relative flex flex-col items-center gap-0.5">
        <ScoreRing score={stock.score} size={48} />
        <TrendArrow delta={scoreDelta} />
      </div>

      {/* Watchlist star */}
      <button
        type="button"
        onClick={handleStar}
        className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors hover:bg-white/[0.08] relative"
        style={{ zIndex: 1 }}
        title={starred ? 'Remove from watchlist' : 'Add to watchlist'}
        aria-label={starred ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {starred ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7a99" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        )}
      </button>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
