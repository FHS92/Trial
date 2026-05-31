import type { Metrics } from '@/lib/types'
import { formatNumber, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface MetricCellProps {
  label: string
  value: string
  context?: string
  highlight?: boolean
}

function MetricCell({ label, value, context, highlight }: MetricCellProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 p-3 rounded-lg border border-[var(--border)]',
        'bg-[var(--surface)]',
        highlight && 'border-[var(--accent)]/30 bg-[var(--accent)]/5'
      )}
    >
      <span className="text-xs text-[var(--text-muted)] truncate">{label}</span>
      <span className="text-base font-mono font-semibold text-[var(--text)] tabular-nums">
        {value}
      </span>
      {context && (
        <span className="text-xs text-[var(--text-muted)] truncate">{context}</span>
      )}
    </div>
  )
}

interface MetricsGridProps {
  metrics: Metrics
  className?: string
}

function pctStr(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

function multStr(v: number | null | undefined, suffix = 'x'): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}${suffix}`
}

export function MetricsGrid({ metrics, className }: MetricsGridProps) {
  const cells = [
    {
      label: 'Revenue Growth',
      value: pctStr(metrics.rev_growth),
      context: 'YoY',
    },
    {
      label: 'EPS Growth',
      value: pctStr(metrics.eps_growth),
      context: 'YoY',
    },
    {
      label: 'Gross Margin',
      value: `${formatNumber(metrics.gross_margin, 1)}%`,
      context: undefined,
    },
    {
      label: 'FCF Yield',
      value: `${formatNumber(metrics.fcf_yield, 2)}%`,
      context: undefined,
    },
    {
      label: 'Return on Equity',
      value: `${formatNumber(metrics.roe, 1)}%`,
      context: undefined,
    },
    {
      label: 'Debt / Equity',
      value: multStr(metrics.debt_to_equity),
      context: undefined,
    },
    {
      label: 'Forward P/E',
      value: multStr(metrics.fwd_pe),
      context: metrics.sector_pe ? `Sector avg ${metrics.sector_pe.toFixed(1)}x` : undefined,
    },
    {
      label: 'Trailing P/E',
      value: multStr(metrics.trailing_pe),
      context: undefined,
    },
    {
      label: 'Price / Sales',
      value: multStr(metrics.price_to_sales),
      context: undefined,
    },
    {
      label: 'Price / Book',
      value: multStr(metrics.price_to_book),
      context: undefined,
    },
    {
      label: 'EV / EBITDA',
      value: multStr(metrics.ev_ebitda),
      context: undefined,
    },
    {
      label: 'Analyst Target',
      value: metrics.analyst_target != null ? `$${metrics.analyst_target.toFixed(2)}` : '—',
      context: undefined,
    },
  ]

  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2',
        className
      )}
    >
      {cells.map((cell) => (
        <MetricCell key={cell.label} {...cell} />
      ))}
    </div>
  )
}
