import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import DetailPanel from '@/components/DetailPanel'
import type { OHLCVBar } from '@/lib/types'

export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Props {
  params: { ticker: string }
}

interface ScorePoint {
  date: string
  score: number
  fundamental_score: number
  technical_score: number
}

function ScoreSparkline({ points }: { points: ScorePoint[] }) {
  if (points.length < 2) return null

  const W = 260
  const H = 60
  const PAD = 4

  const scores = points.map(p => p.score)
  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)
  const range = maxScore - minScore || 1

  const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const toY = (s: number) => PAD + (1 - (s - minScore) / range) * (H - PAD * 2)

  const polyline = points.map((p, i) => `${toX(i)},${toY(p.score)}`).join(' ')

  const current = scores[scores.length - 1]
  const highest = Math.max(...scores)
  const lowest = Math.min(...scores)

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-xs font-semibold mb-3" style={{ color: '#6b7a99' }}>
        Score History (last {points.length} scans)
      </p>

      <div className="flex items-start gap-4">
        {/* SVG sparkline */}
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ flexShrink: 0 }}
          aria-hidden="true"
        >
          {/* Subtle grid line at midpoint */}
          <line
            x1={PAD}
            y1={H / 2}
            x2={W - PAD}
            y2={H / 2}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
          {/* Area fill */}
          <polyline
            points={[
              `${toX(0)},${H - PAD}`,
              ...points.map((p, i) => `${toX(i)},${toY(p.score)}`),
              `${toX(points.length - 1)},${H - PAD}`,
            ].join(' ')}
            fill="rgba(79,142,247,0.08)"
            stroke="none"
          />
          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#4f8ef7"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Dot at latest point */}
          <circle
            cx={toX(points.length - 1)}
            cy={toY(current)}
            r={3}
            fill="#4f8ef7"
          />
        </svg>

        {/* Stats */}
        <div className="flex flex-col gap-2 text-xs" style={{ minWidth: 72 }}>
          <div>
            <p style={{ color: '#6b7a99' }}>Current</p>
            <p className="font-bold text-sm" style={{ color: '#e2e8f8' }}>{current.toFixed(1)}</p>
          </div>
          <div>
            <p style={{ color: '#6b7a99' }}>High</p>
            <p className="font-semibold" style={{ color: '#22c55e' }}>{highest.toFixed(1)}</p>
          </div>
          <div>
            <p style={{ color: '#6b7a99' }}>Low</p>
            <p className="font-semibold" style={{ color: '#ef4444' }}>{lowest.toFixed(1)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function StockPage({ params }: Props) {
  const ticker = params.ticker.toUpperCase()

  let stock, historyData, scoreHistoryData
  try {
    ;[stock, historyData, scoreHistoryData] = await Promise.all([
      api.stock(ticker),
      api.priceHistory(ticker, '1y'),
      fetch(`${BASE}/api/stock/${ticker}/score-history`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ])
  } catch {
    notFound()
  }

  const history: OHLCVBar[] = historyData?.data ?? []
  const scorePoints: ScorePoint[] = scoreHistoryData?.history ?? []

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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <DetailPanel stock={stock} history={history} />
        {scorePoints.length >= 2 && <ScoreSparkline points={scorePoints} />}
      </main>
    </div>
  )
}
