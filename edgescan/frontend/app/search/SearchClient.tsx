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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRecent(loadRecent())
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      api.search(query)
        .then(r => setResults(r.results))
        .catch(() => setResults([]))
    }, 120)
    return () => clearTimeout(timer)
  }, [query])

  function navigate(ticker: string) {
    saveRecent(ticker)
    setRecent(loadRecent())
    router.push(`/stock/${ticker}`)
  }

  const showResults = focused && (results.length > 0 || (query === '' && recent.length > 0))
  const list = query ? results : recent

  return (
    <div className="relative">
      {/* Search input */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-card"
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
          placeholder="Search ticker or company name…"
          value={query}
          onChange={e => setQuery(e.target.value.toUpperCase())}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: '#e2e8f8' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ color: '#6b7a99' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showResults && (
        <div
          className="absolute w-full mt-1 rounded-card overflow-hidden z-50"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {!query && recent.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-xs" style={{ color: '#6b7a99' }}>Recent searches</p>
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
          {query && results.length === 0 && (
            <p className="px-4 py-3 text-sm" style={{ color: '#6b7a99' }}>No results for "{query}"</p>
          )}
        </div>
      )}

      {/* Recent chips (always visible when not focused) */}
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
    </div>
  )
}
