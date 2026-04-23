'use client'

import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { StockResult } from '@/lib/types'

const MAX = 3

function scoreColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function MetricRow({ label, values }: { label: string; values: (string | null)[] }) {
  return (
    <>
      {/* Mobile: stacked block — label header + value cells */}
      <div className="sm:hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="px-3 py-1.5 text-xs font-semibold" style={{ color: '#6b7a99', background: '#0a0e17' }}>{label}</div>
        <div className="flex" style={{ background: '#0f1521' }}>
          {values.map((v, i) => (
            <span key={i} className="flex-1 px-3 py-2 text-xs font-medium text-center" style={{ color: '#e2e8f8' }}>{v ?? '—'}</span>
          ))}
        </div>
      </div>

      {/* Desktop: side-by-side grid with fixed label column */}
      <div
        className="hidden sm:grid gap-px"
        style={{ gridTemplateColumns: `160px repeat(${values.length}, 1fr)`, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span className="px-3 py-2.5 text-xs" style={{ color: '#6b7a99', background: '#0a0e17' }}>{label}</span>
        {values.map((v, i) => (
          <span key={i} className="px-3 py-2.5 text-xs font-medium text-center" style={{ color: '#e2e8f8', background: '#0f1521' }}>{v ?? '—'}</span>
        ))}
      </div>
    </>
  )
}

export default function ComparePage() {
  const [input, setInput] = useState('')
  const [stocks, setStocks] = useState<StockResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function addTicker(e: React.FormEvent) {
    e.preventDefault()
    const t = input.trim().toUpperCase()
    if (!t || stocks.find(s => s.ticker === t) || stocks.length >= MAX) return
    setLoading(true)
    setError('')
    try {
      const data = await api.stock(t)
      setStocks(prev => [...prev, data])
      setInput('')
    } catch {
      setError(`Could not find data for ${t}`)
    } finally {
      setLoading(false)
    }
  }

  function remove(ticker: string) {
    setStocks(prev => prev.filter(s => s.ticker !== ticker))
  }

  const n = stocks.length

  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 h-14"
        style={{ background: 'rgba(8,11,18,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Link href="/" className="flex items-center gap-1 text-sm hover:opacity-80" style={{ color: '#6b7a99' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Scanner
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.12)' }}>/</span>
        <span className="font-semibold text-sm" style={{ color: '#e2e8f8' }}>Compare</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#e2e8f8' }}>Stock Comparison</h1>
          <p className="text-sm" style={{ color: '#6b7a99' }}>Add up to {MAX} tickers to compare side by side</p>
        </div>

        {/* Add ticker form */}
        <form onSubmit={addTicker} className="flex gap-2 mb-6">
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            placeholder="Enter ticker (e.g. AAPL)"
            disabled={stocks.length >= MAX}
            className="flex-1 max-w-xs px-3 py-2 rounded-lg text-sm outline-none disabled:opacity-40"
            style={{ background: '#131720', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f8' }}
          />
          <button
            type="submit"
            disabled={loading || stocks.length >= MAX || !input.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: '#4f8ef7', color: '#fff' }}
          >
            {loading ? '…' : 'Add'}
          </button>
          {stocks.length > 0 && (
            <button type="button" onClick={() => setStocks([])} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7a99' }}>
              Clear
            </button>
          )}
        </form>

        {error && <p className="text-sm mb-4" style={{ color: '#ef4444' }}>{error}</p>}

        {n === 0 && (
          <div className="text-center py-20" style={{ color: '#6b7a99' }}>
            <p className="text-sm">Add tickers above to start comparing.</p>
          </div>
        )}

        {n > 0 && (
          <div className="space-y-5">
            {/* Header row — single column on mobile, side-by-side on sm+ */}
            <div className="flex flex-col sm:grid gap-3" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {stocks.map(s => (
                <div key={s.ticker} className="rounded-xl p-4 relative" style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => remove(s.ticker)} className="absolute top-3 right-3 text-xs" style={{ color: '#6b7a99' }}>✕</button>
                  <Link href={`/stock/${s.ticker}`}>
                    <p className="font-bold text-lg" style={{ color: '#e2e8f8' }}>{s.ticker}</p>
                    <p className="text-xs truncate mb-3" style={{ color: '#6b7a99' }}>{s.name}</p>
                  </Link>
                  <div className="text-3xl font-black" style={{ color: scoreColor(s.score) }}>{s.score}</div>
                  <p className="text-xs" style={{ color: '#6b7a99' }}>EdgeScan Score</p>
                  <div className="flex gap-2 mt-3 text-xs">
                    <div className="flex-1 text-center py-1.5 rounded" style={{ background: '#131720' }}>
                      <p style={{ color: '#6b7a99' }}>Fund.</p>
                      <p className="font-bold" style={{ color: '#4f8ef7' }}>{s.fundamental_score}/60</p>
                    </div>
                    <div className="flex-1 text-center py-1.5 rounded" style={{ background: '#131720' }}>
                      <p style={{ color: '#6b7a99' }}>Tech.</p>
                      <p className="font-bold" style={{ color: '#4f8ef7' }}>{s.technical_score}/40</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison table */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <MetricRow label="Price" values={stocks.map(s => s.current_price ? `$${s.current_price.toFixed(2)}` : null)} />
              <MetricRow label="1M Target" values={stocks.map(s => s.price_target_1m ? `$${s.price_target_1m.toFixed(2)}` : null)} />
              <MetricRow label="Upside" values={stocks.map(s => s.upside_pct != null ? `${s.upside_pct >= 0 ? '+' : ''}${s.upside_pct.toFixed(1)}%` : null)} />
              <MetricRow label="Sector" values={stocks.map(s => s.sector)} />
              <MetricRow label="Earnings Date" values={stocks.map(s => s.earnings_date)} />
              <MetricRow label="Rev Growth" values={stocks.map(s => s.metrics?.rev_growth != null ? `${s.metrics.rev_growth.toFixed(1)}%` : null)} />
              <MetricRow label="EPS Growth" values={stocks.map(s => s.metrics?.eps_growth != null ? `${s.metrics.eps_growth.toFixed(1)}%` : null)} />
              <MetricRow label="Gross Margin" values={stocks.map(s => s.metrics?.gross_margin != null ? `${s.metrics.gross_margin.toFixed(1)}%` : null)} />
              <MetricRow label="ROE" values={stocks.map(s => s.metrics?.roe != null ? `${s.metrics.roe.toFixed(1)}%` : null)} />
              <MetricRow label="Fwd P/E" values={stocks.map(s => s.metrics?.fwd_pe != null ? `${s.metrics.fwd_pe.toFixed(1)}x` : null)} />
              <MetricRow label="FCF Yield" values={stocks.map(s => s.metrics?.fcf_yield != null ? `${s.metrics.fcf_yield.toFixed(1)}%` : null)} />
              <MetricRow label="Debt/Equity" values={stocks.map(s => s.metrics?.debt_to_equity != null ? `${s.metrics.debt_to_equity.toFixed(2)}x` : null)} />
              <MetricRow label="RSI (14)" values={stocks.map(s => s.signals?.rsi != null ? s.signals.rsi.toFixed(1) : null)} />
              <MetricRow label="vs 200MA" values={stocks.map(s => s.signals?.pct_above_200ma != null ? `${s.signals.pct_above_200ma >= 0 ? '+' : ''}${s.signals.pct_above_200ma.toFixed(1)}%` : null)} />
              <MetricRow label="52W Position" values={stocks.map(s => s.signals?.from_52w_high != null ? `${s.signals.from_52w_high.toFixed(1)}% from high` : null)} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
