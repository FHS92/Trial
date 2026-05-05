'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import TickerSearch from '@/components/TickerSearch'
import type { PortfolioHolding, PortfolioSummary, PortfolioMetrics, SearchResult } from '@/lib/types'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 40)
}

function scoreColor(score: number | null) {
  if (score === null) return 'var(--color-text-2)'
  if (score >= 70) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function pnlColor(val: number | null) {
  if (val === null) return 'var(--color-text-2)'
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

interface HistoryPoint { date: string; value: number }

function PortfolioChart({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) return null

  const values = history.map(p => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const W = 600
  const H = 80
  const PAD = 4

  const points = history.map((p, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (p.value - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  }).join(' ')

  const first = history[0].value
  const last = history[history.length - 1].value
  const changePct = ((last - first) / first) * 100
  const up = changePct >= 0

  return (
    <div
      className="rounded-xl p-4 mb-6"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-2)' }}>
          Portfolio Value — since {history[0].date}
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{
            background: up ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: up ? '#22c55e' : '#ef4444',
          }}
        >
          {up ? '+' : ''}{changePct.toFixed(2)}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 80, display: 'block', overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke={up ? '#22c55e' : '#ef4444'}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>{history[0].date}</span>
        <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>{history[history.length - 1].date}</span>
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string>('')
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])

  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [ticker, setTicker] = useState('')
  const [amount, setAmount] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyDate, setBuyDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Derive username from the active profile — no manual entry needed
  useEffect(() => {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token) {
      router.replace('/')
      return
    }
    const name = sessionStorage.getItem('edgescan_profile_name') ?? 'default'
    setProfileName(name)
    setUsername(slugify(name))
  }, [router])

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true)
    setMetricsError(null)
    try {
      const res = await api.portfolioMetrics()
      if (res.metrics) {
        setMetrics(res.metrics)
      } else {
        setMetricsError(res.error != null ? String(res.error) : 'No metrics available.')
      }
    } catch {
      setMetricsError('Could not load metrics.')
    } finally {
      setMetricsLoading(false)
    }
  }, [])

const loadPortfolio = useCallback(async (user: string) => {
    setLoading(true)
    setError(null)
    try {
      const [data, hist] = await Promise.all([
        api.portfolio(user),
        api.portfolioHistory().catch(() => ({ history: [] })),
      ])
      setHoldings(data.holdings)
      setSummary(data.summary)
      setHistory(hist.history ?? [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('401')) {
        // Session expired (backend restarted) — send back to profile picker
        sessionStorage.removeItem('edgescan_profile_token')
        sessionStorage.removeItem('edgescan_profile_name')
        router.replace('/')
        return
      }
      setError('Could not load portfolio. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (username) {
      loadPortfolio(username)
      fetchMetrics()
    }
  }, [username, loadPortfolio, fetchMetrics])

  function handleStockSelect(result: SearchResult) {
    setTicker(result.ticker)
    if (result.current_price != null && !buyPrice) {
      setBuyPrice(result.current_price.toFixed(2))
    }
  }

  async function handleAddHolding(e: React.FormEvent) {
    e.preventDefault()
    if (!username) return
    setSubmitting(true)
    try {
      await api.addHolding(username, ticker, parseFloat(amount), parseFloat(buyPrice), buyDate || undefined)
      setTicker(''); setAmount(''); setBuyPrice(''); setBuyDate('')
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

  // Blank screen while session check is in flight
  if (!username) {
    return <div style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)' }} />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-14 gap-4"
        style={{
          background: 'var(--color-header)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-base font-bold tracking-tight" style={{ color: '#4f8ef7' }}>Edge</span>
          <span className="text-base font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Scan</span>
        </Link>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}>
          {profileName}
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Invested', value: fmt(summary.total_cost), color: 'var(--color-text)' },
              { label: 'Current Value', value: fmt(summary.total_value), color: 'var(--color-text)' },
              { label: 'Total P&L', value: `${summary.total_pnl !== null && summary.total_pnl >= 0 ? '+' : ''}${fmt(summary.total_pnl)}`, color: pnlColor(summary.total_pnl) },
              { label: 'Return', value: fmtPct(summary.total_pnl_pct), color: pnlColor(summary.total_pnl_pct) },
            ].map(card => (
              <div key={card.label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-2)' }}>{card.label}</p>
                <p className="text-lg font-bold" style={{ color: card.color }}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Professional Metrics strip */}
        <div className="mb-5">
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-2)' }}>
              Portfolio Metrics
            </p>
          </div>

          {metricsError && (
            <p className="text-xs px-3 py-2 rounded-lg mb-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {metricsError}
            </p>
          )}

          {metricsLoading && (
            <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>Loading metrics…</p>
          )}

          {metrics && (() => {
            function metricColor(val: number | null, thresholds: [number, number], invert = false) {
              if (val === null) return 'var(--color-text-2)'
              const [lo, hi] = thresholds
              if (invert) return val <= lo ? '#22c55e' : val <= hi ? '#f59e0b' : '#ef4444'
              return val >= hi ? '#22c55e' : val >= lo ? '#f59e0b' : '#ef4444'
            }

            const cards = [
              {
                label: 'Total Return',
                value: metrics.total_return_pct !== null ? `${metrics.total_return_pct >= 0 ? '+' : ''}${metrics.total_return_pct.toFixed(2)}%` : '—',
                color: metricColor(metrics.total_return_pct, [0, 10]),
                hint: 'Overall portfolio return since purchase',
              },
              {
                label: 'Win Rate',
                value: metrics.win_rate_pct !== null ? `${metrics.win_rate_pct.toFixed(0)}%` : '—',
                color: metricColor(metrics.win_rate_pct, [40, 60]),
                hint: '% of positions currently profitable',
              },
              {
                label: 'Best Position',
                value: metrics.best_position
                  ? `${metrics.best_position.ticker} ${metrics.best_position.return_pct >= 0 ? '+' : ''}${metrics.best_position.return_pct.toFixed(1)}%`
                  : '—',
                color: '#22c55e',
                hint: 'Highest returning holding',
              },
              {
                label: 'Worst Position',
                value: metrics.worst_position
                  ? `${metrics.worst_position.ticker} ${metrics.worst_position.return_pct >= 0 ? '+' : ''}${metrics.worst_position.return_pct.toFixed(1)}%`
                  : '—',
                color: '#ef4444',
                hint: 'Lowest returning holding',
              },
              {
                label: 'Avg Score',
                value: metrics.avg_score !== null ? metrics.avg_score.toFixed(0) : '—',
                color: metricColor(metrics.avg_score, [50, 70]),
                hint: 'Value-weighted EdgeScan score',
              },
              {
                label: 'Sharpe Ratio',
                value: metrics.sharpe_ratio !== null ? metrics.sharpe_ratio.toFixed(2) : '—',
                color: metricColor(metrics.sharpe_ratio, [0, 1]),
                hint: 'Risk-adj. return — needs price history',
              },
              {
                label: 'Max Drawdown',
                value: metrics.max_drawdown_pct !== null ? `${metrics.max_drawdown_pct.toFixed(1)}%` : '—',
                color: metricColor(metrics.max_drawdown_pct, [-20, -10], true),
                hint: 'Largest peak-to-trough loss — needs price history',
              },
              {
                label: 'Ann. Volatility',
                value: metrics.annual_volatility_pct !== null ? `${metrics.annual_volatility_pct.toFixed(1)}%` : '—',
                color: metricColor(metrics.annual_volatility_pct, [15, 30], true),
                hint: 'Annualised std of daily returns — needs price history',
              },
              {
                label: 'Beta vs SPX',
                value: metrics.beta !== null ? metrics.beta.toFixed(2) : '—',
                color: metricColor(metrics.beta, [0.8, 1.3], true),
                hint: 'Sensitivity to S&P 500 — needs price history',
              },
            ]

            return (
              <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {cards.map(card => (
                  <div
                    key={card.label}
                    className="rounded-xl p-3 shrink-0"
                    style={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      minWidth: 110,
                    }}
                    title={card.hint}
                  >
                    <p className="text-xs mb-1 whitespace-nowrap" style={{ color: 'var(--color-text-2)' }}>{card.label}</p>
                    <p className="text-sm font-bold whitespace-nowrap" style={{ color: card.color }}>{card.value}</p>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Portfolio value chart */}
        {history.length >= 2 && <PortfolioChart history={history} />}

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
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
            className="rounded-xl p-4 mb-4 space-y-3"
            style={{ background: 'var(--color-card)', border: '1px solid rgba(79,142,247,0.2)' }}
          >
            {/* Ticker search */}
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-2)' }}>Stock</label>
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{ background: '#131720', border: '1px solid var(--color-border-2)' }}
              >
                <TickerSearch
                  onSelect={handleStockSelect}
                  placeholder="Search ticker or company…"
                />
              </div>
              {ticker && (
                <p className="text-xs mt-1" style={{ color: '#4f8ef7' }}>Selected: {ticker}</p>
              )}
            </div>

            {/* Amount + Price + Date */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Amount Invested ($)', value: amount, onChange: setAmount, placeholder: '10000', required: true, type: 'number' },
                { label: 'Price Per Share ($)', value: buyPrice, onChange: setBuyPrice, placeholder: '150.00', required: true, type: 'number' },
                { label: 'Buy Date', value: buyDate, onChange: setBuyDate, placeholder: '', required: false, type: 'date' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-2)' }}>{f.label}</label>
                  <input
                    required={f.required}
                    type={f.type}
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                    step="any"
                    className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                    style={{ background: '#131720', border: '1px solid var(--color-border-2)', color: 'var(--color-text)' }}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !ticker}
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
          <p className="text-sm text-center py-12" style={{ color: 'var(--color-text-2)' }}>Loading portfolio…</p>
        )}

        {!loading && holdings.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--color-text-2)' }}>
            <p className="text-sm">No positions yet.</p>
            <p className="text-xs mt-1">Add your first holding above.</p>
          </div>
        )}

        {/* Holdings table */}
        {holdings.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <div
              className="hidden sm:grid text-xs px-4 py-2"
              style={{
                gridTemplateColumns: '1fr 80px 80px 80px 90px 90px 60px 36px',
                background: 'var(--color-card-alt)',
                color: 'var(--color-text-2)',
                borderBottom: '1px solid var(--color-border)',
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
                  background: i % 2 === 0 ? 'var(--color-card)' : '#0b1019',
                  borderBottom: i < holdings.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div>
                  <Link href={`/stock/${h.ticker}`} className="font-bold hover:underline" style={{ color: 'var(--color-text)' }}>
                    {h.ticker}
                  </Link>
                  {h.name && <p className="text-xs truncate" style={{ color: 'var(--color-text-2)' }}>{h.name}</p>}
                </div>
                <span className="text-right" style={{ color: '#a0aec0' }}>{h.shares}</span>
                <span className="text-right" style={{ color: '#a0aec0' }}>${h.buy_price.toFixed(2)}</span>
                <span className="text-right" style={{ color: 'var(--color-text)' }}>
                  {h.current_price ? `$${h.current_price.toFixed(2)}` : '—'}
                </span>
                <span className="text-right font-medium" style={{ color: 'var(--color-text)' }}>{fmt(h.current_value)}</span>
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
                  ) : <span style={{ color: 'var(--color-text-2)' }}>—</span>}
                </div>
                <button
                  onClick={() => handleDelete(h.ticker)}
                  className="text-right text-xs transition-colors hover:text-red-400"
                  style={{ color: 'var(--color-text-2)' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs mt-4 text-center" style={{ color: 'var(--color-text-3)' }}>
          Prices & scores from last EdgeScan · 15-min delayed
        </p>

        {/* Risk view */}
        {holdings.length > 0 && (
          <div className="mt-8 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-2)' }}>Risk View</h2>

            {(() => {
              const alerts = holdings.filter(h => h.score !== null && h.score_at_buy !== null && h.score_delta !== null && h.score_delta <= -10)
              return alerts.length > 0 ? (
                <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#ef4444' }}>⚠ Score Drop Alerts</p>
                  {alerts.map(h => (
                    <div key={h.ticker} className="flex items-center justify-between">
                      <Link href={`/stock/${h.ticker}`} className="text-sm font-bold hover:underline" style={{ color: 'var(--color-text)' }}>{h.ticker}</Link>
                      <span className="text-xs" style={{ color: '#ef4444' }}>
                        Score dropped {h.score_delta} pts ({h.score_at_buy} → {h.score})
                      </span>
                    </div>
                  ))}
                </div>
              ) : null
            })()}

            {(() => {
              const sectorMap: Record<string, number> = {}
              const total = holdings.reduce((sum, h) => sum + (h.current_value ?? h.cost_basis), 0)
              holdings.forEach(h => {
                const s = h.sector || 'Unknown'
                sectorMap[s] = (sectorMap[s] || 0) + (h.current_value ?? h.cost_basis)
              })
              const sectors = Object.entries(sectorMap).map(([s, v]) => ({ sector: s, pct: (v / total) * 100 })).sort((a, b) => b.pct - a.pct)
              return sectors.length > 1 ? (
                <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-2)' }}>Sector Concentration</p>
                  {sectors.map(({ sector, pct }) => (
                    <div key={sector} className="flex items-center gap-3 mb-2">
                      <span className="text-xs w-32 truncate" style={{ color: '#a0aec0' }}>{sector}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#4f8ef7' }} />
                      </div>
                      <span className="text-xs w-10 text-right" style={{ color: 'var(--color-text-2)' }}>{pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              ) : null
            })()}

            {(() => {
              const scored = holdings.filter(h => h.score !== null)
              if (scored.length === 0) return null
              const avg = scored.reduce((sum, h) => sum + h.score!, 0) / scored.length
              return (
                <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>Portfolio Avg Score</p>
                    <p className="text-2xl font-black mt-0.5" style={{ color: scoreColor(avg) }}>{avg.toFixed(1)}</p>
                  </div>
                  <p className="text-xs text-right" style={{ color: 'var(--color-text-2)' }}>Based on {scored.length} position{scored.length > 1 ? 's' : ''}<br />with EdgeScan data</p>
                </div>
              )
            })()}
          </div>
        )}
      </main>
    </div>
  )
}
