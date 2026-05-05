import Link from 'next/link'
import { api } from '@/lib/api'
import ScoreRing from '@/components/ScoreRing'

export const dynamic = 'force-dynamic'

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr + 'T12:00:00').getTime() - Date.now()) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d`
}

function urgencyLevel(dateStr: string): 'today' | 'soon' | 'later' {
  const diff = Math.ceil((new Date(dateStr + 'T12:00:00').getTime() - Date.now()) / 86400000)
  if (diff <= 0) return 'today'
  if (diff <= 7) return 'soon'
  return 'later'
}

function isThisWeek(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr + 'T12:00:00').getTime() - Date.now()) / 86400000)
  return diff <= 7
}

const URGENCY_STYLES = {
  today: { bar: '#ef4444', pill: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  soon:  { bar: '#f59e0b', pill: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  later: { bar: 'var(--color-border-3)', pill: 'var(--color-border)', text: 'var(--color-text-2)' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

export default async function EarningsPage() {
  let earnings: Awaited<ReturnType<typeof api.earningsCalendar>>['earnings'] = []
  try {
    const data = await api.earningsCalendar()
    earnings = data.earnings
  } catch {}

  // Group by date
  const grouped: Record<string, typeof earnings> = {}
  for (const item of earnings) {
    if (!grouped[item.earnings_date]) grouped[item.earnings_date] = []
    grouped[item.earnings_date].push(item)
  }
  const dates = Object.keys(grouped).sort()

  const thisWeekDates = dates.filter(d => isThisWeek(d))
  const laterDates    = dates.filter(d => !isThisWeek(d))

  const totalThisWeek = thisWeekDates.reduce((sum, d) => sum + grouped[d].length, 0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 h-14"
        style={{ background: 'var(--color-header)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}
      >
        <Link href="/" className="flex items-center gap-1 text-sm transition-colors hover:opacity-80" style={{ color: 'var(--color-text-2)' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Scanner
        </Link>
        <span style={{ color: 'var(--color-border-3)' }}>/</span>
        <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Earnings Calendar</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

        {/* Page title + summary strip */}
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Earnings Calendar</h1>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-2)' }}>
            Upcoming S&P 500 earnings — next 45 days · sorted by date
          </p>

          {earnings.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'This week', value: totalThisWeek, color: '#f59e0b' },
                { label: 'Total upcoming', value: earnings.length, color: '#4f8ef7' },
                {
                  label: 'Avg score',
                  value: Math.round(earnings.reduce((s, e) => s + e.score, 0) / earnings.length),
                  color: '#22c55e',
                },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-xl px-3 py-3 text-center"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                  <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-2)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {earnings.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="flex items-center justify-center rounded-full mb-4"
              style={{ width: 56, height: 56, background: 'rgba(79,142,247,0.1)' }}
            >
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#4f8ef7" strokeWidth={1.6}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>No upcoming earnings</p>
            <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>Run a scan to populate earnings dates.</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── This week ── */}
            {thisWeekDates.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#f59e0b' }}>This week</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>{totalThisWeek} stocks</span>
                </div>
                <div className="space-y-4">
                  {thisWeekDates.map(dateStr => (
                    <DateGroup key={dateStr} dateStr={dateStr} items={grouped[dateStr]} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Later ── */}
            {laterDates.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-3)' }}>Later</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                    {laterDates.reduce((s, d) => s + grouped[d].length, 0)} stocks
                  </span>
                </div>
                <div className="space-y-4">
                  {laterDates.map(dateStr => (
                    <DateGroup key={dateStr} dateStr={dateStr} items={grouped[dateStr]} />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  )
}

function DateGroup({
  dateStr,
  items,
}: {
  dateStr: string
  items: Awaited<ReturnType<typeof api.earningsCalendar>>['earnings']
}) {
  const level   = urgencyLevel(dateStr)
  const label   = daysUntil(dateStr)
  const styles  = URGENCY_STYLES[level]
  const count   = items.length

  return (
    <div>
      {/* Date header */}
      <div className="flex items-center gap-3 mb-2 pl-1">
        <div className="w-0.5 rounded-full self-stretch" style={{ background: styles.bar, minHeight: 20 }} />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {formatDate(dateStr)}
        </h2>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: styles.pill, color: styles.text }}
        >
          {label}
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--color-text-3)' }}>
          {count} stock{count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Stock rows */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {items.map((item, i) => {
          const upside = item.upside_pct
          return (
            <Link
              key={item.ticker}
              href={`/stock/${item.ticker}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:brightness-110"
              style={{
                background: 'var(--color-card)',
                borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {/* Score ring */}
              <div className="flex-shrink-0">
                <ScoreRing score={item.score} size={40} strokeWidth={3} />
              </div>

              {/* Ticker + name + sector */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{item.ticker}</span>
                  {item.sector && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded hidden sm:inline"
                      style={{ background: 'rgba(79,142,247,0.1)', color: '#4f8ef7' }}
                    >
                      {item.sector}
                    </span>
                  )}
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-2)' }}>{item.name}</p>
              </div>

              {/* Price + upside pill */}
              <div className="text-right flex-shrink-0 space-y-1">
                {item.current_price != null && (
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    ${item.current_price.toFixed(2)}
                  </p>
                )}
                {upside != null && (
                  <span
                    className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: upside >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: upside >= 0 ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
