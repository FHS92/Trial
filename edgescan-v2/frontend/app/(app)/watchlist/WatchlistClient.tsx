'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Star, X, TrendingUp, ArrowRight, Loader2, Plus } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { ScoreRing } from '@/components/score/ScoreRing'
import { ScoreBadge } from '@/components/score/ScoreBadge'
import { formatPrice, formatPercent, cn } from '@/lib/utils'
import type { WatchlistItem, ScanResult } from '@/lib/types'
import { SearchBar } from './SearchBar'

export function WatchlistClient() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [limit, setLimit] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ScanResult[]>([])

  const load = useCallback(async () => {
    try {
      const data = await api.watchlist.list()
      setItems(data.watchlist)
      setLimit(data.limit)
      if (data.watchlist.length === 0) {
        try {
          const scanData = await api.scanner.list({ limit: 3 })
          setSuggestions(scanData.results.slice(0, 3))
        } catch { /* suggestions are optional */ }
      }
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
    } catch { /* silently retryable */ }
    finally { setRemoving(null) }
  }

  async function handleAdd(ticker: string) {
    try {
      await api.watchlist.add(ticker)
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) return
      if (err instanceof ApiError && err.status === 402) { try { await load() } catch { /* ignore */ }; return }
    }
  }

  const atLimit = limit !== null && items.length >= limit
  const isFree = limit !== null

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] mb-1">Watchlist</h1>
        <div className="space-y-2 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[var(--radius-lg)] bg-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error === 'sign-in-required') {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] mb-1">Watchlist</h1>
        <div className="mt-8 flex flex-col items-center justify-center py-16 px-4 text-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border)]">
          <Star className="h-10 w-10 text-[var(--text-muted)] mb-4" />
          <p className="text-base font-bold text-[var(--text)] mb-2">Sign in to use your watchlist</p>
          <Link
            href="/login?callbackUrl=/watchlist"
            className="pro-button inline-flex items-center gap-2 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white shadow-sm mt-2"
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
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] mb-1">Watchlist</h1>
        <div
          className="mt-4 rounded-[var(--radius)] border px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}
          role="alert"
        >
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-gradient">Watchlist</h1>
          {isFree && limit !== null ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center justify-between max-w-[180px]">
                <p className="text-xs text-[var(--text-muted)]">{items.length} / {limit} slots</p>
              </div>
              <div className="h-1.5 w-36 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (items.length / limit) * 100)}%`,
                    backgroundColor: items.length >= limit
                      ? 'var(--score-weak)'
                      : items.length >= limit * 0.8
                        ? 'var(--score-moderate)'
                        : 'var(--accent)',
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {items.length} stock{items.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isFree && (
          <Link
            href="/upgrade"
            className="pro-button flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold text-white shrink-0 shadow-sm"
          >
            Unlimited with Pro
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Add stock search */}
      {!atLimit && (
        <SearchBar onAdd={handleAdd} existingTickers={items.map(i => i.ticker)} />
      )}

      {atLimit && isFree && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 text-sm"
          style={{ background: 'var(--accent-light)', borderColor: 'var(--accent-glow)' }}
        >
          <p className="font-bold text-[var(--text)] mb-1">Watchlist full ({limit}/{limit})</p>
          <p className="text-[var(--text-muted)] text-xs mb-3">
            Free accounts track up to {limit} stocks. Upgrade to Pro for unlimited watchlists.
          </p>
          <Link
            href="/upgrade"
            className="pro-button inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}

      {/* Watchlist items */}
      {items.length === 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border)]">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full mb-4"
              style={{ background: 'var(--surface-elevated)' }}
            >
              <Star className="h-7 w-7 text-[var(--text-muted)]" />
            </div>
            <p className="text-base font-bold text-[var(--text)] mb-1">Your watchlist is empty</p>
            <p className="text-sm text-[var(--text-muted)] mb-5 max-w-xs">
              Search for a stock above, or start with these top-ranked picks.
            </p>
            <Link
              href="/scanner"
              className="pro-button inline-flex items-center gap-2 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              <TrendingUp className="h-4 w-4" />
              Browse All Stocks
            </Link>
          </div>

          {suggestions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-2 px-1">
                Top picks right now
              </p>
              <div
                className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-sm)]"
                style={{ background: 'var(--surface)' }}
              >
                {suggestions.map((s) => (
                  <div
                    key={s.ticker}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <ScoreRing score={s.score} size={40} />
                    <Link href={`/stock/${s.ticker}`} className="flex-1 min-w-0 group">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors tracking-tight">{s.ticker}</span>
                        <ScoreBadge score={s.score} />
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{s.name}</p>
                    </Link>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-sm font-mono font-bold text-[var(--text)] tabular-nums">{formatPrice(s.current_price)}</span>
                      {s.upside_pct != null && (
                        <span className={cn('text-xs font-mono font-semibold tabular-nums')} style={{ color: (s.upside_pct ?? 0) >= 0 ? 'var(--score-strong)' : 'var(--score-weak)' }}>
                          {formatPercent(s.upside_pct)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAdd(s.ticker)}
                      className="shrink-0 p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
                      title={`Add ${s.ticker} to watchlist`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-sm)]"
          style={{ background: 'var(--surface)' }}
        >
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
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 transition-all duration-150 group hover:bg-[var(--surface-hover)] hover:shadow-[inset_3px_0_0_var(--accent)]">
      <div className="shrink-0">
        <ScoreRing score={item.score ?? 0} size={42} />
      </div>

      <Link href={`/stock/${item.ticker}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors tracking-tight">
            {item.ticker}
          </span>
          {item.sector && (
            <span className="hidden sm:inline text-xs text-[var(--text-subtle)]">{item.sector}</span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
          {item.name ?? item.ticker}
        </p>
      </Link>

      <div className="flex flex-col items-end shrink-0 gap-0.5 min-w-[64px]">
        <span className="text-sm font-mono font-bold text-[var(--text)] tabular-nums">
          {formatPrice(item.current_price)}
        </span>
        {item.upside_pct != null && (
          <span
            className="text-xs font-mono font-semibold tabular-nums"
            style={{ color: upsidePositive ? 'var(--score-strong)' : 'var(--score-weak)' }}
          >
            {formatPercent(item.upside_pct)}
          </span>
        )}
      </div>

      <button
        onClick={() => onRemove(item.ticker)}
        disabled={isRemoving}
        className="shrink-0 p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/8 transition-colors disabled:opacity-50"
        title={`Remove ${item.ticker}`}
      >
        {isRemoving
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <X className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  )
}
