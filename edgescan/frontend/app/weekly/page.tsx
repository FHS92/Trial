import Link from 'next/link'
import { api } from '@/lib/api'
import type { ScoreMover, SectorSnapshot } from '@/lib/types'

export const dynamic = 'force-dynamic'

function scoreColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function deltaColor(d: number) { return d >= 0 ? '#22c55e' : '#ef4444' }

function MoverRow({ m, showDelta = true }: { m: ScoreMover; showDelta?: boolean }) {
  return (
    <Link
      href={`/stock/${m.ticker}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex-1 min-w-0">
        <span className="font-bold text-sm" style={{ color: '#e2e8f8' }}>{m.ticker}</span>
        <p className="text-xs truncate" style={{ color: '#6b7a99' }}>{m.name}</p>
      </div>
      {m.current_price && (
        <span className="text-sm hidden sm:block" style={{ color: '#a0aec0' }}>${m.current_price.toFixed(2)}</span>
      )}
      <div className="text-right flex-shrink-0">
        <span className="font-bold text-sm" style={{ color: scoreColor(m.score) }}>{m.score}</span>
        {showDelta && m.score_delta !== null && (
          <p className="text-xs font-medium" style={{ color: deltaColor(m.score_delta) }}>
            {m.score_delta >= 0 ? '+' : ''}{m.score_delta}
          </p>
        )}
      </div>
    </Link>
  )
}

function SectorBar({ s, max }: { s: SectorSnapshot; max: number }) {
  const pct = (s.avg_score / max) * 100
  const color = scoreColor(s.avg_score)
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xs w-36 truncate flex-shrink-0" style={{ color: '#a0aec0' }}>{s.sector}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right flex-shrink-0" style={{ color }}>{s.avg_score}</span>
    </div>
  )
}

export default async function WeeklyPage() {
  let data: Awaited<ReturnType<typeof api.weeklySnapshot>> | null = null
  try { data = await api.weeklySnapshot() } catch {}

  const hasDeltas = (data?.gainers.length ?? 0) > 0

  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 h-14"
        style={{ background: 'rgba(8,11,18,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Link href="/" className="flex items-center gap-1 text-sm hover:opacity-80" style={{ color: '#6b7a99' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Scanner
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.12)' }}>/</span>
        <span className="font-semibold text-sm" style={{ color: '#e2e8f8' }}>Weekly Snapshot</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#e2e8f8' }}>Weekly Snapshot</h1>
          <p className="text-sm" style={{ color: '#6b7a99' }}>
            {data ? `${data.total_scanned} stocks · Generated ${new Date(data.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Loading…'}
          </p>
        </div>

        {!data ? (
          <p className="text-sm text-center py-16" style={{ color: '#6b7a99' }}>Could not load snapshot.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Top scores */}
            <div className="sm:col-span-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-4 py-3" style={{ background: '#0a0e17', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 className="text-sm font-semibold" style={{ color: '#e2e8f8' }}>Top 10 This Week</h2>
              </div>
              <div className="grid sm:grid-cols-2">
                {data.top_stocks.map((m, i) => (
                  <div key={m.ticker} style={{ borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <MoverRow m={m} showDelta={false} />
                  </div>
                ))}
              </div>
            </div>

            {/* Gainers */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(34,197,94,0.15)' }}>
              <div className="px-4 py-3" style={{ background: 'rgba(34,197,94,0.05)', borderBottom: '1px solid rgba(34,197,94,0.1)' }}>
                <h2 className="text-sm font-semibold" style={{ color: '#22c55e' }}>↑ Biggest Gainers</h2>
                {!hasDeltas && <p className="text-xs mt-0.5" style={{ color: '#6b7a99' }}>Available after 7+ days of scans</p>}
              </div>
              <div>
                {hasDeltas
                  ? data.gainers.map(m => <MoverRow key={m.ticker} m={m} />)
                  : <p className="text-xs px-4 py-8 text-center" style={{ color: '#6b7a99' }}>No data yet — check back in a week</p>
                }
              </div>
            </div>

            {/* Losers */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="px-4 py-3" style={{ background: 'rgba(239,68,68,0.05)', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                <h2 className="text-sm font-semibold" style={{ color: '#ef4444' }}>↓ Biggest Losers</h2>
                {!hasDeltas && <p className="text-xs mt-0.5" style={{ color: '#6b7a99' }}>Available after 7+ days of scans</p>}
              </div>
              <div>
                {hasDeltas
                  ? data.losers.map(m => <MoverRow key={m.ticker} m={m} />)
                  : <p className="text-xs px-4 py-8 text-center" style={{ color: '#6b7a99' }}>No data yet — check back in a week</p>
                }
              </div>
            </div>

            {/* Sector breakdown */}
            {data.sectors.length > 0 && (
              <div className="sm:col-span-2 rounded-xl p-5" style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 className="text-sm font-semibold mb-4" style={{ color: '#e2e8f8' }}>Sector Avg Score</h2>
                {data.sectors.map(s => (
                  <SectorBar key={s.sector} s={s} max={Math.max(...data!.sectors.map(x => x.avg_score))} />
                ))}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
