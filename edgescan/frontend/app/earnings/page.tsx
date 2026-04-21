import Link from 'next/link'
import { api } from '@/lib/api'

export const dynamic = 'force-dynamic'

function scoreColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d`
}

function urgencyColor(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff <= 3) return '#ef4444'
  if (diff <= 7) return '#f59e0b'
  return '#6b7a99'
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

  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 h-14"
        style={{ background: 'rgba(8,11,18,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Link href="/" className="flex items-center gap-1 text-sm transition-colors hover:opacity-80" style={{ color: '#6b7a99' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Scanner
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.12)' }}>/</span>
        <span className="font-semibold text-sm" style={{ color: '#e2e8f8' }}>Earnings Calendar</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#e2e8f8' }}>Earnings Calendar</h1>
          <p className="text-sm" style={{ color: '#6b7a99' }}>Upcoming earnings for S&P 500 stocks in the scanner — next 45 days</p>
        </div>

        {earnings.length === 0 ? (
          <div className="text-center py-16" style={{ color: '#6b7a99' }}>
            <p className="text-sm">No upcoming earnings found in the current scan.</p>
            <p className="text-xs mt-1">Run a broader scan to populate earnings dates.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dates.map(dateStr => (
              <div key={dateStr}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: '#e2e8f8' }}>
                    {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: urgencyColor(dateStr) }}>
                    {daysUntil(dateStr)}
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  {grouped[dateStr].map((item, i) => (
                    <Link
                      key={item.ticker}
                      href={`/stock/${item.ticker}`}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: i < grouped[dateStr].length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: i % 2 === 0 ? '#0f1521' : '#0b1019' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color: '#e2e8f8' }}>{item.ticker}</span>
                          {item.sector && (
                            <span className="text-xs hidden sm:inline px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,142,247,0.1)', color: '#4f8ef7' }}>{item.sector}</span>
                          )}
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: '#6b7a99' }}>{item.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {item.current_price && <p className="text-sm font-semibold" style={{ color: '#e2e8f8' }}>${item.current_price.toFixed(2)}</p>}
                        {item.upside_pct != null && (
                          <p className="text-xs" style={{ color: item.upside_pct >= 0 ? '#22c55e' : '#ef4444' }}>
                            {item.upside_pct >= 0 ? '+' : ''}{item.upside_pct.toFixed(1)}% target
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-10 text-center">
                        <span className="text-sm font-bold" style={{ color: scoreColor(item.score) }}>{item.score}</span>
                        <p className="text-xs" style={{ color: '#6b7a99' }}>score</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
