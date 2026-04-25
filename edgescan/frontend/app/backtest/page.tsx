'use client'

import { useState } from 'react'
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

interface RobHistogram { counts: number[]; edges: number[] }
interface RobustnessData {
  original_return_pct: number
  spy_total_return_pct: number
  n_runs: number
  n_months: number
  actual_rank_pct: number
  beat_spy_pct: number
  prob_positive: number
  percentiles: Record<string, number>
  histogram: RobHistogram
}

function RobustnessHistogram({ histogram, actualRet }: { histogram: RobHistogram; actualRet: number }) {
  const { counts, edges } = histogram
  const maxCount = Math.max(...counts, 1)
  const H = 72
  const barW = 100 / counts.length
  const minEdge = edges[0]
  const maxEdge = edges[edges.length - 1]
  const range = maxEdge - minEdge || 1
  const actualX = ((actualRet - minEdge) / range) * 100

  return (
    <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" width="100%" height={H} aria-hidden="true">
      {counts.map((c, i) => {
        const barH = (c / maxCount) * (H - 4)
        const x = i * barW
        const midEdge = (edges[i] + edges[i + 1]) / 2
        return (
          <rect
            key={i}
            x={x + 0.2}
            y={H - barH - 2}
            width={barW - 0.4}
            height={barH}
            fill={midEdge >= 0 ? 'rgba(79,142,247,0.45)' : 'rgba(239,68,68,0.45)'}
          />
        )
      })}
      {actualX >= 0 && actualX <= 100 && (
        <line x1={actualX} y1={0} x2={actualX} y2={H} stroke="#f59e0b" strokeWidth={1.2} />
      )}
    </svg>
  )
}

function robustnessVerdict(rank: number) {
  if (rank >= 40 && rank <= 60) return { label: 'Robust', color: '#22c55e', detail: 'Actual return near bootstrap median — strategy performance is not path-dependent.' }
  if (rank > 60 && rank <= 80) return { label: 'Slightly elevated', color: '#f59e0b', detail: 'Actual return above median bootstrap resampling — some path sensitivity.' }
  if (rank > 80) return { label: 'Path-dependent', color: '#ef4444', detail: 'Actual return sits in the upper tail — favourable month ordering may have inflated results.' }
  if (rank >= 20 && rank < 40) return { label: 'Below median', color: '#f59e0b', detail: 'Actual return below median bootstrap resampling — unfavourable month ordering may have suppressed results.' }
  return { label: 'Strongly below median', color: '#ef4444', detail: 'Actual return in the lower tail — results may understate true strategy strength.' }
}

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

export default function BacktestPage() {
  const [data, setData] = useState<BacktestData | null>(null)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [holdMonths, setHoldMonths] = useState(1)
  const [robData, setRobData] = useState<RobustnessData | null>(null)
  const [robLoading, setRobLoading] = useState(false)
  const [robError, setRobError] = useState('')

  async function loadLatest(hm: number) {
    setLoading(true); setError('')
    try {
      const r = await fetch(`${BASE}/api/backtest/latest?hold_months=${hm}&universe=sp500`, { cache: 'no-store' })
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
      const r = await fetch(`${BASE}/api/backtest/run?n_stocks=100&hold_months=${hm}&universe=sp500`, {
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

  async function checkRobustness() {
    setRobLoading(true)
    setRobError('')
    try {
      const r = await fetch(`${BASE}/api/backtest/robustness?hold_months=${holdMonths}&n_runs=500`, {
        method: 'POST',
        cache: 'no-store',
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail ?? `Error ${r.status}`)
      }
      setRobData(await r.json())
    } catch (e: unknown) {
      setRobError(e instanceof Error ? e.message : 'Robustness check failed')
    } finally {
      setRobLoading(false)
    }
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
            Jan 2020 → today · Top 3 picks · $6,000 start · Technical + Fundamental · Equal-weight monthly rotation · S&amp;P 500 · vs SPY buy-and-hold
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
              {activeHold}-month hold · S&amp;P 500 · {s.n_stocks} stocks · {s.months_traded} months · Beat SPY {s.beat_spy_months}/{s.months_traded} ({s.beat_spy_months_pct}%)
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

            {/* Robustness check */}
            <div className="rounded-xl p-4" style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#e2e8f8' }}>Bootstrap Robustness Check</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7a99' }}>
                    Re-sample the {holdMonths}-month backtest&apos;s monthly returns 500× to test if results depend on the specific order months occurred.
                  </p>
                </div>
                <button
                  onClick={checkRobustness}
                  disabled={robLoading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-2 transition-opacity hover:opacity-90 shrink-0"
                  style={{ background: '#4f8ef7', color: '#fff' }}
                >
                  {robLoading ? (
                    <>
                      <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Bootstrapping…
                    </>
                  ) : 'Run Check'}
                </button>
              </div>

              {robError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  {robError}
                </p>
              )}

              {robData && !robLoading && (() => {
                const v = robustnessVerdict(robData.actual_rank_pct)
                return (
                  <div className="space-y-4">
                    {/* Verdict banner */}
                    <div className="rounded-lg px-4 py-3" style={{ background: `${v.color}14`, border: `1px solid ${v.color}33` }}>
                      <p className="text-sm font-bold mb-0.5" style={{ color: v.color }}>{v.label}</p>
                      <p className="text-xs" style={{ color: '#a0aec0' }}>{v.detail}</p>
                    </div>

                    {/* Histogram */}
                    <div>
                      <RobustnessHistogram histogram={robData.histogram} actualRet={robData.original_return_pct} />
                      <div className="flex justify-between text-xs mt-1" style={{ color: '#3a4259' }}>
                        <span>{robData.histogram.edges[0].toFixed(0)}%</span>
                        <span className="flex items-center gap-1">
                          <span style={{ display: 'inline-block', width: 8, height: 2, background: '#f59e0b', verticalAlign: 'middle' }} />
                          actual
                        </span>
                        <span>+{robData.histogram.edges[robData.histogram.edges.length - 1].toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Actual rank', value: `${robData.actual_rank_pct}th pct`, color: v.color },
                        { label: 'Beat SPY (bootstrap)', value: `${robData.beat_spy_pct}%`, color: robData.beat_spy_pct >= 50 ? '#22c55e' : '#ef4444' },
                        { label: 'Prob. positive', value: `${robData.prob_positive}%`, color: robData.prob_positive >= 50 ? '#22c55e' : '#ef4444' },
                      ].map(st => (
                        <div key={st.label} className="rounded-lg px-3 py-2 text-center" style={{ background: '#131720' }}>
                          <p className="text-xs font-bold mb-0.5" style={{ color: st.color }}>{st.value}</p>
                          <p className="text-xs leading-tight" style={{ color: '#6b7a99' }}>{st.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Percentile table */}
                    <div className="rounded-lg overflow-hidden text-xs" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="grid px-3 py-1.5" style={{ gridTemplateColumns: 'repeat(5, 1fr)', background: '#0a0e17', color: '#3a4259' }}>
                        {['5th', '25th', 'Median', '75th', '95th'].map(l => (
                          <span key={l} className="text-center">{l}</span>
                        ))}
                      </div>
                      <div className="grid px-3 py-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)', background: '#0f1521' }}>
                        {['5', '25', '50', '75', '95'].map(k => {
                          const val = robData.percentiles[k] ?? 0
                          return (
                            <span key={k} className="text-center font-semibold" style={{ color: val >= 0 ? '#22c55e' : '#ef4444' }}>
                              {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    <p className="text-xs" style={{ color: '#3a4259' }}>
                      {robData.n_runs.toLocaleString()} bootstrap runs · {robData.n_months} monthly samples · actual {robData.original_return_pct >= 0 ? '+' : ''}{robData.original_return_pct.toFixed(1)}% vs SPY {robData.spy_total_return_pct >= 0 ? '+' : ''}{robData.spy_total_return_pct.toFixed(1)}%
                    </p>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
