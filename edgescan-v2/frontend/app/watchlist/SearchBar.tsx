'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface SearchResult {
  ticker: string
  name: string | null
  score: number | null
}

interface SearchBarProps {
  onAdd: (ticker: string) => Promise<void>
  existingTickers: string[]
}

export function SearchBar({ onAdd, existingTickers }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.search(query.trim())
        setResults(data.results)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleAdd(ticker: string) {
    setAdding(ticker)
    await onAdd(ticker)
    setAdding(null)
    setQuery('')
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--text-muted)]" />
        )}
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search ticker or company name…"
          className={cn(
            'w-full rounded-xl pl-9 pr-4 py-2.5 text-sm',
            'bg-[var(--surface)] border border-[var(--border)]',
            'text-[var(--text)] placeholder:text-[var(--text-muted)]',
            'focus:outline-none focus:ring-1 focus:ring-[var(--accent)]',
            'transition-colors'
          )}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
          {results.map(r => {
            const already = existingTickers.includes(r.ticker)
            return (
              <button
                key={r.ticker}
                onClick={() => !already && handleAdd(r.ticker)}
                disabled={already || adding === r.ticker}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                  already
                    ? 'opacity-50 cursor-default'
                    : 'hover:bg-[var(--border)]/50 cursor-pointer'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--text)] font-mono">{r.ticker}</span>
                    {r.score != null && (
                      <span className="text-xs text-[var(--accent)] font-semibold">{r.score}</span>
                    )}
                  </div>
                  {r.name && (
                    <p className="text-xs text-[var(--text-muted)] truncate">{r.name}</p>
                  )}
                </div>
                {already ? (
                  <span className="text-xs text-[var(--text-muted)] shrink-0">Added</span>
                ) : adding === r.ticker ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)] shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 text-[var(--accent)] shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
