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
      <div
        className="rounded-[var(--radius-xl)] border border-[var(--border)] p-8 text-center shadow-[var(--shadow-sm)]"
        style={{ background: 'var(--surface)' }}
      >
        <p className="text-sm text-[var(--text-muted)]">Could not load earnings data.</p>
      </div>
    )
  }

  const groups = groupByDate(data.earnings)

  return (
    <div className="space-y-4">
      {/* Free tier notice */}
      {!isPro && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 flex items-center justify-between gap-4"
          style={{ background: 'var(--accent-light)', borderColor: 'var(--accent-glow)' }}
        >
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Showing this week only</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Pro subscribers see the full earnings calendar.
              </p>
            </div>
          </div>
          <Link
            href="/upgrade"
            className="pro-button shrink-0 flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
          >
            Upgrade
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {groups.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border)]"
        >
          <Calendar className="h-10 w-10 text-[var(--text-muted)] mb-4" />
          <p className="text-base font-bold text-[var(--text)] mb-1">No upcoming earnings</p>
          <p className="text-sm text-[var(--text-muted)]">
            {isPro
              ? 'No S&P 500 earnings scheduled in the next 30 days.'
              : 'No earnings this week for tracked stocks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([date, items]) => (
            <div
              key={date}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-sm)]"
              style={{ background: 'var(--surface)' }}
            >
              <div
                className="px-4 py-2.5 border-b border-[var(--border)]"
                style={{ background: 'var(--surface-elevated)' }}
              >
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
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
                      'transition-all duration-150 group',
                      'hover:bg-[var(--surface-hover)] hover:shadow-[inset_3px_0_0_var(--accent)]'
                    )}
                  >
                    <div className="shrink-0">
                      <ScoreRing score={item.score ?? 0} size={38} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors tracking-tight">
                        {item.ticker}
                      </span>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {item.name ?? item.ticker}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className="text-sm font-mono font-bold text-[var(--text)] tabular-nums">
                        {formatPrice(item.current_price)}
                      </span>
                      {item.upside_pct != null && (
                        <span
                          className="text-xs font-mono font-semibold tabular-nums"
                          style={{ color: upsidePositive ? 'var(--score-strong)' : 'var(--score-weak)' }}
                        >
                          {formatPercent(item.upside_pct)}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ))}

          {/* Free-tier teaser */}
          {!isPro && (
            <div className="relative">
              <div
                className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden blur-sm pointer-events-none select-none"
                style={{ background: 'var(--surface)' }}
                aria-hidden="true"
              >
                <div className="px-4 py-2.5 border-b border-[var(--border)]" style={{ background: 'var(--surface-elevated)' }}>
                  <div className="h-3 w-20 rounded-full bg-[var(--border)]" />
                </div>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0">
                    <div className="h-9 w-9 rounded-full bg-[var(--border)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-12 rounded-full bg-[var(--border)]" />
                      <div className="h-2 w-24 rounded-full bg-[var(--border)]" />
                    </div>
                    <div className="h-3 w-14 rounded bg-[var(--border)]" />
                  </div>
                ))}
              </div>
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 rounded-[var(--radius-lg)] backdrop-blur-sm"
                style={{ background: 'linear-gradient(135deg, rgba(17,17,24,0.82) 0%, rgba(16,185,129,0.06) 100%)' }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full border"
                  style={{ background: 'var(--accent-light)', borderColor: 'var(--accent-glow)' }}
                >
                  <Lock className="h-4.5 w-4.5" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[var(--text)]">Unlock next 3 weeks</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
                    Pro subscribers see the full earnings calendar — up to 30 days ahead
                  </p>
                </div>
                <Link
                  href="/upgrade"
                  className="pro-button inline-flex items-center gap-1.5 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white shadow-md"
                >
                  Upgrade to Pro
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EarningsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden"
          style={{ background: 'var(--surface)' }}
        >
          <div className="h-9 animate-pulse border-b border-[var(--border)]" style={{ background: 'var(--surface-elevated)' }} />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-14 border-b border-[var(--border)] last:border-b-0 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function EarningsPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-gradient">Earnings Calendar</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Upcoming earnings for S&amp;P 500 stocks, ranked by EdgeScan score
        </p>
      </div>
      <Suspense fallback={<EarningsSkeleton />}>
        <EarningsContent />
      </Suspense>
    </div>
  )
}
