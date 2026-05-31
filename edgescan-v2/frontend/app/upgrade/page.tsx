import Link from 'next/link'
import { Check, Crown, Zap } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

export const metadata = { title: 'Upgrade to Pro — EdgeScan' }

const FREE_FEATURES = [
  'Full S&P 500 scanner with scores',
  'Fundamental & technical breakdown',
  'Watchlist (up to 10 stocks)',
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

export default async function UpgradePage() {
  const currentUser = await getCurrentUser()
  const isAlreadyPro = currentUser?.tier === 'pro'

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-1.5 mb-4">
            <Crown className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--accent)]">EdgeScan Pro</span>
          </div>
          <h1 className="text-4xl font-bold text-[var(--text)] mb-3">
            Unlock the full EdgeScan edge
          </h1>
          <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto">
            AI-generated trade theses, technical signals, and score trends — everything you need to find opportunities before the crowd.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Free */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-6">
              <p className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Free</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-[var(--text)]">$0</span>
                <span className="text-[var(--text-muted)] mb-1">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
                  <Check className="h-4 w-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-center text-sm font-medium text-[var(--text-muted)]">
              {isAlreadyPro ? 'Free tier' : 'Current plan'}
            </div>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-6 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">
                Most Popular
              </span>
            </div>
            <div className="mb-6">
              <p className="text-sm font-medium text-[var(--accent)] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5" /> Pro
              </p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-[var(--text)]">$15</span>
                <span className="text-[var(--text-muted)] mb-1">/month</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                or <span className="font-semibold text-[var(--text)]">$144/year</span> — save 20%
              </p>
            </div>
            <ul className="space-y-3 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                  <Check className="h-4 w-4 text-[var(--accent)] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {isAlreadyPro ? (
              <div
                className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                You&apos;re on Pro
              </div>
            ) : (
              <button
                disabled
                className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 opacity-80 cursor-not-allowed"
                style={{ backgroundColor: 'var(--accent)' }}
                title="Billing coming soon"
              >
                <Zap className="h-4 w-4" />
                Upgrade to Pro — coming soon
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-6 text-center">
            Frequently asked questions
          </h2>
          {[
            {
              q: 'When will billing launch?',
              a: 'Stripe billing is coming in the next release. Sign up now to lock in early-adopter pricing.',
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. Monthly plans cancel at end of the current period. Annual plans are refundable within 14 days.',
            },
            {
              q: 'What data sources does EdgeScan use?',
              a: 'Fundamentals from SEC EDGAR, prices from Alpha Vantage, AI thesis from Claude (Anthropic).',
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-medium text-[var(--text)] mb-1">{q}</p>
              <p className="text-sm text-[var(--text-muted)]">{a}</p>
            </div>
          ))}
        </div>

        {/* Back link */}
        <div className="text-center mt-10">
          <Link
            href="/scanner"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Back to Scanner
          </Link>
        </div>
      </div>
    </div>
  )
}
