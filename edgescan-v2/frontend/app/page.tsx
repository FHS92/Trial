import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  TrendingUp,
  BarChart2,
  Star,
  Zap,
  ArrowRight,
  Check,
  ChevronDown,
  Activity,
  BookOpen,
  Calendar,
  Eye,
  Shield,
  Target,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

export const metadata = {
  title: 'EdgeScan — The Edge That Moves Markets',
  description:
    'Quantitative stock intelligence platform. EdgeScan scans 5,000+ US equities daily combining fundamental + technical analysis into a single 0–100 conviction score.',
  openGraph: {
    title: 'EdgeScan — The Edge That Moves Markets',
    description:
      'Quantitative stock intelligence. 5,000+ stocks scanned daily. Find high-conviction opportunities with institutional-grade analysis.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EdgeScan — The Edge That Moves Markets',
    description:
      'Quantitative stock intelligence. 5,000+ stocks scanned daily.',
  },
}

/* ─── Floating hero stock cards ───────────────────────────── */
const HERO_CARDS = [
  { ticker: 'NVDA', score: 91, label: 'Strong Signal', delay: '0s', top: '28%', right: '8%', cls: 'animate-float' },
  { ticker: 'MSFT', score: 84, label: 'Momentum +', delay: '1.2s', top: '55%', right: '3%', cls: 'animate-float2' },
  { ticker: 'AAPL', score: 78, label: 'Fundamentals ↑', delay: '0.6s', top: '18%', left: '5%', cls: 'animate-float3' },
  { ticker: 'META', score: 88, label: 'Breakout Setup', delay: '1.8s', top: '62%', left: '2%', cls: 'animate-float' },
]

/* ─── How it works ─────────────────────────────────────────── */
const STEPS = [
  {
    num: '01',
    title: 'We Scan',
    desc: 'Every trading day our engine ingests earnings data, analyst revisions, price action, volume, and macro signals for 5,000+ US equities.',
    icon: Activity,
  },
  {
    num: '02',
    title: 'We Score',
    desc: 'Fundamental + technical signals combine into a single 0–100 conviction score. No guesswork. No gut feel. Pure signal.',
    icon: Target,
  },
  {
    num: '03',
    title: 'You Act',
    desc: 'Browse ranked opportunities, drill into any ticker for a full breakdown, build your watchlist, and act with clarity.',
    icon: TrendingUp,
  },
]

/* ─── Features ─────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: BarChart2,
    title: 'Daily Scanner',
    desc: 'Ranked list of top opportunities refreshed every market day. Always know where the edge is.',
  },
  {
    icon: BookOpen,
    title: 'Deep Fundamentals',
    desc: 'Revenue growth, FCF yield, ROE, gross margin, debt/equity, P/E — every ratio that matters.',
  },
  {
    icon: Activity,
    title: 'Technical Signals',
    desc: 'RSI, MACD, 200MA position, volume trends, ADX momentum — quantified and scored automatically.',
  },
  {
    icon: Star,
    title: 'Smart Watchlist',
    desc: 'Save and track your highest-conviction ideas. Never lose sight of the setups that matter.',
  },
  {
    icon: Calendar,
    title: 'Earnings Awareness',
    desc: 'Know when earnings are near before you act. Avoid surprises. Position with confidence.',
  },
  {
    icon: Zap,
    title: 'Built for Speed',
    desc: 'Clean, blazing-fast UI designed to get you from login to insight in seconds — not minutes.',
  },
]

/* ─── Score breakdown mock signals ───────────────────────────── */
const FUND_SIGNALS = [
  { label: 'Revenue Growth', score: 88, color: '#10b981' },
  { label: 'EPS Quality', score: 82, color: '#10b981' },
  { label: 'FCF Yield', score: 71, color: '#34d399' },
  { label: 'ROE', score: 90, color: '#10b981' },
  { label: 'Gross Margin', score: 79, color: '#34d399' },
  { label: 'Debt / Equity', score: 65, color: '#6ee7b7' },
]

const TECH_SIGNALS = [
  { label: 'RSI Position', score: 94, color: '#10b981' },
  { label: 'MACD Trend', score: 88, color: '#10b981' },
  { label: '200MA Distance', score: 96, color: '#10b981' },
  { label: 'Volume Surge', score: 87, color: '#34d399' },
  { label: 'ADX Momentum', score: 92, color: '#10b981' },
  { label: 'Breakout Signal', score: 85, color: '#34d399' },
]

/* ─── Pricing features ──────────────────────────────────────── */
const FREE_FEATURES = [
  'Top 10 results per scan',
  'Basic score breakdown',
  'Watchlist (10 stocks)',
  'Updated every market day',
]

const PRO_FEATURES = [
  'Full 50+ results per scan',
  'Complete signal breakdown',
  'Unlimited watchlist',
  'Priority data refresh',
  'Earnings calendar integration',
  'Score history & trends',
]

/* ─── Sub-components ──────────────────────────────────────────── */

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-32 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono font-bold w-7 text-right" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

function NavBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-black/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="font-bold text-white tracking-tight text-lg">EdgeScan</span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 transition-all duration-200 shadow-lg shadow-emerald-500/20"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  )
}

/* ─── Page ────────────────────────────────────────────────────── */

export default async function LandingPage() {
  const user = await getCurrentUser()
  if (user) redirect('/scanner')

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      <NavBar />

      {/* ════════════════════════════════════════
          SECTION 1 — HERO
      ════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background gradient blobs */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 animate-blob"
          style={{
            background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-15 animate-blob"
          style={{
            background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
            filter: 'blur(80px)',
            animationDelay: '3s',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5 animate-blob"
          style={{
            background: 'radial-gradient(circle, #34d399 0%, transparent 60%)',
            filter: 'blur(60px)',
            animationDelay: '1.5s',
          }}
        />

        {/* Dot grid overlay */}
        <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

        {/* Floating stock cards */}
        {HERO_CARDS.map((card) => (
          <div
            key={card.ticker}
            className={`absolute hidden lg:block backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-3.5 ${card.cls} shadow-2xl`}
            style={{
              top: card.top,
              right: card.right,
              left: card.left,
              animationDelay: card.delay,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-bold text-sm font-mono">{card.ticker}</span>
              <span className="text-emerald-400 font-black text-xl tabular-nums">{card.score}</span>
              <span className="text-zinc-500 text-xs">/100</span>
            </div>
            <div className="text-emerald-400 text-xs font-medium">{card.label}</div>
            <div className="mt-2 h-0.5 w-full rounded bg-white/5 overflow-hidden">
              <div
                className="h-full rounded bg-emerald-400/60"
                style={{ width: `${card.score}%` }}
              />
            </div>
          </div>
        ))}

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            5,000+ stocks scanned every market day
          </div>

          {/* Headline */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-none mb-6">
            <span
              className="block bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #ffffff 40%, #a1a1aa 100%)',
              }}
            >
              The Edge That
            </span>
            <span
              className="block bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
              }}
            >
              Moves Markets
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Quantitative intelligence for the modern investor.
            EdgeScan combines fundamental analysis with technical signals
            into a single conviction score for every US stock — so you
            always know where the edge is.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white bg-emerald-500 hover:bg-emerald-400 transition-all duration-200 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-400/40 hover:-translate-y-0.5"
            >
              Start for Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-medium text-zinc-300 border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              See How It Works
            </a>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-xs text-zinc-600">
            No credit card required · Free forever · Upgrade anytime
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-zinc-600 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 2 — SOCIAL PROOF BAR
      ════════════════════════════════════════ */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-wrap justify-center gap-x-0 gap-y-4 divide-x divide-white/10">
            {[
              { value: '5,000+', label: 'Stocks Scanned Daily' },
              { value: '100+', label: 'Signals Per Stock' },
              { value: 'Daily', label: 'Data Refresh' },
              { value: '$0', label: 'To Get Started' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex flex-col items-center px-10 py-1"
              >
                <span
                  className="text-2xl font-black tracking-tight bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #10b981, #34d399)' }}
                >
                  {stat.value}
                </span>
                <span className="text-xs text-zinc-500 mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 3 — HOW IT WORKS
      ════════════════════════════════════════ */}
      <section id="how-it-works" className="relative py-28 px-6 overflow-hidden">
        {/* Section glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] opacity-10 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">
              The Process
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
            >
              How EdgeScan Works
            </h2>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="group relative rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-8 hover:border-white/15 hover:bg-white/[0.06] transition-all duration-300"
              >
                {/* Step number */}
                <div
                  className="text-6xl font-black tracking-tighter bg-clip-text text-transparent mb-6 leading-none"
                  style={{ backgroundImage: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }}
                >
                  {step.num}
                </div>

                {/* Icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 group-hover:bg-emerald-500/15 transition-colors">
                  <step.icon className="h-5 w-5 text-emerald-400" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>

                {/* Connector line (desktop only) */}
                {step.num !== '03' && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-white/10 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 4 — SCORE BREAKDOWN
      ════════════════════════════════════════ */}
      <section className="relative py-28 px-6 overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 30% 50%, rgba(16,185,129,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.06) 0%, transparent 60%)',
          }}
        />
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">
              The Score
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
            >
              One Number. Total Clarity.
            </h2>
            <p className="text-zinc-400 mt-4 max-w-xl mx-auto">
              Every signal distilled into a single conviction score, so you
              can focus on decisions — not data wrangling.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Left — Mock stock card */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 overflow-hidden">
              {/* Top glow line */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-60"
                style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }}
              />

              {/* Stock header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl font-black text-white font-mono tracking-tight">NVDA</span>
                    <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 font-semibold">
                      Strong Buy
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm">NVIDIA Corporation · NASDAQ</p>
                </div>

                {/* Big score */}
                <div className="flex flex-col items-center">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="none"
                        stroke="url(#scoreGrad)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray="213.6"
                        strokeDashoffset="25.6"
                      />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-white leading-none">91</span>
                      <span className="text-[9px] text-zinc-500 leading-none mt-0.5">/100</span>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500 mt-1">EdgeScore</span>
                </div>
              </div>

              {/* Sub-scores */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="rounded-xl bg-white/5 border border-white/5 p-4">
                  <p className="text-xs text-zinc-500 mb-1">Fundamental Score</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-black text-emerald-400 tabular-nums">79</span>
                    <span className="text-zinc-600 text-xs mb-1">/100</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 mt-2">
                    <div className="h-full w-[79%] rounded-full bg-emerald-500/70" />
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/5 p-4">
                  <p className="text-xs text-zinc-500 mb-1">Technical Score</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-black text-emerald-400 tabular-nums">94</span>
                    <span className="text-zinc-600 text-xs mb-1">/100</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 mt-2">
                    <div className="h-full w-[94%] rounded-full bg-emerald-400/80" />
                  </div>
                </div>
              </div>

              {/* Signal breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Fundamental Signals</p>
                {FUND_SIGNALS.map((s) => (
                  <ScoreBar key={s.label} label={s.label} score={s.score} color={s.color} />
                ))}
              </div>
            </div>

            {/* Right — Explanation + technical signals */}
            <div className="space-y-6">
              {/* Explanation */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8">
                <h3 className="text-xl font-bold text-white mb-3">
                  Institutional-grade analysis,{' '}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #10b981, #34d399)' }}
                  >
                    democratized.
                  </span>
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                  We built EdgeScan because institutional desks have had access
                  to quantitative screening tools for decades. Individual investors
                  had spreadsheets and gut feel. That imbalance ends here.
                </p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Every day our engine processes revenue reports, analyst
                  estimates, price action, volume patterns, and momentum
                  indicators — then blends them into a single, transparent score
                  you can act on immediately.
                </p>
              </div>

              {/* Technical signals card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-50"
                  style={{ background: 'linear-gradient(90deg, transparent, #6366f1, transparent)' }}
                />
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Technical Signals</p>
                <div className="space-y-2">
                  {TECH_SIGNALS.map((s) => (
                    <ScoreBar key={s.label} label={s.label} score={s.score} color={s.color} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 5 — FEATURES GRID
      ════════════════════════════════════════ */}
      <section id="features" className="relative py-28 px-6 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 opacity-30"
          style={{ background: 'linear-gradient(to bottom, transparent, #10b981)' }}
        />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">
              Everything You Need
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
            >
              Built for the serious investor
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/8 bg-white/[0.02] p-7 hover:border-white/15 hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/15 mb-5 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all duration-300">
                  <feature.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-base">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 6 — PHILOSOPHY / QUOTE
      ════════════════════════════════════════ */}
      <section className="relative py-28 px-6 overflow-hidden">
        {/* Radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] opacity-15 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="text-6xl text-emerald-500/30 font-serif leading-none mb-6 select-none">"</div>
          <blockquote
            className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug tracking-tight mb-8 bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #d4d4d8 100%)',
            }}
          >
            Most investors drown in data. EdgeScan turns noise into signal
            — a single number that tells you exactly where to look.
          </blockquote>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-8 bg-emerald-500/40" />
              <Shield className="h-3.5 w-3.5 text-emerald-500/60" />
              <div className="h-px w-8 bg-emerald-500/40" />
            </div>
            <span className="text-sm font-semibold text-white">EdgeScan Research Team</span>
            <span className="text-xs text-zinc-600">Quants &amp; engineers who got tired of the noise</span>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 7 — PRICING
      ════════════════════════════════════════ */}
      <section id="pricing" className="relative py-28 px-6 overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 60%)',
          }}
        />
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">
              Simple Pricing
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
            >
              Start free. Scale with confidence.
            </h2>
            <p className="text-zinc-400 mt-4">
              No credit card required to get started.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* FREE */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 flex flex-col">
              <div className="mb-8">
                <p className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Free</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-5xl font-black text-white">$0</span>
                  <span className="text-zinc-500 mb-2">/month</span>
                </div>
                <p className="text-xs text-zinc-600 mt-1">Forever free</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full text-center rounded-xl px-5 py-3 text-sm font-semibold text-zinc-300 border border-white/10 hover:border-white/20 hover:bg-white/5 hover:text-white transition-all duration-200"
              >
                Get started free
              </Link>
            </div>

            {/* PRO */}
            <div className="relative rounded-2xl p-8 flex flex-col overflow-hidden gradient-border bg-white/[0.04]">
              {/* Glow effect */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-80"
                style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }}
              />
              <div
                className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 opacity-20 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
                  filter: 'blur(30px)',
                }}
              />

              {/* Most Popular badge */}
              <div className="absolute top-5 right-5">
                <div
                  className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  Most Popular
                </div>
              </div>

              <div className="mb-8">
                <p
                  className="text-sm font-semibold mb-2 uppercase tracking-wider bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #10b981, #34d399)' }}
                >
                  Pro
                </p>
                <div className="flex items-end gap-1.5">
                  <span className="text-5xl font-black text-white">$19</span>
                  <span className="text-zinc-500 mb-2">/month</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">or $190/year — save 17%</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full text-center rounded-xl px-5 py-3 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 transition-all duration-200 shadow-lg shadow-emerald-500/20"
              >
                Start Pro Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 8 — FINAL CTA
      ════════════════════════════════════════ */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Multi-layer background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.15) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 20% 100%, rgba(99,102,241,0.1) 0%, transparent 50%)',
          }}
        />
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-30"
          style={{ background: 'linear-gradient(90deg, transparent, #10b981 30%, #6366f1 70%, transparent)' }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-8">
            <Eye className="h-3.5 w-3.5" />
            Join investors who stopped guessing
          </div>

          <h2
            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-none mb-6 bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
          >
            Your edge starts here.
          </h2>
          <p className="text-lg text-zinc-400 mb-10 max-w-lg mx-auto">
            Join investors who have stopped guessing and started scanning.
            5,000+ stocks. One score. Total clarity.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white bg-emerald-500 hover:bg-emerald-400 transition-all duration-200 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-400/50 hover:-translate-y-0.5"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-600">No credit card required.</p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 9 — FOOTER
      ════════════════════════════════════════ */}
      <footer className="relative border-t border-white/5 bg-black/40 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 mb-10">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <span className="font-bold text-white tracking-tight">EdgeScan</span>
                <p className="text-xs text-zinc-600 leading-tight">See the Signal. Cut the Noise.</p>
              </div>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
              <Link href="/scanner" className="hover:text-white transition-colors">Scanner</Link>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
              <Link href="/legal" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/legal#terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </nav>
          </div>

          <div
            className="w-full h-px mb-8"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }}
          />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-zinc-600">
            <span>© 2025 EdgeScan. All rights reserved.</span>
            <span className="text-center">
              Not financial advice. For informational purposes only. Past performance does not guarantee future results.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
