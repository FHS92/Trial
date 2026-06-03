'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ScoreRing } from '@/components/score/ScoreRing'
import { ScoreBadge } from '@/components/score/ScoreBadge'
import { formatPrice, formatPercent, cn } from '@/lib/utils'
import type { ScanResult } from '@/lib/types'

interface StockRowProps {
  result: ScanResult
  rank: number
  isBlurred?: boolean
}

function MomentumIcon({ upside }: { upside: number | null }) {
  if (upside == null) return <Minus className="h-3.5 w-3.5 text-[var(--text-muted)]" />
  if (upside > 5) return <TrendingUp className="h-3.5 w-3.5 text-[#22c55e]" />
  if (upside < -3) return <TrendingDown className="h-3.5 w-3.5 text-[#ef4444]" />
  return <Minus className="h-3.5 w-3.5 text-[var(--text-muted)]" />
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: 'bg-blue-500/15 text-blue-400',
  Healthcare: 'bg-green-500/15 text-green-400',
  Financials: 'bg-yellow-500/15 text-yellow-400',
  'Consumer Discretionary': 'bg-orange-500/15 text-orange-400',
  'Consumer Staples': 'bg-rose-500/15 text-rose-400',
  Industrials: 'bg-cyan-500/15 text-cyan-400',
  Energy: 'bg-amber-500/15 text-amber-400',
  Materials: 'bg-lime-500/15 text-lime-400',
  Utilities: 'bg-purple-500/15 text-purple-400',
  'Real Estate': 'bg-pink-500/15 text-pink-400',
  'Communication Services': 'bg-teal-500/15 text-teal-400',
}

function getSectorClass(sector: string | null): string {
  if (!sector) return 'bg-[var(--border)] text-[var(--text-muted)]'
  return SECTOR_COLORS[sector] ?? 'bg-[var(--border)] text-[var(--text-muted)]'
}

export function StockRow({ result, rank, isBlurred = false }: StockRowProps) {
  const upsidePositive = (result.upside_pct ?? 0) >= 0

  return (
    <Link
      href={`/stock/${result.ticker}`}
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        'border-b border-[var(--border)] last:border-b-0',
        'hover:bg-[var(--border)]/30 transition-colors duration-150',
        'cursor-pointer group',
        isBlurred && 'blur-sm pointer-events-none select-none'
      )}
      tabIndex={isBlurred ? -1 : undefined}
      aria-hidden={isBlurred || undefined}
    >
      {/* Rank */}
      <span className="w-6 shrink-0 text-right text-xs font-mono text-[var(--text-muted)] tabular-nums">
        {rank}
      </span>

      {/* Score ring */}
      <div className="shrink-0">
        <ScoreRing score={result.score} size={40} />
      </div>

      {/* Ticker + name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors tabular-nums">
            {result.ticker}
          </span>
          <ScoreBadge score={result.score} />
          {result.sector && (
            <span
              className={cn(
                'hidden md:inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                getSectorClass(result.sector)
              )}
            >
              {result.sector}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{result.name}</p>
      </div>

      {/* Momentum */}
      <div className="hidden sm:flex shrink-0 items-center">
        <MomentumIcon upside={result.upside_pct} />
      </div>

      {/* Sub-scores */}
      <div className="hidden sm:flex flex-col items-end shrink-0 gap-0.5">
        <span className="text-xs text-[var(--text-muted)]">
          F{' '}
          <span className="font-mono font-semibold text-[var(--text)] tabular-nums">
            {result.fundamental_score}
          </span>
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          T{' '}
          <span className="font-mono font-semibold text-[var(--text)] tabular-nums">
            {result.technical_score}
          </span>
        </span>
      </div>

      {/* Price + upside */}
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <span className="text-sm font-mono font-semibold text-[var(--text)] tabular-nums">
          {formatPrice(result.current_price)}
        </span>
        {result.upside_pct != null && (
          <span
            className={cn(
              'text-xs font-mono font-semibold tabular-nums',
              upsidePositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
            )}
          >
            {formatPercent(result.upside_pct)}
          </span>
        )}
      </div>
    </Link>
  )
}
