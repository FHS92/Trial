'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { PortfolioHolding, PortfolioSummary } from '@/lib/types'

const STORAGE_KEY = 'edgescan_username'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 40)
}

function scoreColor(score: number | null) {
  if (score === null) return '#6b7a99'
  if (score >= 70) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function pnlColor(val: number | null) {
  if (val === null) return '#6b7a99'
  return val >= 0 ? '#22c55e' : '#ef4444'
}

function fmt(n: number | null, prefix = '$') {
  if (n === null) return '—'
  return `${prefix}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(n: number | null) {
  if (n === null) return '—'
  return `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(2)}%`
}

export default function PortfolioPage() {
  const [username, setUsername] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [showForm, setShowForm] = useState(false)
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyDate, setBuyDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setUsername(saved)
  }, [])

  const loadPortfolio = useCallback(async (user: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.portfolio(user)
      setHoldings(data.holdings)
      setSummary(data.summary)
    } catch {
      setError('Could not load portfolio. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (username) loadPortfolio(username)
  }, [username, loadPortfolio])

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    const slug = slugify(nameInput.trim())
    if (!slug) return
    localStorage.setItem(STORAGE_KEY, slug)
    setUsername(slug)
  }

  async function handleAddHolding(e: React.FormEvent) {
    e.preventDefault()
    if (!username) return
    setSubmitting(true)
    try {
      await api.addHolding(username, ticker, parseFloat(shares), parseFloat(buyPrice), buyDate || undefined)
      setTicker(''); setShares(''); setBuyPrice(''); setBuyDate('')
      setShowForm(false)
      await loadPortfolio(username)
    } catch {
      setError('Failed to add holding.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(t: string) {
    if (!username) return
    await api.deleteHolding(username, t)
    await loadPortfolio(username)
  }

  // ── Name entry screen ───────────────────────────────────────────────────────
  if (!username) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#080b12' }}>
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-1 mb-8">
            <span className="text-base font-bold" style={{ color: '#4f8ef7' }}>Edge</span>
            <span className="text-base font-bold" style={{ color: '#e2e8f8' }}>Scan</span>
          </Link>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#e2e8f8' }}>My Portfolio</h1>
          <p className="text-sm mb-6" style={{ color: '#6b7a99' }}>
            Enter a name to create or access your portfolio. No password needed — just remember your name.
          </p>
          <form onSubmit={handleNameSubmit} className="flex gap-2">
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="e.g. eltigre"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#131720', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f8' }}
            />
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ background: '#4f8ef7', color: '#fff' }}
            >
              Go
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Main portfolio view ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-14 gap-4"
        style={{
          background: 'rgba(8,11,18,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-base font-bold tracking-tight" style={{ color: '#4f8ef7' }}>Edge</span>
          <span className="text-base font-bold tracking-tight" style={{ color: '#e2e8f8' }}>Scan</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}>
            {username}
          </span>
          <button
            onClick={() => { localStorage.removeItem(STORAGE_KEY); setUsername(null); setHoldings([]); setSummary(null) }}
            className="text-xs px-2 py-1 rounded transition-colors hover:bg-white/[0.06]"
            style={{ color: '#6b7a99' }}
          >
            Switch
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Invested', value: fmt(summary.total_cost), color: '#e2e8f8' },
              { label: 'Current Value', value: fmt(summary.total_value), color: '#e2e8f8' },
              { label: 'Total P&L', value: `${summary.total_pnl !== null && summary.total_pnl >= 0 ? '+' : ''}${fmt(summary.total_pnl)}`, color: pnlColor(summary.total_pnl) },
              { label: 'Return', value: fmtPct(summary.total_pnl_pct), color: pnlColor(summary.total_pnl_pct) },
            ].map(card => (
              <div key={card.label} className="rounded-xl p-4" style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs mb-1" style={{ color: '#6b7a99' }}>{card.label}</p>
                <p className="text-lg font-bold" style={{ color: card.color }}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold" style={{ color: '#e2e8f8' }}>
            Holdings {summary ? `(${summary.positions})` : ''}
          </h1>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: showForm ? 'rgba(79,142,247,0.15)' : '#4f8ef7', color: showForm ? '#4f8ef7' : '#fff' }}
          >
            {showForm ? 'Cancel' : '+ Add Position'}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form
            onSubmit={handleAddHolding}
            className="rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
            style={{ background: '#0f1521', border: '1px solid rgba(79,142,247,0.2)' }}
          >
            {[
              { label: 'Ticker', value: ticker, onChange: (v: string) => setTicker(v.toUpperCase()), placeholder: 'AAPL', required: true },
              { label: 'Shares', value: shares, onChange: setShares, placeholder: '10', required: true, type: 'number' },
              { label: 'Buy Price ($)', value: buyPrice, onChange: setBuyPrice, placeholder: '150.00', required: true, type: 'number' },
              { label: 'Buy Date', value: buyDate, onChange: setBuyDate, placeholder: '', required: false, type: 'date' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs mb-1" style={{ color: '#6b7a99' }}>{f.label}</label>
                <input
                  required={f.required}
                  type={f.type ?? 'text'}
                  value={f.value}
                  onChange={e => f.onChange(e.target.value)}
                  placeholder={f.placeholder}
                  step="any"
                  className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                  style={{ background: '#131720', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f8' }}
                />
              </div>
            ))}
            <div className="col-span-2 sm:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: '#4f8ef7', color: '#fff' }}
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {error && (
          <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</p>
        )}

        {loading && (
          <p className="text-sm text-center py-12" style={{ color: '#6b7a99' }}>Loading portfolio…</p>
        )}

        {!loading && holdings.length === 0 && (
          <div className="text-center py-16" style={{ color: '#6b7a99' }}>
            <p className="text-sm">No positions yet.</p>
            <p className="text-xs mt-1">Add your first holding above.</p>
          </div>
        )}

        {/* Holdings table */}
        {holdings.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Table header */}
            <div
              className="hidden sm:grid text-xs px-4 py-2"
              style={{
                gridTemplateColumns: '1fr 80px 80px 80px 90px 90px 60px 36px',
                background: '#0a0e17',
                color: '#6b7a99',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span>Stock</span>
              <span className="text-right">Shares</span>
              <span className="text-right">Avg Cost</span>
              <span className="text-right">Price</span>
              <span className="text-right">Value</span>
              <span className="text-right">P&L</span>
              <span className="text-right">Score</span>
              <span />
            </div>

            {holdings.map((h, i) => (
              <div
                key={h.ticker}
                className="grid px-4 py-3 items-center gap-2 text-sm"
                style={{
                  gridTemplateColumns: '1fr 80px 80px 80px 90px 90px 60px 36px',
                  background: i % 2 === 0 ? '#0f1521' : '#0b1019',
                  borderBottom: i < holdings.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <div>
                  <Link href={`/stock/${h.ticker}`} className="font-bold hover:underline" style={{ color: '#e2e8f8' }}>
                    {h.ticker}
                  </Link>
                  {h.name && <p className="text-xs truncate" style={{ color: '#6b7a99' }}>{h.name}</p>}
                </div>
                <span className="text-right" style={{ color: '#a0aec0' }}>{h.shares}</span>
                <span className="text-right" style={{ color: '#a0aec0' }}>${h.buy_price.toFixed(2)}</span>
                <span className="text-right" style={{ color: '#e2e8f8' }}>
                  {h.current_price ? `$${h.current_price.toFixed(2)}` : '—'}
                </span>
                <span className="text-right font-medium" style={{ color: '#e2e8f8' }}>{fmt(h.current_value)}</span>
                <div className="text-right">
                  <span className="font-medium" style={{ color: pnlColor(h.pnl) }}>
                    {h.pnl !== null ? `${h.pnl >= 0 ? '+' : ''}${fmt(h.pnl)}` : '—'}
                  </span>
                  {h.pnl_pct !== null && (
                    <p className="text-xs" style={{ color: pnlColor(h.pnl_pct) }}>{fmtPct(h.pnl_pct)}</p>
                  )}
                </div>
                <div className="text-right">
                  {h.score !== null ? (
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{ background: `${scoreColor(h.score)}20`, color: scoreColor(h.score) }}
                    >
                      {h.score}
                    </span>
                  ) : <span style={{ color: '#6b7a99' }}>—</span>}
                </div>
                <button
                  onClick={() => handleDelete(h.ticker)}
                  className="text-right text-xs transition-colors hover:text-red-400"
                  style={{ color: '#6b7a99' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs mt-4 text-center" style={{ color: '#3a4259' }}>
          Prices & scores from last EdgeScan · 15-min delayed
        </p>
      </main>
    </div>
  )
}
