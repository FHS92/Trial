'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import type { SearchResult } from '@/lib/types'

interface Props {
  onSelect: (result: SearchResult) => void
  placeholder?: string
  autoFocus?: boolean
  /** Called on every keystroke so parent can track raw input if needed */
  onQueryChange?: (q: string) => void
}

export default function TickerSearch({
  onSelect,
  placeholder = 'Search ticker or company…',
  autoFocus,
  onQueryChange,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    onQueryChange?.(query)
    if (!query.trim()) { setResults([]); setOpen(false); return }
    const t = setTimeout(() => {
      api.search(query)
        .then(r => { setResults(r.results); setOpen(true); setActiveIdx(-1) })
        .catch(() => {})
    }, 120)
    return () => clearTimeout(t)
  }, [query])

  function pick(r: SearchResult) {
    setQuery(r.ticker)
    setResults([])
    setOpen(false)
    setActiveIdx(-1)
    onSelect(r)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      pick(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent outline-none text-sm"
        style={{ color: '#e2e8f8' }}
        autoComplete="off"
        spellCheck={false}
      />

      {open && results.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-card z-50 overflow-hidden"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        >
          {results.map((r, i) => (
            <button
              key={r.ticker}
              onMouseDown={() => pick(r)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ background: i === activeIdx ? 'rgba(79,142,247,0.1)' : 'transparent' }}
            >
              <span className="text-sm font-bold flex-shrink-0" style={{ color: '#e2e8f8', minWidth: 44 }}>
                {r.ticker}
              </span>
              {r.name && (
                <span className="text-xs truncate" style={{ color: '#6b7a99' }}>{r.name}</span>
              )}
              {r.current_price != null && (
                <span className="ml-auto text-xs flex-shrink-0" style={{ color: '#4f8ef7' }}>
                  ${r.current_price.toFixed(2)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
