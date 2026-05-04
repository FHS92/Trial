'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import ScoreRing from '@/components/ScoreRing'
import TickerSearch from '@/components/TickerSearch'
import type { StockResult, SearchResult } from '@/lib/types'

const WL_KEY = 'edgescan_watchlist'

function _token(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('edgescan_profile_token')
}

// ─── Server-side watchlist cache ─────────────────────────────────────────────
// One fetch per page load shared across all StockRow / WatchStar instances.
// Falls back to localStorage when there is no session token.

let _serverCache: string[] | null = null
let _fetchPromise: Promise<string[]> | null = null

export function getServerWatchlist(): Promise<string[]> {
  if (_serverCache !== null) return Promise.resolve(_serverCache)
  if (_fetchPromise) return _fetchPromise
  const token = _token()
  if (!token) return Promise.resolve(loadWatchlist())
  _fetchPromise = fetch('/api/watchlist', {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(r => r.ok ? r.json() : { tickers: [] })
    .then((data: { tickers: string[] }) => {
      _serverCache = data.tickers ?? []
      // Keep localStorage in sync so toggleWatchlist stays consistent
      localStorage.setItem(WL_KEY, JSON.stringify(_serverCache))
      return _serverCache as string[]
    })
    .catch(() => loadWatchlist())
  return _fetchPromise
}

// ─── Public helpers (used by WatchStar + other components) ───────────────────

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

  // Keep module-level cache in sync so subsequent reads are correct
  if (_serverCache !== null) _serverCache = next

  // Fire-and-forget API sync so the change persists server-side
  const token = _token()
  if (token) {
    fetch(`/api/watchlist/${ticker}`, {
      method: exists ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }

  return !exists
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
        className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors hover:bg-white/[0.08]"
        style={{ color: '#6b7a99' }}
        title="Remove from watchlist"
        aria-label="Remove from watchlist"
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

  // On mount: load from API (source of truth), sync to localStorage cache
  useEffect(() => {
    const token = _token()
    if (token) {
      fetch('/api/watchlist', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) throw new Error('not ok')
          return r.json()
        })
        .then((data: { tickers: string[] }) => {
          const apiTickers = data.tickers ?? []
          localStorage.setItem(WL_KEY, JSON.stringify(apiTickers))
          setTickers(apiTickers)
        })
        .catch(() => setTickers(loadWatchlist()))
    } else {
      setTickers(loadWatchlist())
    }
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
    setTickers(prev => prev.filter(t => t !== ticker))
  }

  function add(ticker: string) {
    if (!tickers.includes(ticker)) {
      toggleWatchlist(ticker)
      setTickers(prev => [...prev, ticker])
    }
  }

  function handleSelect(result: SearchResult) {
    add(result.ticker)
  }

  return (
    <div>
      {/* Add ticker */}
      <div className="mb-5">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-card"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#6b7a99" strokeWidth={2} className="flex-shrink-0">
            <path strokeLinecap="round" d="M12 4v16m8-8H4" />
          </svg>
          <TickerSearch
            onSelect={handleSelect}
            placeholder="Add by ticker or company name…"
          />
        </div>
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
