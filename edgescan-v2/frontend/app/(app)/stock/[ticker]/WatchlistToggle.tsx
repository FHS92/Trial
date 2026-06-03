'use client'

import { useState, useEffect, useCallback } from 'react'
import { Star, Check, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Small inline toast that auto-dismisses after 3 seconds */
function InlineToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] animate-fade-in">
      <Check className="h-3 w-3 text-[#22c55e] shrink-0" />
      {message}
      <button onClick={onDismiss} className="ml-0.5 opacity-60 hover:opacity-100" aria-label="Dismiss">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export function WatchlistToggle({ ticker }: { ticker: string }) {
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  // Check current status on mount
  useEffect(() => {
    api.watchlist.list()
      .then(data => {
        setInWatchlist(data.watchlist.some(i => i.ticker === ticker))
      })
      .catch(() => {
        // Not signed in or error — hide button gracefully
      })
  }, [ticker])

  async function handleToggle() {
    setLoading(true)
    setLimitReached(false)
    setToast(null)
    try {
      if (inWatchlist) {
        await api.watchlist.remove(ticker)
        setInWatchlist(false)
        setToast(`${ticker} removed from watchlist`)
      } else {
        await api.watchlist.add(ticker)
        setInWatchlist(true)
        setToast(`${ticker} added to watchlist`)
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setInWatchlist(true) // already in watchlist
      } else if (err instanceof ApiError && err.status === 401) {
        window.location.href = '/login?callbackUrl=/stock/' + ticker
      } else if (err instanceof ApiError && err.status === 402) {
        setLimitReached(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          inWatchlist
            ? 'bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20'
            : 'bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/80'
        )}
        title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : inWatchlist ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Star className="h-3.5 w-3.5" />
        )}
        <span>{inWatchlist ? 'In Watchlist' : 'Watch'}</span>
      </button>
      {toast && (
        <InlineToast message={toast} onDismiss={dismissToast} />
      )}
      {limitReached && (
        <p className="text-xs text-[var(--text-muted)]">
          Watchlist full.{' '}
          <Link href="/upgrade" className="text-[var(--accent)] hover:opacity-80 font-medium transition-opacity">
            Upgrade for unlimited
          </Link>
        </p>
      )}
    </div>
  )
}
