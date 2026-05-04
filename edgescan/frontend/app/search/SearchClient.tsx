'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { SearchResult } from '@/lib/types'
import TickerSearch from '@/components/TickerSearch'

const RECENT_KEY = 'edgescan_recent_searches'

function loadRecent(): { ticker: string; name: string | null }[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    // migrate old format (string[]) to new format
    return raw.map((r: string | { ticker: string; name: string | null }) =>
      typeof r === 'string' ? { ticker: r, name: null } : r
    )
  } catch {
    return []
  }
}

function saveRecent(ticker: string, name: string | null) {
  const prev = loadRecent().filter(r => r.ticker !== ticker)
  const next = [{ ticker, name }, ...prev].slice(0, 8)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

export default function SearchClient() {
  const router = useRouter()
  const [rawQuery, setRawQuery] = useState('')
  const [recent, setRecent] = useState<{ ticker: string; name: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setRecent(loadRecent())
  }, [])

  function navigate(ticker: string, name: string | null) {
    saveRecent(ticker, name)
    setRecent(loadRecent())
    router.push(`/stock/${ticker}`)
  }

  function handleSelect(result: SearchResult) {
    navigate(result.ticker, result.name)
  }

  async function handleDirectLookup() {
    const t = rawQuery.trim().toUpperCase()
    if (!t) return
    setLoading(true)
    setError('')
    try {
      await api.stock(t)
      navigate(t, null)
    } catch {
      setError(`Could not find data for "${t}". Check the ticker and try again.`)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && rawQuery.trim()) handleDirectLookup()
  }

  return (
    <div>
      {/* Search bar */}
      <div className="flex gap-2">
        <div
          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-card"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.08)' }}
          onKeyDown={handleKeyDown}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#6b7a99" strokeWidth={2} className="flex-shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <TickerSearch
            onSelect={handleSelect}
            onQueryChange={setRawQuery}
            placeholder="Search ticker or company name…"
            autoFocus
          />
          {loading && (
            <svg className="animate-spin flex-shrink-0" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth={3} />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#4f8ef7" strokeWidth={3} strokeLinecap="round" />
            </svg>
          )}
        </div>

        <button
          onClick={handleDirectLookup}
          disabled={!rawQuery.trim() || loading}
          className="px-5 py-3 rounded-card text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{ background: '#4f8ef7', color: '#fff' }}
        >
          {loading ? 'Fetching…' : 'Search'}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm" style={{ color: '#f75f5f' }}>{error}</p>
      )}

      {/* Recent searches */}
      {recent.length > 0 && (
        <div className="mt-6">
          <p className="text-xs mb-3" style={{ color: '#6b7a99' }}>Recent</p>
          <div className="flex flex-wrap gap-2">
            {recent.map(r => (
              <button
                key={r.ticker}
                onClick={() => navigate(r.ticker, r.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors hover:bg-white/[0.08]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span style={{ color: '#e2e8f8' }}>{r.ticker}</span>
                {r.name && <span className="hidden sm:inline" style={{ color: '#4a556b' }}>· {r.name}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {!rawQuery && recent.length === 0 && (
        <p className="mt-4 text-sm" style={{ color: '#6b7a99' }}>
          Search by ticker (AAPL) or company name (Apple). The backend fetches live data on demand — not just S&P 500.
        </p>
      )}
    </div>
  )
}
