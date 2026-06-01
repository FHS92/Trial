import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cookies } from 'next/headers'
import { ScoreRing } from '@/components/score/ScoreRing'
import { ScoreBadge } from '@/components/score/ScoreBadge'
import { ScoreBreakdown } from '@/components/score/ScoreBreakdown'
import { MetricsGrid } from '@/components/stock/MetricsGrid'
import { ProLock } from '@/components/ui/ProLock'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { PriceChart } from './PriceChart'
import { SignalsPanel } from './SignalsPanel'
import { WatchlistToggle } from './WatchlistToggle'
import { serverFetch, ApiError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { formatPrice, formatPercent } from '@/lib/utils'
import type { ScanResult, Tier } from '@/lib/types'

interface StockPageProps {
  params: Promise<{ ticker: string }>
}

async function StockContent({ ticker }: { ticker: string }) {
  const currentUser = await getCurrentUser()
  const tier: Tier = currentUser?.tier ?? 'free'
  const cookieHeader = (await cookies()).getAll().map(c => `${c.name}=${c.value}`).join('; ')

  let stock: ScanResult
  try {
    stock = await serverFetch<ScanResult>(`/stocks/${ticker.toUpperCase()}`, cookieHeader)
  } catch (err) {
    const is404 = err instanceof ApiError && err.status === 404
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Link
          href="/scanner"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scanner
        </Link>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-lg font-semibold text-[var(--text)] mb-2">
            {is404 ? `${ticker.toUpperCase()} not found` : 'Unable to load stock data'}
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {is404
              ? 'This ticker may not be in the current scan universe.'
              : 'The service is temporarily unavailable. Please try again.'}
          </p>
          <Link
            href="/scanner"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Browse Scanner
          </Link>
        </div>
      </div>
    )
  }

  const upsidePositive = (stock.upside_pct ?? 0) >= 0

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Back + watchlist */}
      <div className="flex items-center justify-between">
        <Link
          href="/scanner"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scanner
        </Link>
        <WatchlistToggle ticker={ticker} />
      </div>

      {/* Hero */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold text-[var(--text)] tabular-nums">
              {stock.ticker}
            </h1>
            <ScoreBadge score={stock.score} />
          </div>
          <p className="text-[var(--text-muted)] mt-1 text-sm">{stock.name}</p>
          {(stock.sector || stock.industry) && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {[stock.sector, stock.industry].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-2xl font-mono font-bold text-[var(--text)] tabular-nums">
              {formatPrice(stock.current_price)}
            </span>
            {stock.upside_pct != null && (
              <span
                className="text-sm font-mono font-semibold tabular-nums"
                style={{ color: upsidePositive ? '#22c55e' : '#ef4444' }}
              >
                {formatPercent(stock.upside_pct)} upside
              </span>
            )}
          </div>

          {stock.earnings_date && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Next earnings:{' '}
              {new Date(stock.earnings_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Score ring */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <ScoreRing score={stock.score} size={120} showLabel />
          <p className="text-xs text-[var(--text-muted)]">
            F{stock.fundamental_score} · T{stock.technical_score}
          </p>
        </div>
      </div>

      {/* Score breakdown */}
      <ScoreBreakdown
        breakdown={stock.score_breakdown}
        fundamentalScore={stock.fundamental_score}
        technicalScore={stock.technical_score}
      />

      {/* Key metrics */}
      <section>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Key Metrics</h2>
        <MetricsGrid metrics={stock.metrics} />
        {stock.metrics.recent_catalyst && (
          <p className="mt-3 text-xs text-[var(--text-muted)] italic">
            Recent catalyst: {stock.metrics.recent_catalyst}
          </p>
        )}
      </section>

      {/* Why Now (AI thesis) */}
      <section>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Why Now</h2>
        {tier === 'pro' ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            {stock.thesis ? (
              <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-line">
                {stock.thesis}
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Analysis will be generated on the next scan cycle.
              </p>
            )}
          </div>
        ) : (
          <ProLock benefit={`See the AI-generated analysis for ${stock.ticker}`}>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm text-[var(--text)]">
                {stock.ticker} shows strong fundamental momentum with rising EPS revisions and above-sector margins...
              </p>
              <p className="text-sm text-[var(--text)] mt-2 opacity-60">
                Technical setup confirms a potential breakout with RSI holding at neutral levels while the stock trades above its 200-day moving average.
              </p>
            </div>
          </ProLock>
        )}
      </section>

      {/* Price chart */}
      <section>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Price History</h2>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <PriceChart ticker={stock.ticker} />
        </div>
      </section>

      {/* Signals */}
      <section>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Technical Signals</h2>
        {tier === 'pro' ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <SignalsPanel signals={stock.signals} />
          </div>
        ) : (
          <ProLock benefit={`See all technical signals for ${stock.ticker}`}>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <SignalsPanel signals={stock.signals} />
            </div>
          </ProLock>
        )}
      </section>

      {/* Disclaimer */}
      <div className="border-t border-[var(--border)] pt-4">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Not investment advice. Data provided for informational purposes only. Scores and price targets are algorithmic estimates and may not reflect current market conditions. Always do your own research before making investment decisions.
        </p>
        {stock.scanned_at && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Data as of:{' '}
            {new Date(stock.scanned_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  )
}

function StockSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-28 rounded bg-[var(--border)]" />
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-8 w-24 rounded bg-[var(--border)]" />
          <div className="h-4 w-48 rounded bg-[var(--border)]" />
          <div className="h-6 w-32 rounded bg-[var(--border)] mt-2" />
        </div>
        <div className="h-32 w-32 rounded-full bg-[var(--border)]" />
      </div>
      <SkeletonCard lines={4} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={5} />
    </div>
  )
}

export default async function StockPage({ params }: StockPageProps) {
  const { ticker } = await params
  return (
    <Suspense fallback={<StockSkeleton />}>
      <StockContent ticker={ticker} />
    </Suspense>
  )
}
