import type { Metrics } from '@/lib/types'

function fmt(n: number | null | undefined, suffix = '', decimals = 1) {
  if (n == null) return '—'
  return `${n.toFixed(decimals)}${suffix}`
}

interface Cell {
  label: string
  value: string
  sub?: string
}

interface Props {
  metrics: Metrics
}

export default function MetricsGrid({ metrics }: Props) {
  const cells: Cell[] = [
    {
      label: 'Forward P/E',
      value: fmt(metrics.fwd_pe, 'x'),
      sub: `Sector ${fmt(metrics.sector_pe, 'x')}`,
    },
    {
      label: 'Rev Growth YoY',
      value: fmt(metrics.rev_growth, '%'),
    },
    {
      label: 'EPS Growth YoY',
      value: fmt(metrics.eps_growth, '%'),
    },
    {
      label: 'FCF Yield',
      value: fmt(metrics.fcf_yield, '%'),
    },
    {
      label: 'ROE',
      value: fmt(metrics.roe, '%'),
    },
    {
      label: 'Gross Margin',
      value: fmt(metrics.gross_margin, '%'),
    },
    {
      label: 'Debt / Equity',
      value: fmt(metrics.debt_to_equity, 'x'),
    },
    {
      label: 'Analyst Target',
      value: metrics.analyst_target ? `$${metrics.analyst_target.toFixed(2)}` : '—',
    },
    {
      label: 'Catalyst',
      value: metrics.recent_catalyst || '—',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-px" style={{ background: 'var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex flex-col gap-0.5 p-3"
          style={{ background: 'var(--color-card)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>{c.label}</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{c.value}</span>
          {c.sub && <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>{c.sub}</span>}
        </div>
      ))}
    </div>
  )
}
