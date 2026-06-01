import { Suspense } from 'react'
import Link from 'next/link'
import { Calendar, ArrowRight, Lock } from 'lucide-react'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { serverFetch, type EarningsResponse } from '@/lib/api'
import { ScoreRing } from '@/components/score/ScoreRing'
import { formatPrice, formatPercent, cn } from '@/lib/utils'

export const metadata = {
  title: 'Earnings Calendar — EdgeScan',
  description: 'Upcoming earnings dates for S&P 500 stocks ranked by EdgeScan score.',
}

function formatEarningsDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (diff === 0) return `Today · ${label}`
  if (diff === 1) return `Tomorrow · ${label}`
  if (diff <= 7) return `In ${diff}d · ${label}`
  return label
}

function groupByDate<T extends { earnings_date: string }>(earnings: T[]) {
  const groups: Record<string, T[]> = {}
  for (const e of earnings) {
    groups[e.earnings_date] = groups[e.earnings_date] ?? []
    groups[e.earnings_date].push(e)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

async function EarningsContent() {
  const currentUser = await getCurrentUser()
  const isPro = currentUser?.tier === 'pro'
  const cookieHeader = (await cookies()).getAll().map(c => `${c.name}=${c.value}`).join('; ')

  let data: EarningsResponse
  try {
    data = await serverFetch<EarningsResponse>('/earnings', cookieHeader)
  } catch {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">Could not load earnings data.</p>
      </div>
    )
  }

  const groups = groupByDate(data.earnings)

  return (
    <div className="space-y-4">
      {/* Free tier notice */}
      {!isPro && (
        <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-[var(--accent)] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Showing this week only</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Pro subscribers see the full earnings calendar.
              </p>
            </div>
          </div>
          <Link
            href="/upgrade"
            className="flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Upgrade
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-[var(--border)]">
          <Calendar className="h-10 w-10 text-[var(--text-muted)] mb-4" />
          <p className="text-base font-medium text-[var(--text)] mb-1">No upcoming earnings</p>
          <p className="text-sm text-[var(--text-muted)]">
            {isPro
              ? 'No S&P 500 earnings scheduled in the next 30 days.'
              : 'No earnings this week for tracked stocks.'}
          </p>
        </div>
      ) : (
        groups.map(([date, items]) => (
          <div key={date} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="px-4 py-2 bg-[var(--border)]/30 border-b border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                {formatEarningsDate(date)}
              </p>
            </div>
            {items.map((item) => {
              const upsidePositive = (item.upside_pct ?? 0) >= 0
              return (
                <Link
                  key={item.ticker}
                  href={`/stock/${item.ticker}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    'border-b border-[var(--border)] last:border-b-0',
                    'hover:bg-[var(--border)]/30 transition-colors group'
                  )}
                >
                  <div className="shrink-0">
                    <ScoreRing score={item.score ?? 0} size={36} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors font-mono">
                        {item.ticker}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                      {item.name ?? item.ticker}
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    <span className="text-sm font-mono font-semibold text-[var(--text)] tabular-nums">
                      {formatPrice(item.current_price)}
                    </span>
                    {item.upside_pct != null && (
                      <span
                        className={cn(
                          'text-xs font-mono font-semibold tabular-nums',
                          upsidePositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
                        )}
                      >
                        {formatPercent(item.upside_pct)}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}

function EarningsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="h-8 bg-[var(--border)]/30 animate-pulse border-b border-[var(--border)]" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-14 border-b border-[var(--border)] last:border-b-0 animate-pulse bg-[var(--surface)]" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function EarningsPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[var(--text)]">Earnings Calendar</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Upcoming earnings dates for S&amp;P 500 stocks, ranked by EdgeScan score
        </p>
      </div>
      <Suspense fallback={<EarningsSkeleton />}>
        <EarningsContent />
      </Suspense>
    </div>
  )
}
