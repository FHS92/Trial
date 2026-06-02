'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'
import { api } from '@/lib/api'
import type { OHLCVBar } from '@/lib/types'
import { cn } from '@/lib/utils'

type Period = '3m' | '6m' | '1y'

interface PriceChartProps {
  ticker: string
}

interface ChartPoint {
  date: string
  close: number
  ma200?: number
}

function computeMA200(bars: OHLCVBar[]): ChartPoint[] {
  return bars.map((bar, i) => {
    const slice = bars.slice(Math.max(0, i - 199), i + 1)
    const ma200 =
      slice.length >= 10
        ? slice.reduce((sum, b) => sum + b.adj_close, 0) / slice.length
        : undefined
    return {
      date: bar.date,
      close: bar.adj_close,
      ma200: ma200 != null ? parseFloat(ma200.toFixed(2)) : undefined,
    }
  })
}

const PERIOD_LABELS: Record<Period, string> = {
  '3m': '3M',
  '6m': '6M',
  '1y': '1Y',
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const close = payload.find((p) => p.dataKey === 'close')
  const ma200 = payload.find((p) => p.dataKey === 'ma200')
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      {close && (
        <p className="font-mono font-semibold text-[var(--text)] tabular-nums">
          Close: ${close.value.toFixed(2)}
        </p>
      )}
      {ma200?.value != null && (
        <p className="font-mono text-[var(--text-muted)] tabular-nums">
          MA200: ${ma200.value.toFixed(2)}
        </p>
      )}
    </div>
  )
}

export function PriceChart({ ticker }: PriceChartProps) {
  const [period, setPeriod] = useState<Period>('1y')
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    api.stocks
      .history(ticker, period)
      .then(({ data: bars }) => {
        if (cancelled) return
        setData(computeMA200(bars))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [ticker, period])

  const minVal = data.length ? Math.min(...data.map((d) => d.close)) * 0.97 : 0
  const maxVal = data.length ? Math.max(...data.map((d) => d.close)) * 1.03 : 100

  return (
    <div className="space-y-3">
      {/* Period toggle */}
      <div className="flex items-center gap-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              period === p
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]'
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-56 w-full">
        {loading ? (
          <div className="h-full w-full rounded-lg bg-[var(--border)] animate-pulse" />
        ) : error ? (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-xs text-[var(--text-muted)]">Chart data unavailable</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => {
                  try {
                    return new Date(v).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  } catch {
                    return v
                  }
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[minVal, maxVal]}
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#priceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#6366f1' }}
              />
              <Line
                type="monotone"
                dataKey="ma200"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 3"
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        <span style={{ color: '#6366f1' }}>—</span> Price{' '}
        {data.length >= 100 && (
          <>
            <span className="ml-2" style={{ color: '#f59e0b' }}>
              - - -
            </span>{' '}
            200-day MA
          </>
        )}
      </p>
    </div>
  )
}
