'use client'

import { useState, useEffect } from 'react'
import UniverseBadge from '@/components/UniverseBadge'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface OpenPosition {
  ticker: string
  month: string
  score: number
  entry_price: number
  current_price: number
  shares: number
  unrealized_pnl: number
  return_pct: number
}

interface MonthHistory {
  month: string
  picks: string[]
  month_pnl: number
  portfolio_value: number
}

interface PortfolioData {
  universe: string
  starting_capital: number
  current_value: number
  total_return_pct: number
  open_positions: OpenPosition[]
  monthly_history: MonthHistory[]
}

type Universe = 'sp500' | 'russell'

function usd(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function pctColor(n: number) {
  return n >= 0 ? '#22c55e' : '#ef4444'
}

const UNIVERSE_OPTIONS: { value: Universe; label: string }[] = [
  { value: 'sp500', label: 'S&P 500' },
  { value: 'russell', label: 'Russell 1000' },
]

export default function PaperTradingPage() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [universe, setUniverse] = useState<Universe>('sp500')
  const [rebalancing, setRebalancing] = useState(false)
  const [rebalanceMsg, setRebalanceMsg] = useState('')
  const [rebalanceError, setRebalanceError] = useState('')

  async function loadPortfolio(u: Universe) {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${BASE}/api/paper-trading?universe=${u}`, { cache: 'no-store' })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail ?? `Server error ${r.status}`)
      }
      setData(await r.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio data')
    } finally {
      setLoading(false)
    }
  }

  async function triggerRebalance() {
    setRebalancing(true)
    setRebalanceMsg('')
    setRebalanceError('')
    try {
      const r = await fetch(`${BASE}/api/paper-trading/rebalance?universe=${universe}`, {
        method: 'POST',
        cache: 'no-store',
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail ?? `Server error ${r.status}`)
      }
      const result = await r.json()
      setRebalanceMsg(result.message ?? 'Rebalance triggered successfully.')
      await loadPortfolio(universe)
    } catch (e: unknown) {
      setRebalanceError(e instanceof Error ? e.message : 'Rebalance failed')
    } finally {
      setRebalancing(false)
    }
  }

  function handleUniverseChange(u: Universe) {
    setUniverse(u)
    setData(null)
    setError('')
    setRebalanceMsg('')
    setRebalanceError('')
  }

  useEffect(() => {
    const stored = localStorage.getItem('edgescan_universe') as Universe | null
    if (stored === 'sp500' || stored === 'russell') setUniverse(stored)
  }, [])

  useEffect(() => {
    loadPortfolio(universe)
  }, [universe])

  const isEmpty =
    data !== null &&
    data.open_positions.length === 0 &&
    data.monthly_history.length === 0

  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 sm:px-6 h-14"
        style={{
          background: 'rgba(8,11,18,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span className="font-semibold text-sm" style={{ color: '#e2e8f8' }}>
          Paper Trading
        </span>
        <UniverseBadge />
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Page title + subtitle */}
        <div className="mb-5">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#e2e8f8' }}>
            Paper Trading Portfolio
          </h1>
          <p className="text-sm" style={{ color: '#6b7a99' }}>
            Live simulation · $6,000 starting capital · Top picks · Monthly auto-rebalance
          </p>
        </div>

        {/* Universe selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {UNIVERSE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleUniverseChange(opt.value)}
              disabled={loading || rebalancing}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
              style={{
                background: universe === opt.value ? '#4f8ef7' : 'rgba(255,255,255,0.06)',
                color: universe === opt.value ? '#fff' : '#a0aec0',
                border: '1px solid',
                borderColor:
                  universe === opt.value ? '#4f8ef7' : 'rgba(255,255,255,0.08)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 py-6" style={{ color: '#6b7a99' }}>
            <svg
              className="animate-spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="text-sm">Loading portfolio…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p
            className="text-sm mb-4 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          >
            {error}
          </p>
        )}

        {/* Empty state */}
        {!loading && isEmpty && (
          <div
            className="rounded-xl p-6 mb-6 text-sm"
            style={{
              background: '#0f1521',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#6b7a99',
            }}
          >
            No paper trades yet. The model auto-rebalances on the 1st of each month. Use the
            button below to trigger now.
          </div>
        )}

        {/* Summary cards */}
        {data && !loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: 'Portfolio Value',
                  value: usd(data.current_value),
                  valueColor: '#e2e8f8',
                  sub: null,
                },
                {
                  label: 'Total Return',
                  value: pct(data.total_return_pct),
                  valueColor: pctColor(data.total_return_pct),
                  sub: null,
                },
                {
                  label: 'Starting Capital',
                  value: usd(data.starting_capital),
                  valueColor: '#e2e8f8',
                  sub: null,
                },
                {
                  label: 'Open Positions',
                  value: String(data.open_positions.length),
                  valueColor: '#e2e8f8',
                  sub: null,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl p-4"
                  style={{
                    background: '#0f1521',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: '#6b7a99' }}>
                    {card.label}
                  </p>
                  <p className="text-lg font-bold" style={{ color: card.valueColor }}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Open Positions */}
            {data.open_positions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-3" style={{ color: '#e2e8f8' }}>
                  Open Positions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.open_positions.map((pos) => (
                    <div
                      key={`${pos.ticker}-${pos.month}`}
                      className="rounded-xl p-4"
                      style={{
                        background: '#0f1521',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p
                            className="text-base font-bold"
                            style={{ color: '#e2e8f8' }}
                          >
                            {pos.ticker}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#6b7a99' }}>
                            Since {pos.month} · Score {pos.score}
                          </p>
                        </div>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: pctColor(pos.return_pct) }}
                        >
                          {pct(pos.return_pct)}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: '#6b7a99' }}>Entry</span>
                          <span style={{ color: '#a0aec0' }}>{usd(pos.entry_price)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: '#6b7a99' }}>Current</span>
                          <span style={{ color: '#e2e8f8' }}>{usd(pos.current_price)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: '#6b7a99' }}>Shares</span>
                          <span style={{ color: '#a0aec0' }}>
                            {pos.shares.toFixed(3)}
                          </span>
                        </div>
                        <div
                          className="flex justify-between text-xs pt-1.5"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          <span style={{ color: '#6b7a99' }}>Unrealized P&amp;L</span>
                          <span
                            className="font-semibold"
                            style={{ color: pctColor(pos.unrealized_pnl) }}
                          >
                            {pos.unrealized_pnl >= 0 ? '+' : ''}
                            {usd(pos.unrealized_pnl)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly History table */}
            {data.monthly_history.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-3" style={{ color: '#e2e8f8' }}>
                  Monthly History
                </h2>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {/* Table header */}
                  <div
                    className="grid text-xs px-4 py-2"
                    style={{
                      gridTemplateColumns: '85px 1fr 110px 130px',
                      background: '#0a0e17',
                      color: '#6b7a99',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span>Month</span>
                    <span>Picks</span>
                    <span className="text-right">Month P&amp;L</span>
                    <span className="text-right">Portfolio Value</span>
                  </div>

                  {/* Table rows */}
                  {data.monthly_history.map((row, i) => (
                    <div
                      key={row.month}
                      className="grid px-4 py-2.5 text-xs sm:text-sm items-center"
                      style={{
                        gridTemplateColumns: '85px 1fr 110px 130px',
                        background: i % 2 === 0 ? '#0f1521' : '#0b1019',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                      }}
                    >
                      <span className="font-medium" style={{ color: '#a0aec0' }}>
                        {row.month}
                      </span>
                      <span
                        className="text-xs truncate pr-2"
                        style={{ color: '#6b7a99' }}
                      >
                        {row.picks.join(', ')}
                      </span>
                      <span
                        className="text-right font-semibold text-xs"
                        style={{ color: pctColor(row.month_pnl) }}
                      >
                        {row.month_pnl >= 0 ? '+' : ''}
                        {usd(row.month_pnl)}
                      </span>
                      <span
                        className="text-right text-xs"
                        style={{ color: '#e2e8f8' }}
                      >
                        {usd(row.portfolio_value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trigger Rebalance */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: '#e2e8f8' }}>
            Manual Rebalance
          </h2>
          <p className="text-xs mb-3" style={{ color: '#6b7a99' }}>
            The model auto-rebalances on the 1st of each month. You can also trigger it
            manually now.
          </p>

          {rebalanceMsg && (
            <p
              className="text-sm mb-3 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
            >
              {rebalanceMsg}
            </p>
          )}
          {rebalanceError && (
            <p
              className="text-sm mb-3 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
            >
              {rebalanceError}
            </p>
          )}

          <button
            onClick={triggerRebalance}
            disabled={rebalancing || loading}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            style={{ background: '#4f8ef7', color: '#fff' }}
          >
            {rebalancing ? (
              <>
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Rebalancing…
              </>
            ) : (
              'Trigger Rebalance'
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
