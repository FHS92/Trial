'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Search, Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { TransactionPayload } from '@/lib/types'

interface TickerResult {
  ticker: string
  name: string | null
  score: number | null
}

interface TransactionModalProps {
  // When set, the ticker is locked (trading an existing position).
  lockedTicker?: string
  // Pre-select buy or sell.
  defaultType?: 'buy' | 'sell'
  // Max shares sellable (when selling an existing position).
  maxSellShares?: number
  onClose: () => void
  onSaved: () => void
}

export function TransactionModal({
  lockedTicker,
  defaultType = 'buy',
  maxSellShares,
  onClose,
  onSaved,
}: TransactionModalProps) {
  const [type, setType] = useState<'buy' | 'sell'>(defaultType)
  const [ticker, setTicker] = useState(lockedTicker ?? '')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TickerResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState('')
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ticker autocomplete (only when not trading a locked position).
  useEffect(() => {
    if (lockedTicker) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.search(query.trim())
        setResults(data.results)
        setShowResults(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, lockedTicker])

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function selectTicker(t: TickerResult) {
    setTicker(t.ticker)
    setQuery(t.ticker)
    setShowResults(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const sharesNum = parseFloat(shares)
    const priceNum = parseFloat(price)
    if (!ticker) { setError('Choose a stock first.'); return }
    if (!sharesNum || sharesNum <= 0) { setError('Enter a share count greater than zero.'); return }
    if (!priceNum || priceNum <= 0) { setError('Enter a price greater than zero.'); return }
    if (type === 'sell' && maxSellShares != null && sharesNum > maxSellShares + 1e-9) {
      setError(`You only hold ${maxSellShares} shares of ${ticker}.`); return
    }

    const payload: TransactionPayload = {
      ticker,
      type,
      shares: sharesNum,
      price: priceNum,
      trade_date: tradeDate || undefined,
      notes: notes.trim() || undefined,
    }

    setSubmitting(true)
    try {
      await api.portfolio.addTransaction(payload)
      onSaved()
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Could not record the transaction.')
      } else {
        setError('Could not record the transaction.')
      }
      setSubmitting(false)
    }
  }

  const inputClass = cn(
    'w-full rounded-[var(--radius)] px-3 py-2.5 text-sm',
    'bg-[var(--surface-elevated)] border border-[var(--border)]',
    'text-[var(--text)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors'
  )

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onMouseDown={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] border border-[var(--border)] shadow-[var(--shadow-lg)]"
        style={{ background: 'var(--surface)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--text)]">
            {lockedTicker ? `Trade ${lockedTicker}` : 'Add transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Buy / Sell toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['buy', 'sell'] as const).map(t => {
              const active = type === t
              const isBuy = t === 'buy'
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-[var(--radius)] py-2 text-sm font-semibold border transition-colors',
                    active
                      ? 'border-transparent text-white'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  )}
                  style={active ? { background: isBuy ? 'var(--score-strong)' : 'var(--score-weak)' } : undefined}
                >
                  {isBuy ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                  {isBuy ? 'Buy' : 'Sell'}
                </button>
              )
            })}
          </div>

          {/* Ticker */}
          {lockedTicker ? (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Stock</label>
              <div className="rounded-[var(--radius)] px-3 py-2.5 text-sm font-mono font-bold text-[var(--text)] bg-[var(--surface-elevated)] border border-[var(--border)]">
                {lockedTicker}
              </div>
            </div>
          ) : (
            <div className="relative">
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Stock</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--text-muted)]" />}
                <input
                  type="search"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setTicker('') }}
                  placeholder="Search ticker or company…"
                  className={cn(inputClass, 'pl-9')}
                  aria-label="Search stock to add"
                />
              </div>
              {showResults && results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                  {results.map(r => (
                    <button
                      key={r.ticker}
                      type="button"
                      onClick={() => selectTicker(r)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-[var(--border)]/50 transition-colors"
                    >
                      <span className="font-mono font-semibold text-sm text-[var(--text)]">{r.ticker}</span>
                      {r.name && <span className="text-xs text-[var(--text-muted)] truncate">{r.name}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Shares + price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                Shares{type === 'sell' && maxSellShares != null ? ` (max ${maxSellShares})` : ''}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={shares}
                onChange={e => setShares(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                {type === 'buy' ? 'Buy price' : 'Sell price'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Trade date</label>
            <input
              type="date"
              value={tradeDate}
              onChange={e => setTradeDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Thesis, target, etc."
              className={inputClass}
            />
          </div>

          {error && (
            <div
              className="rounded-[var(--radius)] border px-3 py-2 text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="pro-button w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {type === 'buy' ? 'Add buy' : 'Record sell'}
          </button>
        </form>
      </div>
    </div>
  )
}
