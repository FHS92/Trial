'use client'

import { useState } from 'react'
import { ChevronDown, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react'
import { ScoreRing } from '@/components/score/ScoreRing'
import { formatPrice, formatPercent, formatDate, cn } from '@/lib/utils'
import type { PortfolioPosition } from '@/lib/types'

interface PortfolioRowProps {
  position: PortfolioPosition
  isPro: boolean
  onTrade: (ticker: string, type: 'buy' | 'sell', maxShares: number) => void
}

function plColor(value: number | null | undefined): string {
  if (value == null || value === 0) return 'var(--text-muted)'
  return value > 0 ? 'var(--score-strong)' : 'var(--score-weak)'
}

export function PortfolioRow({ position, isPro, onTrade }: PortfolioRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hasLots = isPro && position.lots && position.lots.length > 0
  const drift = position.score_drift

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3 group hover:bg-[var(--surface-hover)] transition-colors">
        <button
          onClick={() => hasLots && setExpanded(v => !v)}
          className={cn('shrink-0', hasLots ? 'cursor-pointer' : 'cursor-default')}
          aria-label={hasLots ? 'Toggle lots' : undefined}
        >
          <ScoreRing score={position.current_score ?? 0} size={42} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[var(--text)] tracking-tight">{position.ticker}</span>
            {drift != null && (
              <span
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums"
                style={{ color: plColor(drift) }}
                title="Score change since you bought"
              >
                {drift > 0 ? <TrendingUp className="h-3 w-3" /> : drift < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {drift > 0 ? '+' : ''}{drift}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
            {position.shares} sh @ {formatPrice(position.avg_cost)}
          </p>
        </div>

        <div className="flex flex-col items-end shrink-0 gap-0.5 min-w-[72px]">
          <span className="text-sm font-mono font-bold text-[var(--text)] tabular-nums">
            {formatPrice(position.current_value)}
          </span>
          {position.unrealized_pl != null && (
            <span className="text-xs font-mono font-semibold tabular-nums" style={{ color: plColor(position.unrealized_pl) }}>
              {position.unrealized_pl >= 0 ? '+' : ''}{formatPrice(position.unrealized_pl)}
              {position.unrealized_pl_pct != null && ` (${formatPercent(position.unrealized_pl_pct)})`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onTrade(position.ticker, 'buy', position.shares)}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--score-strong)] hover:bg-[var(--accent-light)] transition-colors"
            title={`Buy more ${position.ticker}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onTrade(position.ticker, 'sell', position.shares)}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--score-weak)] hover:bg-red-400/8 transition-colors"
            title={`Sell ${position.ticker}`}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          {hasLots && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              aria-label="Toggle lots"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded lot breakdown (pro) */}
      {expanded && hasLots && (
        <div className="px-4 pb-3 pt-1 bg-[var(--surface-elevated)]/40">
          <p className="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-1.5">Buy lots (FIFO)</p>
          <div className="space-y-1">
            {position.lots!.map((lot, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)] tabular-nums">
                  {lot.shares} sh @ {formatPrice(lot.buy_price)}
                </span>
                <span className="text-[var(--text-subtle)] tabular-nums">
                  {formatDate(lot.buy_date)}
                  {lot.score_at_buy != null && ` · score ${Math.round(lot.score_at_buy)}`}
                </span>
              </div>
            ))}
          </div>
          {isPro && position.realized_pl != null && position.realized_pl !== 0 && (
            <p className="text-xs mt-2 font-semibold tabular-nums" style={{ color: plColor(position.realized_pl) }}>
              Realized P&L: {position.realized_pl >= 0 ? '+' : ''}{formatPrice(position.realized_pl)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
