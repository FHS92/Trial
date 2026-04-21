'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const RECENT_KEY = 'edgescan_recent_searches'

function loadRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveRecent(ticker: string) {
  const prev = loadRecent().filter(t => t !== ticker)
  const next = [ticker, ...prev].slice(0, 8)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

export default function SearchClient() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRecent(loadRecent())
    inputRef.current?.focus()
  }, [])

  // Autocomplete from S&P 500 list as user types
  useEffect(() => {
    if (!query.trim()) { setResults([]); setError(''); return }
    const timer = setTimeout(() => {
      api.search(query)
        .then(r => setResults(r.results))
        .catch(() => setResults([]))
    }, 120)
    return () => clearTimeout(timer)
  }, [query])

  // Navigate to stock detail — fetches live data on demand via the backend
  function navigate(ticker: string) {
    saveRecent(ticker)
    setRecent(loadRecent())
    router.push(`/stock/${ticker}`)
  }

  // Handle Enter key or Search button — go directly even if not in S&P 500 list
  async function handleSubmit() {
    const t = query.trim().toUpperCase()
    if (!t) return
    setLoading(true)
    setError('')
    try {
      // The backend's GET /api/stock/{ticker} will score on demand if not cached
      await api.stock(t)
      navigate(t)
    } catch {
      setError(`Could not find data for "${t}". Check the ticker and try again.`)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit()
  }

  const showDropdown = focused && (results.length > 0 || (query === '' && recent.length > 0))
  const list = query ? results : recent

  return (
    <div className="relative">
      {/* Search input + button */}
      <div className="flex gap-2">
        <div
          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-card"
          style={{
            background: '#0f1420',
            border: `1px solid ${focused ? '#4f8ef7' : 'rgba(255,255,255,0.08)'}`,
            transition: 'border-color 0.15s',
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#6b7a99" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type any ticker — e.g. AAPL, TSLA, NVDA…"
            value={query}
            onChange={e => { setQuery(e.target.value.toUpperCase()); setError('') }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: '#e2e8f8' }}
          />
          {query && !loading && (
            <button onClick={() => { setQuery(''); setError('') }} style={{ color: '#6b7a99' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {loading && (
            <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth={3} />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#4f8ef7" strokeWidth={3} strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* Search button */}
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || loading}
          className="px-5 py-3 rounded-card text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{ background: '#4f8ef7', color: '#fff' }}
        >
          {loading ? 'Fetching…' : 'Search'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm" style={{ color: '#f75f5f' }}>{error}</p>
      )}

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div
          className="absolute w-full mt-1 rounded-card overflow-hidden z-50"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {!query && recent.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-xs" style={{ color: '#6b7a99' }}>Recent searches</p>
          )}
          {query && results.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-xs" style={{ color: '#6b7a99' }}>S&P 500 matches</p>
          )}
          {list.map(ticker => (
            <button
              key={ticker}
              onMouseDown={() => navigate(ticker)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              {!query && (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#6b7a99" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium" style={{ color: '#e2e8f8' }}>{ticker}</span>
            </button>
          ))}
          {/* If typed ticker not in S&P 500 list, offer direct lookup */}
          {query && !results.includes(query) && (
            <button
              onMouseDown={handleSubmit}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#4f8ef7" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <span className="text-sm" style={{ color: '#4f8ef7' }}>
                Look up <strong>{query}</strong> directly →
              </span>
            </button>
          )}
        </div>
      )}

      {/* Recent chips */}
      {!focused && recent.length > 0 && (
        <div className="mt-6">
          <p className="text-xs mb-3" style={{ color: '#6b7a99' }}>Recent</p>
          <div className="flex flex-wrap gap-2">
            {recent.map(t => (
              <button
                key={t}
                onClick={() => navigate(t)}
                className="px-3 py-1.5 rounded-pill text-xs font-medium transition-colors hover:bg-white/[0.08]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e2e8f8',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      {!query && !focused && recent.length === 0 && (
        <p className="mt-4 text-sm" style={{ color: '#6b7a99' }}>
          Search any U.S. stock ticker. The backend will fetch live data on demand — not just S&P 500.
        </p>
      )}
    </div>
  )
}
