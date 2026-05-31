'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ScoreBreakdown as ScoreBreakdownType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BreakdownItem {
  key: keyof ScoreBreakdownType
  label: string
  maxPts: number
  type: 'fundamental' | 'technical'
}

const fundamentalItems: BreakdownItem[] = [
  { key: 'rev_growth_pts', label: 'Revenue Growth', maxPts: 15, type: 'fundamental' },
  { key: 'eps_growth_pts', label: 'EPS Growth', maxPts: 15, type: 'fundamental' },
  { key: 'fcf_yield_pts', label: 'FCF Yield', maxPts: 10, type: 'fundamental' },
  { key: 'roe_pts', label: 'Return on Equity', maxPts: 10, type: 'fundamental' },
  { key: 'gross_margin_pts', label: 'Gross Margin', maxPts: 10, type: 'fundamental' },
  { key: 'debt_equity_pts', label: 'Debt / Equity', maxPts: 10, type: 'fundamental' },
  { key: 'eps_revision_pts', label: 'EPS Revision', maxPts: 10, type: 'fundamental' },
  { key: 'fwd_pe_pts', label: 'Forward P/E', maxPts: 10, type: 'fundamental' },
]

const technicalItems: BreakdownItem[] = [
  { key: 'rsi_pts', label: 'RSI', maxPts: 10, type: 'technical' },
  { key: 'macd_pts', label: 'MACD', maxPts: 10, type: 'technical' },
  { key: 'ma200_pts', label: '200-Day MA', maxPts: 10, type: 'technical' },
  { key: 'volume_pts', label: 'Volume Trend', maxPts: 10, type: 'technical' },
  { key: 'high52w_pts', label: '52W High Proximity', maxPts: 10, type: 'technical' },
]

interface BreakdownRowProps {
  label: string
  pts: number
  maxPts: number
}

function BreakdownRow({ label, pts, maxPts }: BreakdownRowProps) {
  const pct = maxPts > 0 ? pts / maxPts : 0
  const color =
    pct >= 0.5 ? '#22c55e' : pct > 0 ? '#f59e0b' : '#64748b'

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex-1 text-xs text-[var(--text-muted)] truncate">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {/* Mini bar */}
        <div className="w-16 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, pct * 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <span
          className="text-xs font-mono font-semibold tabular-nums w-10 text-right"
          style={{ color }}
        >
          {pts}/{maxPts}
        </span>
      </div>
    </div>
  )
}

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType
  fundamentalScore: number
  technicalScore: number
  defaultOpen?: boolean
  className?: string
}

export function ScoreBreakdown({
  breakdown,
  fundamentalScore,
  technicalScore,
  defaultOpen = true,
  className,
}: ScoreBreakdownProps) {
  const [open, setOpen] = useState(defaultOpen)

  const earningsPenalty = breakdown.earnings_penalty ?? 0

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden',
        className
      )}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--border)]/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-[var(--text)]">Score Breakdown</span>
        <span className="flex items-center gap-2 text-[var(--text-muted)]">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--border)]">
          {/* Fundamental */}
          <div>
            <div className="flex items-center justify-between mt-3 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Fundamental
              </span>
              <span className="text-sm font-mono font-bold text-[var(--text)] tabular-nums">
                {fundamentalScore}
              </span>
            </div>
            <div className="divide-y divide-[var(--border)]/50">
              {fundamentalItems.map((item) => (
                <BreakdownRow
                  key={item.key}
                  label={item.label}
                  pts={breakdown[item.key] ?? 0}
                  maxPts={item.maxPts}
                />
              ))}
            </div>
          </div>

          {/* Technical */}
          <div>
            <div className="flex items-center justify-between mt-3 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Technical
              </span>
              <span className="text-sm font-mono font-bold text-[var(--text)] tabular-nums">
                {technicalScore}
              </span>
            </div>
            <div className="divide-y divide-[var(--border)]/50">
              {technicalItems.map((item) => (
                <BreakdownRow
                  key={item.key}
                  label={item.label}
                  pts={breakdown[item.key] ?? 0}
                  maxPts={item.maxPts}
                />
              ))}
            </div>

            {/* Earnings penalty */}
            {earningsPenalty !== 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--border)]/50">
                <div className="flex items-center gap-3 py-1.5">
                  <span className="flex-1 text-xs text-[var(--text-muted)]">
                    Earnings Penalty
                  </span>
                  <span className="text-xs font-mono font-semibold tabular-nums text-[#ef4444]">
                    {earningsPenalty}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
