import Link from 'next/link'
import { api } from '@/lib/api'
import StockRow from '@/components/StockRow'
import MarketStrip from '@/components/MarketStrip'
import type { StockResult } from '@/lib/types'

export const revalidate = 300 // ISR — revalidate every 5 min

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
    return { results: [], meta: 'Scanner unavailable' }
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { sector?: string }
}) {
  const { results, meta } = await getTopStocks()
  const activeSector = searchParams?.sector ?? 'All'

  const filtered =
    activeSector === 'All'
      ? results
      : results.filter(s =>
          s.sector?.toLowerCase().includes(activeSector.toLowerCase()),
        )

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
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-base font-bold tracking-tight"
            style={{ color: '#4f8ef7' }}
          >
            Edge
          </span>
          <span className="text-base font-bold tracking-tight" style={{ color: '#e2e8f8' }}>
            Scan
          </span>
        </Link>

        {/* Market strip */}
        <div className="flex-1 flex justify-center">
          <MarketStrip />
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-shrink-0">
          <Link
            href="/search"
            className="px-3 py-1.5 rounded-cell text-xs transition-colors hover:bg-white/[0.06]"
            style={{ color: '#6b7a99' }}
          >
            Search
          </Link>
          <Link
            href="/watchlist"
            className="px-3 py-1.5 rounded-cell text-xs transition-colors hover:bg-white/[0.06]"
            style={{ color: '#6b7a99' }}
          >
            Watchlist
          </Link>
        </nav>
      </header>

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
            return (
              <Link
                key={s}
                href={s === 'All' ? '/' : `/?sector=${s}`}
                className="px-3 py-1 rounded-pill text-xs font-medium transition-colors"
                style={{
                  background: active ? '#4f8ef7' : 'rgba(255,255,255,0.05)',
                  color: active ? '#fff' : '#6b7a99',
                  border: '1px solid',
                  borderColor: active ? '#4f8ef7' : 'rgba(255,255,255,0.08)',
                }}
              >
                {s}
              </Link>
            )
          })}
        </div>

        {/* Stock list */}
        <div
          className="rounded-card overflow-hidden"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {filtered.length === 0 ? (
            <div className="py-16 text-center" style={{ color: '#6b7a99' }}>
              {results.length === 0
                ? 'Start the backend to see live scores.'
                : `No stocks in the "${activeSector}" sector right now.`}
            </div>
          ) : (
            filtered.map((stock, i) => (
              <StockRow key={stock.ticker} stock={stock} rank={i + 1} />
            ))
          )}
        </div>

        {/* Score legend */}
        <div className="flex items-center gap-5 mt-4 justify-end">
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
