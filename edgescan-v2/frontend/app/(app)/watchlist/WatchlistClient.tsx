'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Star, X, TrendingUp, ArrowRight, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { ScoreRing } from '@/components/score/ScoreRing'
import { formatPrice, formatPercent, cn } from '@/lib/utils'
import type { WatchlistItem } from '@/lib/types'
import { SearchBar } from './SearchBar'

export function WatchlistClient() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [limit, setLimit] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.watchlist.list()
      setItems(data.watchlist)
      setLimit(data.limit)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('sign-in-required')
      } else {
        setError('Failed to load watchlist.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRemove(ticker: string) {
    setRemoving(ticker)
    try {
      await api.watchlist.remove(ticker)
      setItems(prev => prev.filter(i => i.ticker !== ticker))
    } catch {
      // silently retry-able; no toast needed
    } finally {
      setRemoving(null)
    }
  }

  async function handleAdd(ticker: string) {
    try {
      await api.watchlist.add(ticker)
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) return // already in watchlist
      if (err instanceof ApiError && err.status === 402) { await load(); return } // refresh limit state
    }
  }

  const atLimit = limit !== null && items.length >= limit
  const isFree = limit !== null

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Watchlist</h1>
        <div className="space-y-2 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error === 'sign-in-required') {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Watchlist</h1>
        <div className="mt-8 flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-[var(--border)]">
          <Star className="h-10 w-10 text-[var(--text-muted)] mb-4" />
          <p className="text-base font-medium text-[var(--text)] mb-2">Sign in to use your watchlist</p>
          <Link
            href="/login?callbackUrl=/watchlist"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Watchlist</h1>
        <p className="text-sm text-red-400 mt-4">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Watchlist</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {isFree
              ? `${items.length} / ${limit} stocks (Free plan)`
              : `${items.length} stock${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isFree && (
          <Link
            href="/upgrade"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Upgrade for unlimited
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Add stock search */}
      {!atLimit && (
        <SearchBar onAdd={handleAdd} existingTickers={items.map(i => i.ticker)} />
      )}
      {atLimit && isFree && (
        <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 text-sm">
          <p className="font-medium text-[var(--text)] mb-1">Watchlist full (5/5)</p>
          <p className="text-[var(--text-muted)] text-xs mb-3">
            Free accounts can track up to 5 stocks. Upgrade to Pro for unlimited watchlists.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Upgrade to Pro
          </Link>
        </div>
      )}

      {/* Watchlist items */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed border-[var(--border)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--border)] mb-4">
            <Star className="h-7 w-7 text-[var(--text-muted)]" />
          </div>
          <p className="text-base font-medium text-[var(--text)] mb-1">Your watchlist is empty</p>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs">
            Search for a stock above, or browse the scanner to find stocks to track.
          </p>
          <Link
            href="/scanner"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <TrendingUp className="h-4 w-4" />
            Browse Scanner
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {items.map(item => (
            <WatchlistRow
              key={item.ticker}
              item={item}
              isRemoving={removing === item.ticker}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function WatchlistRow({
  item,
  isRemoving,
  onRemove,
}: {
  item: WatchlistItem
  isRemoving: boolean
  onRemove: (ticker: string) => void
}) {
  const upsidePositive = (item.upside_pct ?? 0) >= 0

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--border)]/30 transition-colors group">
      <div className="shrink-0">
        <ScoreRing score={item.score ?? 0} size={40} />
      </div>

      <Link href={`/stock/${item.ticker}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
            {item.ticker}
          </span>
          {item.sector && (
            <span className="hidden sm:inline text-xs text-[var(--text-muted)]">{item.sector}</span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
          {item.name ?? item.ticker}
        </p>
      </Link>

      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <span className="text-sm font-mono font-semibold text-[var(--text)] tabular-nums">
          {formatPrice(item.current_price)}
        </span>
        {item.upside_pct != null && (
          <span
            className={cn(
              'text-xs font-mono font-semibold tabular-nums',
              upsidePositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
            )}
          >
            {formatPercent(item.upside_pct)}
          </span>
        )}
      </div>

      <button
        onClick={() => onRemove(item.ticker)}
        disabled={isRemoving}
        className="shrink-0 p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
        title={`Remove ${item.ticker}`}
      >
        {isRemoving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}
