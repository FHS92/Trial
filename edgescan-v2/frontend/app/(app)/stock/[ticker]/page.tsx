import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
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

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { ticker } = await params
  const upper = ticker.toUpperCase()
  try {
    const cookieHeader = (await cookies()).getAll().map(c => `${c.name}=${c.value}`).join('; ')
    const stock = await serverFetch<ScanResult>(`/stocks/${upper}`, cookieHeader)
    return {
      title: `${upper} — EdgeScan`,
      description: `${stock.name ?? upper} (${upper}) scores ${stock.score}/100 on EdgeScan. Fundamental score: ${stock.fundamental_score}, Technical score: ${stock.technical_score}.`,
    }
  } catch {
    return {
      title: `${upper} — EdgeScan`,
      description: `View the EdgeScan score, fundamentals, and technicals for ${upper}.`,
    }
  }
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
        <div
          className="rounded-[var(--radius-xl)] border border-[var(--border)] p-8 text-center shadow-[var(--shadow-sm)]"
          style={{ background: 'var(--surface)' }}
        >
          <p className="text-lg font-bold text-[var(--text)] mb-2">
            {is404 ? `${ticker.toUpperCase()} not found` : 'Unable to load stock data'}
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {is404
              ? 'This ticker may not be in the current scan universe.'
              : 'The service is temporarily unavailable. Please try again.'}
          </p>
          <Link
            href="/scanner"
            className="pro-button inline-flex items-center gap-1.5 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Browse Scanner
          </Link>
        </div>
      </div>
    )
  }

  const upsidePositive = (stock.upside_pct ?? 0) >= 0
  const topPct = Math.max(1, 100 - stock.score)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero gradient band */}
      <div
        className="relative px-4 md:px-6 pt-5 pb-7 border-b border-[var(--border)]"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, var(--accent-glow), transparent 70%)',
        }}
      >
        {/* Back + watchlist */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/scanner"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Scanner
          </Link>
          <WatchlistToggle ticker={ticker} />
        </div>

        {/* Ticker hero */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-3xl font-extrabold text-[var(--text)] tabular-nums tracking-tight">
                {stock.ticker}
              </h1>
              <ScoreBadge score={stock.score} />
              <span
                className="gradient-border inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]"
                style={{ background: 'var(--accent-light)' }}
              >
                Top {topPct}% of S&P 500
              </span>
            </div>

            <p className="text-[var(--text-muted)] text-sm">{stock.name}</p>
            {(stock.sector || stock.industry) && (
              <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                {[stock.sector, stock.industry].filter(Boolean).join(' · ')}
              </p>
            )}

            <div className="flex items-baseline gap-2.5 mt-3">
              <span className="text-2xl font-mono font-extrabold text-[var(--text)] tabular-nums">
                {formatPrice(stock.current_price)}
              </span>
              {stock.upside_pct != null && (
                <span
                  className="text-sm font-mono font-bold tabular-nums"
                  style={{ color: upsidePositive ? 'var(--score-strong)' : 'var(--score-weak)' }}
                >
                  {formatPercent(stock.upside_pct)} upside
                </span>
              )}
            </div>

            {stock.earnings_date && (
              <p className="text-xs text-[var(--text-subtle)] mt-1.5">
                Next earnings:{' '}
                {new Date(stock.earnings_date).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Score ring */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <ScoreRing score={stock.score} size={120} showLabel />
            <p className="text-xs text-[var(--text-subtle)]">
              <span title="Fundamental score">F{stock.fundamental_score}</span>
              {' · '}
              <span title="Technical score">T{stock.technical_score}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Body sections */}
      <div className="p-4 md:p-6 space-y-5">

        {/* Score breakdown — elevated */}
        <ScoreBreakdown
          breakdown={stock.score_breakdown}
          fundamentalScore={stock.fundamental_score}
          technicalScore={stock.technical_score}
        />

        {/* Key metrics */}
        <section>
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Key Metrics</h2>
          <MetricsGrid metrics={stock.metrics} />
          {stock.metrics.recent_catalyst && (
            <p className="mt-3 text-xs text-[var(--text-muted)] italic">
              Recent catalyst: {stock.metrics.recent_catalyst}
            </p>
          )}
        </section>

        {/* Why Now (AI thesis) — premium card */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Why Now</h2>
            {tier === 'pro' && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-glow)' }}
              >
                <Sparkles className="h-2.5 w-2.5" />
                AI Analysis
              </span>
            )}
          </div>
          {tier === 'pro' ? (
            <div
              className="gradient-border rounded-[var(--radius-lg)] relative overflow-hidden shadow-[var(--shadow-sm)]"
              style={{ background: 'var(--surface-elevated)' }}
            >
              <div
                className="absolute top-0 left-0 w-1 h-full rounded-l-[var(--radius-lg)]"
                style={{ background: 'var(--pro-gradient)' }}
              />
              <div className="pl-5 pr-5 py-5">
                {stock.thesis ? (
                  <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-line">
                    {stock.thesis}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    Analysis will be generated on the next scan cycle.
                  </p>
                )}
                <p className="text-[11px] text-[var(--text-subtle)] mt-3 text-right">
                  Generated by AI · Claude
                </p>
              </div>
            </div>
          ) : (
            <ProLock benefit={`Unlock AI-generated investment thesis for ${stock.ticker}`}>
              <div
                className="rounded-[var(--radius-lg)] relative overflow-hidden"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ background: 'var(--pro-gradient)', opacity: 0.5 }}
                />
                <div className="pl-5 pr-5 py-5">
                  <p className="text-sm text-[var(--text)]">
                    {stock.ticker} shows strong fundamental momentum with rising EPS revisions and above-sector margins...
                  </p>
                  <p className="text-sm text-[var(--text)] mt-2 opacity-50">
                    Technical setup confirms a potential breakout with RSI holding at neutral levels while the stock trades above its 200-day moving average.
                  </p>
                </div>
              </div>
            </ProLock>
          )}
        </section>

        {/* Price chart */}
        <section>
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Price History</h2>
          <div
            className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 shadow-[var(--shadow-sm)]"
            style={{ background: 'var(--surface)' }}
          >
            <PriceChart ticker={stock.ticker} />
          </div>
        </section>

        {/* Technical signals */}
        <section>
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Technical Signals</h2>
          {tier === 'pro' ? (
            <div
              className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 shadow-[var(--shadow-sm)]"
              style={{ background: 'var(--surface)' }}
            >
              <SignalsPanel signals={stock.signals} />
            </div>
          ) : (
            <ProLock benefit={`See all technical signals for ${stock.ticker}`}>
              <div
                className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4"
                style={{ background: 'var(--surface)' }}
              >
                <SignalsPanel signals={stock.signals} />
              </div>
            </ProLock>
          )}
        </section>

        {/* Disclaimer */}
        <div className="border-t border-[var(--border)] pt-4 space-y-1">
          <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
            Not investment advice. Data provided for informational purposes only. Scores and price targets are algorithmic estimates and may not reflect current market conditions. Always do your own research before making investment decisions.
          </p>
          {stock.scanned_at && (
            <p className="text-xs text-[var(--text-subtle)]">
              Data as of:{' '}
              {new Date(stock.scanned_at).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StockSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="px-4 md:px-6 pt-5 pb-7 border-b border-[var(--border)]">
        <div className="h-4 w-24 rounded-full bg-[var(--border)] mb-5" />
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2.5 flex-1">
            <div className="h-9 w-28 rounded bg-[var(--border)]" />
            <div className="h-4 w-48 rounded bg-[var(--border)]" />
            <div className="h-7 w-32 rounded bg-[var(--border)] mt-3" />
          </div>
          <div className="h-32 w-32 rounded-full bg-[var(--border)]" />
        </div>
      </div>
      <div className="p-4 md:p-6 space-y-5">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={5} />
      </div>
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
