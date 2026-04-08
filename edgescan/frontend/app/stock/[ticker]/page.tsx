import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import DetailPanel from '@/components/DetailPanel'
import type { OHLCVBar } from '@/lib/types'

export const revalidate = 240

interface Props {
  params: { ticker: string }
}

export default async function StockPage({ params }: Props) {
  const ticker = params.ticker.toUpperCase()

  let stock, historyData
  try {
    ;[stock, historyData] = await Promise.all([
      api.stock(ticker),
      api.priceHistory(ticker, '1y'),
    ])
  } catch {
    notFound()
  }

  const history: OHLCVBar[] = historyData?.data ?? []

  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 h-14"
        style={{
          background: 'rgba(8,11,18,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
          style={{ color: '#6b7a99' }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Scanner
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.12)' }}>/</span>
        <span className="font-semibold text-sm" style={{ color: '#e2e8f8' }}>{ticker}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <DetailPanel stock={stock} history={history} />
      </main>
    </div>
  )
}
