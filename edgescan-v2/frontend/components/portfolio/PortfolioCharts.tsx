'use client'

import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { PortfolioHistoryPoint, SectorAllocation } from '@/lib/types'

// Distinct-enough palette for sector bars (theme accent first).
const SECTOR_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#14b8a6', '#a855f7',
]

interface ValueTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}

function ValueTooltip({ active, payload, label }: ValueTooltipProps) {
  if (!active || !payload?.length) return null
  const value = payload.find(p => p.dataKey === 'total_value')
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      {value && (
        <p className="font-mono font-semibold text-[var(--text)] tabular-nums">
          {formatPrice(value.value)}
        </p>
      )}
    </div>
  )
}

function ValueOverTime() {
  const [data, setData] = useState<PortfolioHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.portfolio.history()
      .then(res => { if (!cancelled) setData(res.history) })
      .catch(() => { if (!cancelled) setData([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="h-44 w-full rounded-[var(--radius-lg)] bg-[var(--border)] animate-pulse" />
  }

  // Need at least two snapshots to draw a meaningful trend.
  if (data.length < 2) {
    return (
      <div className="h-44 w-full flex items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-4 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          Value history builds up daily after market close — check back tomorrow.
        </p>
      </div>
    )
  }

  const values = data.map(d => d.total_value)
  const min = Math.min(...values) * 0.98
  const max = Math.max(...values) * 1.02

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="portfolioValueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => {
              try { return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
              catch { return v }
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[min, max]}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
            width={44}
          />
          <Tooltip content={<ValueTooltip />} />
          <Area
            type="monotone"
            dataKey="total_value"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#portfolioValueGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#10b981' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function AllocationBreakdown({ allocation }: { allocation: SectorAllocation[] }) {
  if (allocation.length === 0) return null
  return (
    <div className="space-y-3">
      {/* Stacked proportion bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
        {allocation.map((a, i) => (
          <div
            key={a.sector}
            style={{ width: `${a.pct}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
            title={`${a.sector} — ${a.pct}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {allocation.map((a, i) => (
          <div key={a.sector} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
              <span className="text-[var(--text-muted)] truncate">{a.sector}</span>
            </span>
            <span className="text-[var(--text)] font-semibold tabular-nums shrink-0">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PortfolioCharts({ allocation }: { allocation: SectorAllocation[] | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4" style={{ background: 'var(--surface)' }}>
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">Value over time</p>
        <ValueOverTime />
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4" style={{ background: 'var(--surface)' }}>
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">Sector allocation</p>
        {allocation && allocation.length > 0 ? (
          <AllocationBreakdown allocation={allocation} />
        ) : (
          <div className="h-44 flex items-center justify-center">
            <p className="text-xs text-[var(--text-muted)]">No allocation data yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
