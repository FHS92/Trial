import Link from 'next/link'
import { Check, Crown, Zap } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { UpgradeCTA } from './UpgradeCTA'

export const metadata = { title: 'Upgrade to Pro — EdgeScan' }

const FREE_FEATURES = [
  'Top 10 stocks in the S&P 500 scanner',
  'Fundamental & technical score breakdown',
  'Watchlist (up to 5 stocks)',
  'Price history chart',
]

const PRO_FEATURES = [
  'Everything in Free',
  'AI "Why Now" thesis per stock',
  'Technical signals panel',
  'Score history & trend charts',
  'Unlimited watchlist',
  'Priority data refresh',
]

const FAQ = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Monthly plans cancel at end of the current billing period with no charge. Annual plans are fully refundable within 14 days of purchase.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'All major credit and debit cards (Visa, Mastercard, Amex). Payments are processed securely by Stripe.',
  },
  {
    q: 'What data sources does EdgeScan use?',
    a: 'Fundamentals from SEC EDGAR, prices from Alpha Vantage, AI theses from Claude (Anthropic). All scores are algorithmic — not personalised financial advice.',
  },
]

const TRUST_STATS = [
  { value: '500', label: 'S&P 500 stocks ranked' },
  { value: '3×', label: 'Updated daily' },
  { value: '15+', label: 'Scoring signals' },
]

export default async function UpgradePage() {
  const currentUser = await getCurrentUser()
  const isAlreadyPro = currentUser?.tier === 'pro'

  return (
    <div className="px-4 py-10 max-w-4xl mx-auto">

      {/* Header */}
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 border"
          style={{ background: 'var(--accent-light)', borderColor: 'var(--accent-glow)' }}
        >
          <Crown className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>EdgeScan Pro</span>
        </div>
        <h1 className="text-4xl font-extrabold text-gradient mb-3 tracking-tight">
          Unlock the full EdgeScan edge
        </h1>
        <p className="text-[var(--text-muted)] text-base max-w-xl mx-auto leading-relaxed">
          AI-generated trade theses, technical signals, and score trends — everything you need to spot opportunities before the crowd.
        </p>
      </div>

      {/* Trust stats row */}
      <div className="flex justify-center gap-6 md:gap-10 mb-10 flex-wrap">
        {TRUST_STATS.map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-2xl font-extrabold tabular-nums text-gradient-accent">{value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-2 gap-5 mb-8">

        {/* Free */}
        <div
          className="rounded-[var(--radius-xl)] border border-[var(--border)] p-6 shadow-[var(--shadow-sm)]"
          style={{ background: 'var(--surface)' }}
        >
          <div className="mb-6">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Free</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-extrabold text-[var(--text)] tracking-tight">$0</span>
              <span className="text-[var(--text-muted)] mb-1 text-sm">/month</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
                <Check className="h-4 w-4 text-[var(--text-subtle)] mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div
            className="rounded-[var(--radius)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--text-muted)] border border-[var(--border)]"
          >
            {isAlreadyPro ? 'Free tier' : 'Current plan'}
          </div>
        </div>

        {/* Pro */}
        <div className="gradient-border rounded-[var(--radius-xl)] p-[1px] shadow-[var(--shadow-md)]">
          <div
            className="rounded-[var(--radius-xl)] p-6 h-full relative overflow-hidden"
            style={{ background: 'var(--surface-elevated)' }}
          >
            {/* Most Popular badge */}
            <div className="absolute -top-px left-1/2 -translate-x-1/2">
              <span
                className="pro-button rounded-b-full px-4 py-1 text-xs font-bold text-white shadow-sm"
                style={{ display: 'inline-block' }}
              >
                Most Popular
              </span>
            </div>

            <div className="mt-4 mb-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                <Crown className="h-3.5 w-3.5" /> Pro
              </p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold text-[var(--text)] tracking-tight">$15</span>
                <span className="text-[var(--text-muted)] mb-1 text-sm">/month</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                or{' '}
                <span className="font-bold" style={{ color: 'var(--accent)' }}>$144/year</span>
                {' '}—{' '}
                <span
                  className="font-bold rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                >
                  SAVE 20%
                </span>
              </p>
            </div>

            <ul className="space-y-3 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                  <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                  {f}
                </li>
              ))}
            </ul>

            {isAlreadyPro ? (
              <div className="flex items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-sm font-bold text-white shadow-sm" style={{ background: 'var(--pro-gradient)' }}>
                <Zap className="h-4 w-4 text-yellow-300" />
                You&apos;re on Pro
              </div>
            ) : (
              <div className="space-y-2">
                <UpgradeCTA plan="monthly" label="Upgrade monthly — $15/mo" />
                <UpgradeCTA plan="annual" label="Upgrade annually — $144/yr" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Annual savings callout */}
      {!isAlreadyPro && (
        <div
          className="max-w-2xl mx-auto mb-10 rounded-[var(--radius-lg)] border px-5 py-3.5 text-center"
          style={{ background: 'var(--accent-light)', borderColor: 'var(--accent-glow)' }}
        >
          <p className="text-sm text-[var(--text)]">
            <span className="font-bold" style={{ color: 'var(--accent)' }}>Save $36/year</span>
            {' '}by paying annually — that&apos;s two months free.
          </p>
        </div>
      )}

      {/* FAQ */}
      <div className="max-w-2xl mx-auto space-y-3">
        <h2 className="text-base font-bold text-[var(--text)] mb-5 text-center tracking-tight">
          Frequently asked questions
        </h2>
        {FAQ.map(({ q, a }) => (
          <div
            key={q}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 shadow-[var(--shadow-sm)]"
            style={{ background: 'var(--surface)' }}
          >
            <p className="font-semibold text-[var(--text)] text-sm mb-1">{q}</p>
            <p className="text-sm text-[var(--text-muted)]">{a}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--text-subtle)] text-center mt-8 max-w-xl mx-auto leading-relaxed">
        Not investment advice. All scores and theses are algorithmic estimates for informational purposes only.
        Prices shown in USD. Subscription managed via Stripe.
      </p>

      <div className="text-center mt-5">
        <Link
          href="/scanner"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          Back to Scanner
        </Link>
      </div>
    </div>
  )
}
