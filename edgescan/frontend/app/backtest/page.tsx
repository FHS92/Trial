'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import UniverseBadge from '@/components/UniverseBadge'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Holding { ticker: string; score: number; entry: number; exit: number; return_pct: number; pnl: number }
interface MonthResult {
  month: string
  holdings: Holding[]
  port_return_pct: number
  portfolio_value: number
  spy_return_pct: number | null
  vs_spy_pct: number | null
}
interface YearResult { year: number; port_return_pct: number; spy_return_pct: number; outperformance_pct: number; end_value: number }
interface Summary {
  start_date: string; end_date: string; n_stocks: number; months_traded: number
  starting_capital: number; final_value: number; total_return_pct: number
  spy_final_value: number; spy_total_return_pct: number; outperformance_pct: number
  winning_months: number; winning_months_pct: number
  beat_spy_months: number; beat_spy_months_pct: number
  hold_months?: number
}
interface BacktestData { monthly: MonthResult[]; yearly: YearResult[]; summary: Summary; run_at?: string }

function pct(n: number | null) {
  if (n === null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
function usd(n: number) { return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function pctColor(n: number | null) { if (n === null) return '#6b7a99'; return n >= 0 ? '#22c55e' : '#ef4444' }

const HOLD_OPTIONS = [
  { months: 1, label: '1-Month Hold', short: '1M' },
  { months: 3, label: '3-Month Hold', short: '3M' },
]

const UNIVERSE_OPTIONS: { value: 'sp500' | 'russell'; label: string }[] = [
  { value: 'sp500', label: 'S&P 500' },
  { value: 'russell', label: 'Russell 1000' },
]

export default function BacktestPage() {
  const [data, setData] = useState<BacktestData | null>(null)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [holdMonths, setHoldMonths] = useState(1)
  const [universe, setUniverse] = useState<'sp500' | 'russell'>('sp500')

  useEffect(() => {
    const stored = localStorage.getItem('edgescan_universe')
    if (stored === 'sp500' || stored === 'russell') setUniverse(stored)
  }, [])

  async function loadLatest(hm: number) {
    setLoading(true); setError('')
    try {
      const r = await fetch(`${BASE}/api/backtest/latest?hold_months=${hm}&universe=${universe}`, { cache: 'no-store' })
      if (!r.ok) throw new Error(r.status === 404 ? `No ${hm}-month backtest run yet — click Run to start one.` : 'Failed to load')
      setData(await r.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading results')
    } finally { setLoading(false) }
  }

  async function runBacktest(hm: number) {
    setHoldMonths(hm)
    setRunning(true); setError(''); setElapsed(0)
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    try {
      const r = await fetch(`${BASE}/api/backtest/run?n_stocks=100&hold_months=${hm}&universe=${universe}`, {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(600_000), // 10 min max
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail ?? `Server error ${r.status}`)
      }
      setData(await r.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Run failed')
    } finally { setRunning(false); clearInterval(timer) }
  }

  const s = data?.summary
  const activeHold = s?.hold_months ?? holdMonths

  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 sm:px-6 h-14"
        style={{ background: 'rgba(8,11,18,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="font-semibold text-sm" style={{ color: '#e2e8f8' }}>Backtest</span>
        <UniverseBadge />
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#e2e8f8' }}>Technical Score Backtest</h1>
          <p className="text-sm" style={{ color: '#6b7a99' }}>
            Jan 2020 → today · Top 3 picks · $6,000 start · Technical + Fundamental · Equal-weight monthly rotation · {UNIVERSE_OPTIONS.find(u => u.value === universe)?.label} · vs SPY buy-and-hold
          </p>
        </div>

        {/* Hold period selector + universe selector + run/load controls */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {HOLD_OPTIONS.map(opt => (
              <button
                key={opt.months}
                onClick={() => setHoldMonths(opt.months)}
                disabled={running || loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
                style={{
                  background: holdMonths === opt.months ? '#4f8ef7' : 'rgba(255,255,255,0.06)',
                  color: holdMonths === opt.months ? '#fff' : '#a0aec0',
                  border: '1px solid',
                  borderColor: holdMonths === opt.months ? '#4f8ef7' : 'rgba(255,255,255,0.08)',
                }}
              >
                {opt.label}
              </button>
            ))}
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
            {UNIVERSE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setUniverse(opt.value)}
                disabled={running || loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
                style={{
                  background: universe === opt.value ? '#4f8ef7' : 'rgba(255,255,255,0.06)',
                  color: universe === opt.value ? '#fff' : '#a0aec0',
                  border: '1px solid',
                  borderColor: universe === opt.value ? '#4f8ef7' : 'rgba(255,255,255,0.08)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => runBacktest(holdMonths)}
              disabled={running || loading}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              style={{ background: '#4f8ef7', color: '#fff' }}
            >
              {running ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Running… {elapsed}s
                </>
              ) : `Run ${holdMonths}M Backtest (~3 min)`}
            </button>
            <button
              onClick={() => loadLatest(holdMonths)}
              disabled={running || loading}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f8' }}
            >
              {loading ? 'Loading…' : `Load Last ${holdMonths}M Results`}
            </button>
          </div>
        </div>

        {running && (
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)' }}>
            <p className="text-sm" style={{ color: '#4f8ef7' }}>
              Downloading 5+ years of price data for 100 stocks and computing monthly signals… this takes 2-4 minutes.
            </p>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full animate-pulse" style={{ width: `${Math.min(elapsed / 180 * 100, 95)}%`, background: '#4f8ef7', transition: 'width 1s' }} />
            </div>
          </div>
        )}

        {error && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</p>}

        {data && s && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'EdgeScan Final', value: usd(s.final_value), sub: pct(s.total_return_pct), subColor: pctColor(s.total_return_pct) },
                { label: 'SPY Buy & Hold', value: usd(s.spy_final_value), sub: pct(s.spy_total_return_pct), subColor: pctColor(s.spy_total_return_pct) },
                { label: 'Outperformance', value: pct(s.outperformance_pct), sub: `vs SPY`, subColor: '#6b7a99', valColor: pctColor(s.outperformance_pct) },
                { label: 'Winning Months', value: `${s.winning_months}/${s.months_traded}`, sub: `${s.winning_months_pct}%`, subColor: '#6b7a99' },
              ].map(c => (
                <div key={c.label} className="rounded-xl p-4" style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs mb-1" style={{ color: '#6b7a99' }}>{c.label}</p>
                  <p className="text-lg font-bold" style={{ color: c.valColor ?? '#e2e8f8' }}>{c.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: c.subColor }}>{c.sub}</p>
                </div>
              ))}
            </div>

            <p className="text-xs" style={{ color: '#3a4259' }}>
              {data.run_at && `Run ${new Date(data.run_at).toLocaleString()} · `}
              {activeHold}-month hold · {UNIVERSE_OPTIONS.find(u => u.value === universe)?.label} · {s.n_stocks} stocks · {s.months_traded} months · Beat SPY {s.beat_spy_months}/{s.months_traded} ({s.beat_spy_months_pct}%)
            </p>

            {/* Yearly summary */}
            <div>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#e2e8f8' }}>Yearly Summary</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="grid text-xs px-4 py-2" style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr', background: '#0a0e17', color: '#6b7a99', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span>Year</span><span className="text-right">EdgeScan</span><span className="text-right">SPY</span><span className="text-right">vs SPY</span><span className="text-right">End Value</span>
                </div>
                {data.yearly.map((y, i) => (
                  <div key={y.year} className="grid px-4 py-3 text-sm items-center" style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr', background: i % 2 === 0 ? '#0f1521' : '#0b1019', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="font-semibold" style={{ color: '#e2e8f8' }}>{y.year}</span>
                    <span className="text-right font-medium" style={{ color: pctColor(y.port_return_pct) }}>{pct(y.port_return_pct)}</span>
                    <span className="text-right" style={{ color: pctColor(y.spy_return_pct) }}>{pct(y.spy_return_pct)}</span>
                    <span className="text-right font-bold" style={{ color: pctColor(y.outperformance_pct) }}>{pct(y.outperformance_pct)}</span>
                    <span className="text-right" style={{ color: '#a0aec0' }}>{usd(y.end_value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly table */}
            <div>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#e2e8f8' }}>Monthly Breakdown</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="hidden sm:grid text-xs px-4 py-2" style={{ gridTemplateColumns: '75px 1fr 90px 110px 80px 80px', background: '#0a0e17', color: '#6b7a99', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span>Month</span><span>Picks</span><span className="text-right">Port %</span><span className="text-right">Port Value</span><span className="text-right">SPY %</span><span className="text-right">vs SPY</span>
                </div>
                {data.monthly.map((r, i) => {
                  const picks = r.holdings.map(h => `${h.ticker}(${h.score})`).join(' · ')
                  return (
                    <div key={r.month} className="grid px-4 py-2.5 text-xs sm:text-sm items-center gap-1" style={{ gridTemplateColumns: '75px 1fr 90px 110px 80px 80px', background: i % 2 === 0 ? '#0f1521' : '#0b1019', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span className="font-medium" style={{ color: '#a0aec0' }}>{r.month}</span>
                      <span className="text-xs truncate" style={{ color: '#6b7a99' }}>{picks}</span>
                      <span className="text-right font-semibold" style={{ color: pctColor(r.port_return_pct) }}>{pct(r.port_return_pct)}</span>
                      <span className="text-right" style={{ color: '#e2e8f8' }}>{usd(r.portfolio_value)}</span>
                      <span className="text-right" style={{ color: pctColor(r.spy_return_pct) }}>{pct(r.spy_return_pct)}</span>
                      <span className="text-right font-medium" style={{ color: pctColor(r.vs_spy_pct) }}>{pct(r.vs_spy_pct)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl p-4 text-xs space-y-1" style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)', color: '#6b7a99' }}>
              <p>⚠ Fundamental data from SEC EDGAR filings — point-in-time, no look-ahead bias</p>
              <p>⚠ Survivorship bias — universe uses current S&P 500 members, not historical composition</p>
              <p>⚠ No transaction costs, slippage, or taxes modeled</p>
              <p>⚠ Past performance does not predict future results</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
