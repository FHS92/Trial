import Link from 'next/link'
import { api } from '@/lib/api'
import StockRow from '@/components/StockRow'
import MarketStrip from '@/components/MarketStrip'
import type { StockResult } from '@/lib/types'

// Always render fresh — never serve a stale cached version
export const dynamic = 'force-dynamic'

const SECTORS = ['All', 'Technology', 'Financials', 'Healthcare', 'Energy', 'Industrials', 'Consumer']

async function getTopStocks(): Promise<{ results: StockResult[]; meta: string }> {
  try {
    const data = await api.topOpportunities()
    const minutes = data.last_scanned_minutes_ago
    const meta =
      minutes != null
        ? `Last scanned ${minutes}m ago · ${data.total_scanned} stocks`
        : `${data.total_scanned} stocks scanned`
    return { results: data.results, meta }
  } catch {
    return { results: [], meta: 'Scanner unavailable — is the backend running?' }
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { sector?: string; show?: string }
}) {
  const { results, meta } = await getTopStocks()
  const activeSector = searchParams?.sector ?? 'All'
  const showAll = searchParams?.show === 'all'

  const bySector =
    activeSector === 'All'
      ? results
      : results.filter(s => s.sector?.toLowerCase().includes(activeSector.toLowerCase()))

  // Default: top 10. "Show all" reveals everything from the scan.
  const displayed = showAll ? bySector : bySector.slice(0, 10)
  const hasMore = bySector.length > 10

  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-14 gap-4"
        style={{
          background: 'rgba(8,11,18,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-base font-bold tracking-tight" style={{ color: '#4f8ef7' }}>Edge</span>
          <span className="text-base font-bold tracking-tight" style={{ color: '#e2e8f8' }}>Scan</span>
        </Link>

        <div className="hidden sm:flex flex-1 justify-center">
          <MarketStrip />
        </div>

        {/* Nav links handled by persistent BottomNav */}
      </header>

      {/* Mobile market strip — shown below header on small screens */}
      <div className="sm:hidden flex justify-center gap-2 px-4 py-2 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#080b12' }}>
        <MarketStrip />
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
{/* Hero */}
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#e2e8f8' }}>
            Top Opportunities
          </h1>
          <p className="text-sm" style={{ color: '#6b7a99' }}>{meta}</p>
        </div>

        {/* Sector filter pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {SECTORS.map(s => {
            const active = s === activeSector
            // Count how many stocks are in this sector
            const count = s === 'All'
              ? results.length
              : results.filter(r => r.sector?.toLowerCase().includes(s.toLowerCase())).length
            return (
              <Link
                key={s}
                href={s === 'All' ? '/' : `/?sector=${s}`}
                className="px-3 py-1 rounded-pill text-xs font-medium transition-colors"
                style={{
                  background: active ? '#4f8ef7' : 'rgba(255,255,255,0.05)',
                  color: active ? '#fff' : count === 0 ? 'rgba(107,122,153,0.4)' : '#6b7a99',
                  border: '1px solid',
                  borderColor: active ? '#4f8ef7' : 'rgba(255,255,255,0.08)',
                  pointerEvents: count === 0 && !active ? 'none' : 'auto',
                }}
              >
                {s}{count > 0 && s !== 'All' ? ` ${count}` : ''}
              </Link>
            )
          })}
        </div>

        {/* Stock list */}
        <div
          className="rounded-card overflow-hidden"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {results.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-medium" style={{ color: '#e2e8f8' }}>No data yet</p>
              <p className="text-xs" style={{ color: '#6b7a99' }}>
                Run <code className="px-1 py-0.5 rounded" style={{ background: '#1e2540' }}>python seed_live.py --n 30</code> then restart the backend.
              </p>
            </div>
          ) : bySector.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: '#6b7a99' }}>
                No <strong>{activeSector}</strong> stocks in the current scan.
              </p>
              <p className="text-xs mt-1" style={{ color: '#6b7a99' }}>
                Run a larger scan with <code className="px-1 py-0.5 rounded" style={{ background: '#1e2540' }}>--n 100</code> for more sector coverage.
              </p>
            </div>
          ) : (
            displayed.map((stock, i) => (
              <StockRow key={stock.ticker} stock={stock} rank={i + 1} />
            ))
          )}
        </div>

        {/* Show all / show less toggle */}
        {hasMore && (
          <div className="mt-3 text-center">
            <Link
              href={showAll
                ? (activeSector === 'All' ? '/' : `/?sector=${activeSector}`)
                : (activeSector === 'All' ? '/?show=all' : `/?sector=${activeSector}&show=all`)
              }
              className="text-xs px-4 py-2 rounded-pill transition-colors hover:bg-white/[0.06]"
              style={{ color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.3)' }}
            >
              {showAll ? `Show top 10 ↑` : `Show all ${bySector.length} stocks ↓`}
            </Link>
          </div>
        )}

        {/* Score legend */}
        <div className="flex items-center gap-5 mt-4 justify-center sm:justify-end">
          {[
            { label: '≥ 80 Strong', color: '#22d47e' },
            { label: '60–79 Moderate', color: '#f5a623' },
            { label: '< 60 Weak', color: '#f75f5f' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs" style={{ color: '#6b7a99' }}>{label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
