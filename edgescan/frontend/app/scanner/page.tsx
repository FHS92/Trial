import Link from 'next/link'
import { api } from '@/lib/api'
import StockRow from '@/components/StockRow'
import MarketStrip from '@/components/MarketStrip'
import UniverseBadge from '@/components/UniverseBadge'
import ScanButton from '@/components/ScanButton'
import type { StockResult } from '@/lib/types'

export const dynamic = 'force-dynamic'

const SECTORS = ['All', 'Technology', 'Financials', 'Healthcare', 'Energy', 'Industrials', 'Consumer']

async function getTopStocks(): Promise<{
  results: StockResult[]
  meta: string
  lastScannedMinutesAgo: number | null
  totalScanned: number | null
}> {
  try {
    const data = await api.topOpportunities()
    const minutes = data.last_scanned_minutes_ago
    const meta =
      minutes != null
        ? `Last scanned ${minutes}m ago · ${data.total_scanned} stocks`
        : `${data.total_scanned} stocks scanned`
    return {
      results: data.results,
      meta,
      lastScannedMinutesAgo: minutes ?? null,
      totalScanned: data.total_scanned ?? null,
    }
  } catch {
    return {
      results: [],
      meta: 'Scanner unavailable — is the backend running?',
      lastScannedMinutesAgo: null,
      totalScanned: null,
    }
  }
}

export default async function ScannerPage({
  searchParams,
}: {
  searchParams: { sector?: string; show?: string }
}) {
  const { results, meta, lastScannedMinutesAgo, totalScanned } = await getTopStocks()
  const activeSector = searchParams?.sector ?? 'All'
  const showAll = searchParams?.show === 'all'

  const bySector =
    activeSector === 'All'
      ? results
      : results.filter(s => s.sector?.toLowerCase().includes(activeSector.toLowerCase()))

  const displayed = showAll ? bySector : bySector.slice(0, 10)
  const hasMore = bySector.length > 10

  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-14 gap-4"
        style={{
          background: 'rgba(8,11,18,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href="/scanner" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-base font-bold tracking-tight" style={{ color: '#4f8ef7' }}>Edge</span>
          <span className="text-base font-bold tracking-tight" style={{ color: '#e2e8f8' }}>Scan</span>
        </Link>

        <div className="hidden sm:flex flex-1 justify-center">
          <MarketStrip />
        </div>

        <UniverseBadge />
      </header>

      <div className="sm:hidden flex justify-center gap-2 px-4 py-2 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#080b12' }}>
        <MarketStrip />
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#e2e8f8' }}>
            Top Opportunities
          </h1>
          {/* Last-scanned banner + scan button */}
          <div className="flex items-center gap-3 flex-wrap">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-pill"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Clock / refresh icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="#6b7a99"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="5.5" />
              <polyline points="7,4 7,7 9,9" />
            </svg>
            <span className="text-xs" style={{ color: '#6b7a99' }}>
              {lastScannedMinutesAgo == null 
                ? 'Scanning now…'
                : lastScannedMinutesAgo < 120
                  ? `Last scanned ${lastScannedMinutesAgo}m ago · ${totalScanned} stocks`
                  : lastScannedMinutesAgo < 1440
                    ? `Last scanned ${Math.round(lastScannedMinutesAgo / 60)}h ago · ${totalScanned} stocks`
                    : `Last scanned ${Math.round(lastScannedMinutesAgo / 1440)}d ago · ${totalScanned} stocks`}
            </span>
          </div>
          <ScanButton />
          </div>
        </div>

        {/* Sector filter pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {SECTORS.map(s => {
            const active = s === activeSector
            const count = s === 'All'
              ? results.length
              : results.filter(r => r.sector?.toLowerCase().includes(s.toLowerCase())).length
            return (
              <Link
                key={s}
                href={s === 'All' ? '/scanner' : `/scanner?sector=${s}`}
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
            <div className="py-16 text-center space-y-3">
              <div className="flex justify-center mb-2">
                <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth={2}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#e2e8f8' }}>Initial scan in progress…</p>
              <p className="text-xs" style={{ color: '#6b7a99' }}>
                Scoring stocks for the first time. This takes 2–4 minutes — refresh shortly.
              </p>
            </div>
          ) : bySector.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: '#6b7a99' }}>
                No <strong>{activeSector}</strong> stocks in the current scan.
              </p>
            </div>
          ) : (
            displayed.map((stock, i) => (
              <StockRow
                key={stock.ticker}
                stock={stock}
                rank={i + 1}
              />
            ))
          )}
        </div>

        {hasMore && (
          <div className="mt-3 text-center">
            <Link
              href={showAll
                ? (activeSector === 'All' ? '/scanner' : `/scanner?sector=${activeSector}`)
                : (activeSector === 'All' ? '/scanner?show=all' : `/scanner?sector=${activeSector}&show=all`)
              }
              className="text-xs px-4 py-2 rounded-pill transition-colors hover:bg-white/[0.06]"
              style={{ color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.3)' }}
            >
              {showAll ? `Show top 10 ↑` : `Show all ${bySector.length} stocks ↓`}
            </Link>
          </div>
        )}

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
