'use client'

import type { Signals } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SignalsPanelProps {
  signals: Signals
}

function rsiColor(rsi: number) {
  if (rsi >= 70) return '#ef4444' // overbought
  if (rsi <= 30) return '#22c55e' // oversold
  return '#f59e0b'
}

function macdLabel(status: Signals['macd_status']) {
  switch (status) {
    case 'bullish_crossover':
      return { label: 'Bullish Crossover', color: '#22c55e' }
    case 'above_signal':
      return { label: 'Above Signal', color: '#22c55e' }
    case 'below_signal':
      return { label: 'Below Signal', color: '#ef4444' }
    default:
      return { label: 'Unknown', color: '#64748b' }
  }
}

function volumeLabel(status: Signals['volume_status']) {
  switch (status) {
    case 'bullish':
      return { label: 'Bullish', color: '#22c55e' }
    case 'bearish':
      return { label: 'Bearish', color: '#ef4444' }
    default:
      return { label: 'Neutral', color: '#64748b' }
  }
}

function Bar({
  pct,
  color,
  label,
}: {
  pct: number
  color: string
  label: string
}) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="font-mono tabular-nums" style={{ color }}>
          {pct >= 0 ? '+' : ''}
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

interface BadgePillProps {
  label: string
  color: string
}

function BadgePill({ label, color }: BadgePillProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  )
}

export function SignalsPanel({ signals }: SignalsPanelProps) {
  const rsi = signals.rsi ?? 50
  const macd = macdLabel(signals.macd_status)
  const volume = volumeLabel(signals.volume_status)

  const high52wPct = Math.max(0, 100 + (signals.from_52w_high ?? 0))
  const aboveMA = signals.pct_above_200ma ?? 0
  const aboveMAColor = aboveMA >= 0 ? '#22c55e' : '#ef4444'

  return (
    <div className="space-y-4">
      {/* RSI */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-0.5">RSI (14)</p>
          <p
            className="text-2xl font-mono font-bold tabular-nums"
            style={{ color: rsiColor(rsi) }}
          >
            {rsi.toFixed(1)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: rsiColor(rsi) }}>
            {rsi >= 70 ? 'Overbought' : rsi <= 30 ? 'Oversold' : 'Neutral'}
          </p>
        </div>

        <div className="space-y-2 text-right">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-0.5">MACD</p>
            <BadgePill label={macd.label} color={macd.color} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-0.5">Volume</p>
            <BadgePill label={volume.label} color={volume.color} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Bar
          pct={high52wPct}
          color={high52wPct >= 90 ? '#22c55e' : high52wPct >= 70 ? '#f59e0b' : '#ef4444'}
          label="vs 52W High"
        />
        <Bar
          pct={Math.abs(aboveMA)}
          color={aboveMAColor}
          label={`${aboveMA >= 0 ? 'Above' : 'Below'} 200-day MA`}
        />
      </div>

      {/* Additional signal numbers */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {[
          {
            label: 'ADX',
            value: signals.adx?.toFixed(1) ?? '—',
            hint: (signals.adx ?? 0) >= 25 ? 'Trending' : 'Weak trend',
          },
          {
            label: 'RS vs SPY',
            value: `${(signals.rs_vs_spy ?? 0) >= 0 ? '+' : ''}${(signals.rs_vs_spy ?? 0).toFixed(2)}`,
            hint: (signals.rs_vs_spy ?? 0) >= 0 ? 'Outperforming' : 'Underperforming',
          },
          {
            label: 'OBV Slope',
            value: `${(signals.obv_slope_pct ?? 0).toFixed(2)}%`,
            hint: undefined,
          },
          {
            label: 'ROC (20)',
            value: `${(signals.roc_20 ?? 0) >= 0 ? '+' : ''}${(signals.roc_20 ?? 0).toFixed(2)}%`,
            hint: undefined,
          },
        ].map(({ label, value, hint }) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5"
          >
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
            <p className="text-sm font-mono font-semibold text-[var(--text)] tabular-nums mt-0.5">
              {value}
            </p>
            {hint && <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
