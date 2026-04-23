'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import ScoreRing from '@/components/ScoreRing'
import type { StockResult } from '@/lib/types'

const WL_KEY = 'edgescan_watchlist'

export function loadWatchlist(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(WL_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function toggleWatchlist(ticker: string): boolean {
  const list = loadWatchlist()
  const exists = list.includes(ticker)
  const next = exists ? list.filter(t => t !== ticker) : [...list, ticker]
  localStorage.setItem(WL_KEY, JSON.stringify(next))
  return !exists // returns new state (true = added)
}

// ─── WatchlistCard ────────────────────────────────────────────────────────────

function WatchlistCard({ stock, onRemove }: { stock: StockResult; onRemove: () => void }) {
  const router = useRouter()
  const upside = stock.upside_pct ?? 0

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-cell cursor-pointer hover:bg-white/[0.03] transition-colors"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      onClick={() => router.push(`/stock/${stock.ticker}`)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: '#e2e8f8' }}>{stock.ticker}</span>
          {stock.sector && (
            <span className="text-xs px-2 py-0.5 rounded-pill hidden sm:inline"
              style={{ background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}>
              {stock.sector}
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7a99' }}>{stock.name}</p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold" style={{ color: '#e2e8f8' }}>
          {stock.current_price != null ? `$${stock.current_price.toFixed(2)}` : '—'}
        </p>
        <p className="text-xs" style={{ color: upside >= 0 ? '#22d47e' : '#f75f5f' }}>
          {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
        </p>
      </div>

      <ScoreRing score={stock.score} size={44} />

      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="flex-shrink-0 p-1 rounded transition-colors hover:bg-white/[0.08]"
        style={{ color: '#6b7a99' }}
        title="Remove from watchlist"
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function WatchlistClient() {
  const [tickers, setTickers] = useState<string[]>([])
  const [stocks, setStocks] = useState<Record<string, StockResult>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [addInput, setAddInput] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])

  useEffect(() => {
    setTickers(loadWatchlist())
  }, [])

  // Fetch stock data for tickers we don't have yet
  useEffect(() => {
    tickers.forEach(ticker => {
      if (stocks[ticker] || loading[ticker]) return
      setLoading(prev => ({ ...prev, [ticker]: true }))
      api.stock(ticker)
        .then(s => setStocks(prev => ({ ...prev, [ticker]: s })))
        .catch(() => {})
        .finally(() => setLoading(prev => ({ ...prev, [ticker]: false })))
    })
  }, [tickers])

  function remove(ticker: string) {
    toggleWatchlist(ticker)
    setTickers(loadWatchlist())
  }

  function add(ticker: string) {
    if (!tickers.includes(ticker)) {
      toggleWatchlist(ticker)
      setTickers(loadWatchlist())
    }
    setAddInput('')
    setSearchResults([])
  }

  useEffect(() => {
    if (!addInput.trim()) { setSearchResults([]); return }
    const t = setTimeout(() => {
      api.search(addInput).then(r => setSearchResults(r.results)).catch(() => {})
    }, 120)
    return () => clearTimeout(t)
  }, [addInput])

  return (
    <div>
      {/* Add ticker */}
      <div className="relative mb-5">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-card"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#6b7a99" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 4v16m8-8H4" />
          </svg>
          <input
            type="text"
            placeholder="Add ticker…"
            value={addInput}
            onChange={e => setAddInput(e.target.value.toUpperCase())}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: '#e2e8f8' }}
          />
        </div>
        {searchResults.length > 0 && (
          <div
            className="absolute w-full mt-1 rounded-card overflow-hidden z-50"
            style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {searchResults.map(t => (
              <button
                key={t}
                onClick={() => add(t)}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/[0.04] transition-colors"
                style={{ color: '#e2e8f8' }}
              >
                {t}
                {tickers.includes(t) && (
                  <span className="ml-2 text-xs" style={{ color: '#22d47e' }}>✓ Added</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {tickers.length === 0 ? (
        <div
          className="rounded-card py-16 text-center"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-sm mb-1" style={{ color: '#6b7a99' }}>Your watchlist is empty.</p>
          <p className="text-xs" style={{ color: '#6b7a99' }}>
            Tap the ⭐ star on any stock card in the scanner, or use the search field above.
          </p>
        </div>
      ) : (
        <div
          className="rounded-card overflow-hidden"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {tickers.map(ticker => {
            const stock = stocks[ticker]
            if (!stock) {
              return (
                <div
                  key={ticker}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="h-4 w-16 rounded animate-pulse" style={{ background: '#1e2540' }} />
                  <div className="h-4 flex-1 rounded animate-pulse" style={{ background: '#1e2540' }} />
                </div>
              )
            }
            return (
              <WatchlistCard key={ticker} stock={stock} onRemove={() => remove(ticker)} />
            )
          })}
        </div>
      )}
    </div>
  )
}
