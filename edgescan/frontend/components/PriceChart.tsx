'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { OHLCVBar, Period } from '@/lib/types'

const PERIODS: Period[] = ['1w', '1m', '3m', '6m', '1y']

interface ChartBar extends OHLCVBar {
  ma50?: number
  ma200?: number
}

function calcMA(data: OHLCVBar[], window: number): (number | undefined)[] {
  return data.map((_, i) => {
    if (i < window - 1) return undefined
    const slice = data.slice(i - window + 1, i + 1)
    return slice.reduce((s, b) => s + b.close, 0) / window
  })
}

function formatDate(dateStr: string, period: Period) {
  const d = new Date(dateStr)
  if (period === '1w') return d.toLocaleDateString('en-US', { weekday: 'short' })
  if (period === '1m') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const close = payload.find((p: any) => p.dataKey === 'close')?.value
  const ma50  = payload.find((p: any) => p.dataKey === 'ma50')?.value
  const ma200 = payload.find((p: any) => p.dataKey === 'ma200')?.value
  return (
    <div style={{ background: '#161c2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: '#6b7a99', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {close  != null && <p style={{ color: '#e2e8f8', fontSize: 12 }}>Price  <strong>${close.toFixed(2)}</strong></p>}
      {ma50   != null && <p style={{ color: '#4f8ef7', fontSize: 12 }}>50 MA  <strong>${ma50.toFixed(2)}</strong></p>}
      {ma200  != null && <p style={{ color: '#f5a623', fontSize: 12 }}>200 MA <strong>${ma200.toFixed(2)}</strong></p>}
    </div>
  )
}

interface Props {
  allHistory: OHLCVBar[]          // full 1Y data from parent
  onPeriodChange?: (p: Period) => void
}

export default function PriceChart({ allHistory, onPeriodChange }: Props) {
  const [period, setPeriod] = useState<Period>('3m')

  const periodDays: Record<Period, number> = { '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365 }

  const sliced = useMemo(() => {
    const days = periodDays[period]
    return allHistory.slice(-days)
  }, [allHistory, period])

  const ma50vals  = useMemo(() => calcMA(allHistory, 50),  [allHistory])
  const ma200vals = useMemo(() => calcMA(allHistory, 200), [allHistory])

  const chartData: ChartBar[] = useMemo(() => {
    const offset = allHistory.length - sliced.length
    return sliced.map((bar, i) => ({
      ...bar,
      ma50:  ma50vals[offset + i],
      ma200: ma200vals[offset + i],
      label: formatDate(bar.date, period),
    }))
  }, [sliced, ma50vals, ma200vals, period])

  const prices = sliced.map(b => b.close)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const pad  = (maxP - minP) * 0.05
  const domain: [number, number] = [minP - pad, maxP + pad]

  // Only show MAs when there's enough history to be meaningful
  // MA50 needs at least 50 bars in allHistory; MA200 needs 200
  const showMA50  = allHistory.length >= 50  && period !== '1w'
  const showMA200 = allHistory.length >= 200 && (period === '6m' || period === '1y')

  function handlePeriod(p: Period) {
    setPeriod(p)
    onPeriodChange?.(p)
  }

  return (
    <div>
      {/* Period tabs */}
      <div className="flex gap-1 mb-3">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => handlePeriod(p)}
            className="px-3 py-1 rounded-cell text-xs font-medium transition-colors"
            style={{
              background: p === period ? '#4f8ef7' : 'rgba(255,255,255,0.05)',
              color: p === period ? '#fff' : '#6b7a99',
            }}
          >
            {p.toUpperCase()}
          </button>
        ))}
        {/* MA legend — only show lines that are active for this period */}
        <div className="ml-auto flex items-center gap-3">
          {showMA50 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded" style={{ background: '#4f8ef7' }} />
              <span className="text-xs" style={{ color: '#6b7a99' }}>50MA</span>
            </div>
          )}
          {showMA200 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded" style={{ background: '#f5a623' }} />
              <span className="text-xs" style={{ color: '#6b7a99' }}>200MA</span>
            </div>
          )}
          {!showMA50 && !showMA200 && (
            <span className="text-xs" style={{ color: 'rgba(107,122,153,0.5)' }}>MAs need more data</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7a99', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={domain}
            tick={{ fill: '#6b7a99', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={v => `$${v.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#e2e8f8"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          {showMA50 && (
            <Line
              type="monotone"
              dataKey="ma50"
              stroke="#4f8ef7"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
          {showMA200 && (
            <Line
              type="monotone"
              dataKey="ma200"
              stroke="#f5a623"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
