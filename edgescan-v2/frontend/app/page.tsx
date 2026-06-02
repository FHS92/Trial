import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, BarChart2, Star, Zap, Lock, Check, ArrowRight } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

export const metadata = {
  title: 'EdgeScan — AI-Powered S&P 500 Stock Scanner',
  description:
    'EdgeScan scores every S&P 500 stock using fundamental and technical analysis. Find undervalued stocks with strong momentum.',
  openGraph: {
    title: 'EdgeScan — AI-Powered S&P 500 Stock Scanner',
    description: 'EdgeScan scores every S&P 500 stock using fundamental and technical analysis. Find undervalued stocks with strong momentum.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'EdgeScan — AI-Powered S&P 500 Stock Scanner',
    description: 'EdgeScan scores every S&P 500 stock using fundamental and technical analysis.',
  },
}

const SAMPLE_STOCKS = [
  { ticker: 'NVDA', name: 'NVIDIA Corp', score: 89, price: 127.43, upside: 18.2 },
  { ticker: 'MSFT', name: 'Microsoft Corp', score: 84, price: 418.72, upside: 11.4 },
  { ticker: 'AAPL', name: 'Apple Inc', score: 78, price: 195.88, upside: 8.7 },
  { ticker: 'META', name: 'Meta Platforms', score: 76, price: 548.13, upside: 14.1 },
  { ticker: 'AMZN', name: 'Amazon.com', score: 72, price: 202.31, upside: 9.3 },
]

function ScoreBubble({ score }: { score: number }) {
  const color =
    score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white tabular-nums"
      style={{ backgroundColor: color }}
    >
      {score}
    </div>
  )
}

export default async function LandingPage() {
  const user = await getCurrentUser()
  if (user) redirect('/scanner')

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-[var(--text)]">EdgeScan</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          Updated 3× daily · 503 S&amp;P 500 stocks covered
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--text)] mb-4 leading-tight">
          Find great stocks before<br />the crowd notices
        </h1>
        <p className="text-lg text-[var(--text-muted)] max-w-xl mx-auto mb-8 leading-relaxed">
          EdgeScan scores every S&amp;P 500 stock across 15 fundamental and technical factors —
          giving you a single, transparent score to cut through the noise.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            How it works
          </Link>
        </div>
      </section>

      {/* Sample scanner preview */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--text)]">Top Ranked — Today</span>
            <span className="ml-auto text-xs text-[var(--text-muted)] font-mono">Sample data</span>
          </div>
          {SAMPLE_STOCKS.map((s, i) => (
            <div
              key={s.ticker}
              className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0"
            >
              <span className="w-5 shrink-0 text-right text-xs font-mono text-[var(--text-muted)]">{i + 1}</span>
              <ScoreBubble score={s.score} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[var(--text)] font-mono">{s.ticker}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{s.name}</p>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="text-sm font-mono font-semibold text-[var(--text)] tabular-nums">
                  ${s.price.toFixed(2)}
                </span>
                <span className="text-xs font-mono font-semibold text-[#22c55e] tabular-nums">
                  +{s.upside}%
                </span>
              </div>
            </div>
          ))}
          {/* Blurred rows (gate) */}
          <div className="relative">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] opacity-20 select-none pointer-events-none">
              <span className="w-5 shrink-0 text-right text-xs font-mono text-[var(--text-muted)]">6</span>
              <div className="h-10 w-10 rounded-full bg-[var(--border)]" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-16 bg-[var(--border)] rounded" />
                <div className="h-2.5 w-28 bg-[var(--border)] rounded" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-[var(--surface)] to-transparent">
              <Link
                href="/signup"
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Lock className="h-3.5 w-3.5" />
                Sign up free to see all 503 stocks
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-10">
          Everything you need to invest with an edge
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: BarChart2,
              title: 'Composite scoring',
              desc: 'Each stock gets a 0–100 score across 8 fundamental and 8 technical factors — no black boxes.',
            },
            {
              icon: Star,
              title: 'Watchlist & alerts',
              desc: 'Track your favourites and get notified when scores move significantly.',
            },
            {
              icon: Zap,
              title: 'AI thesis (Pro)',
              desc: 'Claude generates a "Why now?" thesis for each top-ranked stock, updated daily.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/10 mb-3">
                <Icon className="h-4.5 w-4.5 text-[var(--accent)]" />
              </div>
              <h3 className="font-semibold text-[var(--text)] mb-1">{title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-2">Simple pricing</h2>
        <p className="text-center text-[var(--text-muted)] text-sm mb-10">Start free. Upgrade when you need more.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Free */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="text-lg font-bold text-[var(--text)] mb-0.5">Free</p>
            <p className="text-3xl font-bold text-[var(--text)] mb-4">$0</p>
            <ul className="space-y-2 text-sm text-[var(--text-muted)] mb-6">
              {[
                'Top 10 stocks in real-time',
                '5-stock watchlist',
                'Score breakdown & methodology',
                'Price charts & technicals',
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#22c55e] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-center border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div
            className="rounded-xl border-2 p-6 relative"
            style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--surface)' }}
          >
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Most popular
            </div>
            <p className="text-lg font-bold text-[var(--text)] mb-0.5">Pro</p>
            <p className="text-3xl font-bold text-[var(--text)] mb-4">
              $15<span className="text-base font-normal text-[var(--text-muted)]">/mo</span>
            </p>
            <ul className="space-y-2 text-sm text-[var(--text-muted)] mb-6">
              {[
                'All 503 S&P 500 stocks',
                'Unlimited watchlist',
                'Full earnings calendar',
                'AI "Why Now?" thesis (Claude)',
                'On-demand re-scan',
                'Score history (90 days)',
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-center text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Start Pro trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Ready to find your edge?</h2>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          No credit card required. Free forever.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Create a free account
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-4 py-6">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] justify-center">
          <Link href="/methodology" className="hover:text-[var(--text)] transition-colors">Methodology</Link>
          <Link href="/legal" className="hover:text-[var(--text)] transition-colors">Legal &amp; Privacy</Link>
          <Link href="/legal#disclaimer" className="hover:text-[var(--text)] transition-colors">Disclaimer</Link>
          <span>© {new Date().getFullYear()} EdgeScan. Not investment advice.</span>
        </div>
      </footer>
    </div>
  )
}
