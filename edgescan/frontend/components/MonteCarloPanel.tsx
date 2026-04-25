'use client'

import { useState, useCallback } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Histogram {
  counts: number[]
  edges: number[]
}

interface MCData {
  ticker: string
  current_price: number
  horizon_days: number
  n_simulations: number
  daily_vol_pct: number
  percentiles: Record<string, number>
  prob_positive: number
  prob_gain_10: number
  prob_loss_10: number
  histogram: Histogram
}

const HORIZONS = [
  { days: 30, label: '30 days' },
  { days: 60, label: '60 days' },
  { days: 90, label: '90 days' },
]

function ReturnHistogram({ histogram, originalRet }: { histogram: Histogram; originalRet?: number }) {
  const { counts, edges } = histogram
  const maxCount = Math.max(...counts, 1)
  const H = 80
  const barW = 100 / counts.length

  return (
    <svg
      viewBox={`0 0 100 ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={H}
      aria-hidden="true"
    >
      {counts.map((c, i) => {
        const barH = (c / maxCount) * (H - 4)
        const x = i * barW
        const midEdge = (edges[i] + edges[i + 1]) / 2
        const positive = midEdge >= 0
        return (
          <rect
            key={i}
            x={x + 0.2}
            y={H - barH - 2}
            width={barW - 0.4}
            height={barH}
            fill={positive ? 'rgba(34,197,94,0.55)' : 'rgba(239,68,68,0.55)'}
          />
        )
      })}
      {/* zero line */}
      {(() => {
        const minEdge = edges[0]
        const maxEdge = edges[edges.length - 1]
        const range = maxEdge - minEdge || 1
        const zeroX = ((0 - minEdge) / range) * 100
        if (zeroX < 0 || zeroX > 100) return null
        return <line x1={zeroX} y1={0} x2={zeroX} y2={H} stroke="rgba(255,255,255,0.2)" strokeWidth={0.6} />
      })()}
    </svg>
  )
}

export default function MonteCarloPanel({ ticker }: { ticker: string }) {
  const [horizon, setHorizon] = useState(30)
  const [data, setData] = useState<MCData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ran, setRan] = useState(false)

  const run = useCallback(async (h: number) => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${BASE}/api/stock/${ticker}/monte-carlo?horizon=${h}&n_sims=1000`, {
        cache: 'no-store',
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail ?? `Error ${r.status}`)
      }
      setData(await r.json())
      setRan(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Simulation failed')
    } finally {
      setLoading(false)
    }
  }, [ticker])

  function handleHorizon(h: number) {
    setHorizon(h)
    if (ran) run(h)
  }

  const p = data?.percentiles

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs font-semibold" style={{ color: '#6b7a99' }}>
          Monte Carlo Return Distribution
        </p>
        <div className="flex gap-1">
          {HORIZONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => handleHorizon(opt.days)}
              className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
              style={{
                background: horizon === opt.days ? '#4f8ef7' : 'rgba(255,255,255,0.06)',
                color: horizon === opt.days ? '#fff' : '#6b7a99',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!ran && !loading && (
        <div className="text-center py-4">
          <p className="text-xs mb-3" style={{ color: '#6b7a99' }}>
            Simulate 1,000 price paths using {ticker}&apos;s historical volatility.
          </p>
          <button
            onClick={() => run(horizon)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#4f8ef7', color: '#fff' }}
          >
            Run Simulation
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4" style={{ color: '#6b7a99' }}>
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span className="text-xs">Running 1,000 simulations…</span>
        </div>
      )}

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {error}
        </p>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {/* Histogram */}
          <div>
            <ReturnHistogram histogram={data.histogram} />
            <div className="flex justify-between text-xs mt-1" style={{ color: '#3a4259' }}>
              <span>{data.histogram.edges[0].toFixed(0)}%</span>
              <span>0%</span>
              <span>+{data.histogram.edges[data.histogram.edges.length - 1].toFixed(0)}%</span>
            </div>
          </div>

          {/* Probability stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Prob. positive', value: `${data.prob_positive}%`, color: '#22c55e' },
              { label: 'Prob. >+10%', value: `${data.prob_gain_10}%`, color: '#4f8ef7' },
              { label: 'Prob. <−10%', value: `${data.prob_loss_10}%`, color: '#ef4444' },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-lg px-3 py-2 text-center"
                style={{ background: '#131720' }}
              >
                <p className="text-xs font-bold mb-0.5" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs leading-tight" style={{ color: '#6b7a99' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Percentile table */}
          {p && (
            <div
              className="rounded-lg overflow-hidden text-xs"
              style={{ border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div
                className="grid px-3 py-1.5"
                style={{
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  background: '#0a0e17',
                  color: '#3a4259',
                }}
              >
                {['5th', '25th', 'Median', '75th', '95th'].map(l => (
                  <span key={l} className="text-center">{l}</span>
                ))}
              </div>
              <div
                className="grid px-3 py-2"
                style={{ gridTemplateColumns: 'repeat(5, 1fr)', background: '#0f1521' }}
              >
                {['5', '25', '50', '75', '95'].map(k => (
                  <span
                    key={k}
                    className="text-center font-semibold"
                    style={{ color: (p[k] ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}
                  >
                    {(p[k] ?? 0) >= 0 ? '+' : ''}{p[k]?.toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs" style={{ color: '#3a4259' }}>
            {data.n_simulations.toLocaleString()} simulations · {data.horizon_days}-day horizon · daily vol {data.daily_vol_pct.toFixed(2)}% · not investment advice
          </p>
        </div>
      )}
    </div>
  )
}
