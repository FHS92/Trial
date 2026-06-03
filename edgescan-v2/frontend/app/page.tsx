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
import { ScrollReveal } from '@/components/ui/ScrollReveal'

export const metadata = {
  title: 'EdgeScan — The Edge That Moves Markets',
  description:
    'Quantitative stock intelligence platform. EdgeScan scores all 503 S&P 500 stocks daily using fundamental + technical analysis into a single 0–100 conviction score.',
  openGraph: {
    title: 'EdgeScan — The Edge That Moves Markets',
    description:
      'Quantitative stock intelligence. 503 S&P 500 stocks scored daily. Find high-conviction opportunities with institutional-grade analysis.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EdgeScan — The Edge That Moves Markets',
    description: 'Quantitative stock intelligence. 503 S&P 500 stocks scored daily.',
  },
}

/* ─── Mock scanner data ──────────────────────────────────────── */
const HERO_ROWS = [
  { ticker: 'NVDA', score: 91, signal: 'Strong',   change: '+2.3%', pos: true,  color: '#10b981' },
  { ticker: 'META', score: 88, signal: 'Strong',   change: '+1.4%', pos: true,  color: '#10b981' },
  { ticker: 'MSFT', score: 84, signal: 'Strong',   change: '+0.8%', pos: true,  color: '#10b981' },
  { ticker: 'AAPL', score: 78, signal: 'Moderate', change: '-0.3%', pos: false, color: '#34d399' },
  { ticker: 'AMZN', score: 73, signal: 'Moderate', change: '+0.5%', pos: true,  color: '#f59e0b' },
  { ticker: 'GOOGL', score: 69, signal: 'Moderate', change: '-0.1%', pos: false, color: '#f59e0b' },
  { ticker: 'BRK.B', score: 65, signal: 'Moderate', change: '+0.2%', pos: true,  color: '#f59e0b' },
]

const TICKER_ITEMS = [
  'NVDA', 'META', 'MSFT', 'AVGO', 'AAPL', 'V', 'LLY', 'JPM', 'AMZN',
  'MA', 'UNH', 'XOM', 'GOOGL', 'BRK.B', 'HD', 'TSLA', 'ABBV', 'PG',
  'JNJ', 'MRK', 'COST', 'WMT', 'BAC', 'CRM', 'NFLX', 'ORCL', 'AMD',
]

const TICKER_SCORES: Record<string, number> = {
  NVDA: 91, META: 88, MSFT: 84, AVGO: 86, AAPL: 78, V: 79, LLY: 82,
  JPM: 76, AMZN: 73, MA: 77, UNH: 71, XOM: 74, GOOGL: 69, 'BRK.B': 65,
  HD: 68, TSLA: 58, ABBV: 70, PG: 72, JNJ: 67, MRK: 63, COST: 75,
  WMT: 73, BAC: 64, CRM: 71, NFLX: 69, ORCL: 77, AMD: 80,
}

/* ─── How it works ──────────────────────────────────────────── */
const STEPS = [
  {
    num: '01',
    title: 'We Scan',
    desc: 'Every trading day our engine ingests earnings data, analyst revisions, price action, volume, and macro signals for all 503 S&P 500 stocks.',
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

/* ─── Signal bars ─────────────────────────────────────────── */
const FUND_SIGNALS = [
  { label: 'Revenue Growth', score: 88, color: '#10b981' },
  { label: 'EPS Quality',    score: 82, color: '#10b981' },
  { label: 'FCF Yield',      score: 71, color: '#34d399' },
  { label: 'ROE',            score: 90, color: '#10b981' },
  { label: 'Gross Margin',   score: 79, color: '#34d399' },
  { label: 'Debt / Equity',  score: 65, color: '#6ee7b7' },
]

const TECH_SIGNALS = [
  { label: 'RSI Position',    score: 94, color: '#10b981' },
  { label: 'MACD Trend',      score: 88, color: '#10b981' },
  { label: '200MA Distance',  score: 96, color: '#10b981' },
  { label: 'Volume Surge',    score: 87, color: '#34d399' },
  { label: 'ADX Momentum',    score: 92, color: '#10b981' },
  { label: 'Breakout Signal', score: 85, color: '#34d399' },
]

/* ─── Features ───────────────────────────────────────────── */
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

/* ─── Testimonials ─────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote:
      "I've tried Bloomberg terminals, FactSet, and a dozen screeners. EdgeScan is the only tool where I immediately understand why a stock ranks where it does. The score breakdown is clean, honest, and fast.",
    name: 'M. Chen',
    role: 'Portfolio Manager',
    stars: 5,
  },
  {
    quote:
      'Every morning before market open I run the scanner. Takes 2 minutes to know where the opportunities are. It has completely replaced my old research workflow.',
    name: 'R. Patel',
    role: 'Individual Investor',
    stars: 5,
  },
  {
    quote:
      'The AI thesis on each stock reads like a junior analyst wrote it — but it covers every single stock in the S&P 500. The depth here is wild for the price.',
    name: 'S. Williams',
    role: 'Retail Investor, Pro tier',
    stars: 5,
  },
]

/* ─── Pricing ──────────────────────────────────────────── */
const FREE_FEATURES = [
  'Top 10 S&P 500 stocks ranked',
  'Full score breakdown per stock',
  'Watchlist (up to 5 stocks)',
  'Updated every market day',
]

const PRO_FEATURES = [
  'All 503 S&P 500 stocks ranked',
  'AI "Why Now?" thesis per stock',
  'Technical signals panel',
  'Unlimited watchlist',
  'Full earnings calendar',
  'Score history (90 days)',
]

/* ─── Sub-components ─────────────────────────────────────── */

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-32 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-7 text-right" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

function NavBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-black/70">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="font-bold text-white tracking-tight text-lg">EdgeScan</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 transition-all duration-200 shadow-lg shadow-emerald-500/25"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  )
}

function HeroScanner() {
  return (
    <div className="relative">
      {/* Ambient glow behind card */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-25 blur-2xl pointer-events-none animate-glow-pulse"
        style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)' }}
      />

      <div className="relative rounded-2xl border border-white/10 bg-[#0c0c11] overflow-hidden shadow-2xl shadow-black/80">
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #10b981 40%, #34d399 60%, transparent)' }}
        />

        {/* Window chrome */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-xs text-zinc-500 font-mono">EdgeScan — Daily Scanner</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 tracking-wider">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            LIVE
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center px-4 py-2 border-b border-white/[0.04] text-[10px] uppercase tracking-widest font-bold text-zinc-600">
          <span className="w-8 shrink-0">#</span>
          <span className="w-20 shrink-0">Ticker</span>
          <span className="flex-1">Score</span>
          <span className="w-20 text-right shrink-0">Signal</span>
          <span className="w-16 text-right shrink-0">Chg</span>
        </div>

        {/* Rows */}
        {HERO_ROWS.map((row, i) => (
          <div
            key={row.ticker}
            className={`flex items-center px-4 py-2.5 border-b border-white/[0.03] ${
              i === 0 ? 'bg-emerald-500/[0.05]' : ''
            }`}
          >
            <span className="w-8 shrink-0 text-[11px] font-mono text-zinc-700">{String(i + 1).padStart(2, '0')}</span>
            <span className="w-20 shrink-0 font-mono font-black text-sm text-white">{row.ticker}</span>
            <div className="flex-1 flex items-center gap-2.5">
              <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.score}%`,
                    backgroundColor: row.color,
                    boxShadow: `0 0 6px ${row.color}50`,
                  }}
                />
              </div>
              <span
                className="text-sm font-black font-mono tabular-nums w-6 text-right shrink-0"
                style={{ color: row.color }}
              >
                {row.score}
              </span>
            </div>
            <span className="w-20 text-right shrink-0 text-[11px] font-bold" style={{ color: row.color }}>
              {row.signal}
            </span>
            <span
              className={`w-16 text-right shrink-0 text-[11px] font-mono font-bold ${
                row.pos ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {row.change}
            </span>
          </div>
        ))}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 text-[11px] text-zinc-600 bg-white/[0.01]">
          <span className="font-mono">Showing top 7 of 503 stocks</span>
          <span className="text-emerald-500/50 font-semibold">Updated 14 min ago</span>
        </div>
      </div>
    </div>
  )
}

function TickerTape() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div className="overflow-hidden border-y border-white/[0.04] bg-black/60 py-3 relative">
      <div className="flex gap-10 animate-ticker whitespace-nowrap">
        {doubled.map((ticker, i) => {
          const score = TICKER_SCORES[ticker] ?? 70
          const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
          return (
            <span key={i} className="flex items-center gap-2 shrink-0 select-none">
              <span className="text-xs font-mono font-semibold text-zinc-500">${ticker}</span>
              <span className="text-xs font-black font-mono tabular-nums" style={{ color }}>{score}</span>
              <span className="text-zinc-800 text-[10px]">·</span>
            </span>
          )
        })}
      </div>
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black/60 to-transparent pointer-events-none" />
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */

export default async function LandingPage() {
  const user = await getCurrentUser()
  if (user) redirect('/scanner')

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      <NavBar />

      {/* ════════════════════════════════════════
          SECTION 1 — HERO (split layout)
      ════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background aurora */}
        <div
          className="absolute top-[-15%] left-[-5%] w-[700px] h-[700px] rounded-full opacity-15 animate-blob pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', filter: 'blur(90px)' }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-10 animate-blob pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(80px)', animationDelay: '3s' }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full opacity-[0.08] animate-blob pointer-events-none"
          style={{ background: 'radial-gradient(circle, #34d399 0%, transparent 70%)', filter: 'blur(60px)', animationDelay: '1.5s' }}
        />
        <div className="absolute inset-0 dot-grid pointer-events-none" />

        {/* Vertical light pillars */}
        <div className="absolute top-0 left-1/4 w-px h-full opacity-[0.04] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #10b981 50%, transparent)' }} />
        <div className="absolute top-0 right-1/4 w-px h-full opacity-[0.025] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #6366f1 50%, transparent)' }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* ── Left ── */}
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-8"
                style={{ animation: 'slide-up 0.6s ease-out 0.1s both' }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                503 S&amp;P 500 stocks scored · Updated 3× daily
              </div>

              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] mb-6"
                style={{ animation: 'slide-up 0.6s ease-out 0.2s both' }}
              >
                <span
                  className="block bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #ffffff 50%, #d4d4d8 100%)' }}
                >
                  The Edge That
                </span>
                <span
                  className="block bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)' }}
                >
                  Moves Markets
                </span>
              </h1>

              <p
                className="text-lg text-zinc-400 mb-8 leading-relaxed max-w-lg"
                style={{ animation: 'slide-up 0.6s ease-out 0.35s both' }}
              >
                Quantitative intelligence for the modern investor.
                EdgeScan scores every S&amp;P 500 stock daily — fundamentals
                and technicals combined into one conviction score you can act on immediately.
              </p>

              {/* Inline stat pills */}
              <div
                className="flex flex-wrap gap-3 mb-10"
                style={{ animation: 'slide-up 0.6s ease-out 0.5s both' }}
              >
                {[
                  { val: '503', label: 'Stocks' },
                  { val: '15+', label: 'Signals' },
                  { val: '3×', label: 'Daily' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
                    <span className="text-sm font-black tabular-nums" style={{ color: '#10b981' }}>{s.val}</span>
                    <span className="text-xs text-zinc-500">{s.label}</span>
                  </div>
                ))}
              </div>

              <div
                className="flex flex-col sm:flex-row gap-4"
                style={{ animation: 'slide-up 0.6s ease-out 0.65s both' }}
              >
                <Link
                  href="/signup"
                  className="group flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white bg-emerald-500 hover:bg-emerald-400 transition-all duration-200 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-400/40 hover:-translate-y-0.5"
                >
                  Start for Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-medium text-zinc-300 border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  See How It Works
                </a>
              </div>
              <p className="mt-4 text-xs text-zinc-600" style={{ animation: 'fade-in 0.6s ease-out 0.8s both' }}>
                No credit card required · Free forever · Upgrade anytime
              </p>
            </div>

            {/* ── Right — Live scanner ── */}
            <div
              className="relative lg:pl-4"
              style={{ animation: 'slide-up 0.8s ease-out 0.3s both' }}
            >
              <HeroScanner />

              {/* Floating AI badge */}
              <div className="absolute -bottom-6 -left-4 hidden lg:block backdrop-blur-xl bg-white/[0.06] border border-white/10 rounded-xl p-3.5 animate-float2 shadow-2xl z-10">
                <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wider font-semibold">AI Thesis · Pro</p>
                <p className="text-xs text-zinc-200 max-w-[160px] leading-relaxed">
                  NVDA shows strong fundamental momentum with rising EPS revisions…
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Zap className="h-3 w-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-semibold">Unlock with Pro</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-zinc-700 animate-bounce">
          <ChevronDown className="h-4 w-4" />
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 2 — TICKER TAPE
      ════════════════════════════════════════ */}
      <TickerTape />

      {/* ════════════════════════════════════════
          SECTION 3 — PROOF BAR
      ════════════════════════════════════════ */}
      <section className="border-b border-white/5 bg-white/[0.015]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-wrap justify-center divide-x divide-white/8">
            {[
              { value: '503', label: 'S&P 500 Stocks Covered' },
              { value: '15+', label: 'Signals Per Stock' },
              { value: '3×',  label: 'Daily Data Refresh' },
              { value: '$0',  label: 'To Get Started' },
            ].map((stat, i) => (
              <ScrollReveal key={stat.label} variant="fade-up" delay={i * 80}>
                <div className="flex flex-col items-center px-10 py-2">
                  <span
                    className="text-3xl font-black tracking-tight bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #10b981, #34d399)' }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-xs text-zinc-500 mt-0.5">{stat.label}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 4 — HOW IT WORKS
      ════════════════════════════════════════ */}
      <section id="how-it-works" className="relative py-28 px-6 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] opacity-[0.08] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)', filter: 'blur(70px)' }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <ScrollReveal variant="fade-up">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">The Process</p>
              <h2
                className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
              >
                How EdgeScan Works
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6 relative">
            <div
              className="hidden md:block absolute top-12 left-[calc(33.33%-16px)] right-[calc(33.33%-16px)] h-px opacity-15"
              style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }}
            />

            {STEPS.map((step, i) => (
              <ScrollReveal key={step.num} variant="fade-up" delay={i * 120}>
                <div
                  className="group relative rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-8 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all duration-300"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(90deg, transparent, #10b981 50%, transparent)' }}
                  />
                  <div
                    className="text-6xl font-black tracking-tighter bg-clip-text text-transparent mb-6 leading-none"
                    style={{ backgroundImage: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }}
                  >
                    {step.num}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 group-hover:bg-emerald-500/20 transition-colors">
                    <step.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 5 — SCORE BREAKDOWN
      ════════════════════════════════════════ */}
      <section className="relative py-28 px-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 30% 50%, rgba(16,185,129,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.06) 0%, transparent 60%)',
          }}
        />
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <ScrollReveal variant="fade-up">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">The Score</p>
              <h2
                className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
              >
                One Number. Total Clarity.
              </h2>
              <p className="text-zinc-400 mt-4 max-w-xl mx-auto text-sm">
                Every signal distilled into a single conviction score so you focus on decisions — not data wrangling.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Stock card mock */}
            <ScrollReveal variant="slide-right">
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 overflow-hidden">
                <div
                  className="absolute top-0 left-0 right-0 h-px opacity-60"
                  style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }}
                />

                <div className="flex items-start justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-3xl font-black text-white font-mono tracking-tight">NVDA</span>
                      <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 font-semibold">
                        Strong
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm">NVIDIA Corporation · NASDAQ</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle
                          cx="40" cy="40" r="34" fill="none"
                          stroke="url(#scoreGradLP)" strokeWidth="6" strokeLinecap="round"
                          strokeDasharray="213.6" strokeDashoffset="25.6"
                        />
                        <defs>
                          <linearGradient id="scoreGradLP" x1="0%" y1="0%" x2="100%" y2="0%">
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

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {[{ label: 'Fundamental Score', val: 79 }, { label: 'Technical Score', val: 94 }].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white/5 border border-white/5 p-4">
                      <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
                      <div className="flex items-end gap-1.5">
                        <span className="text-2xl font-black text-emerald-400 tabular-nums">{s.val}</span>
                        <span className="text-zinc-600 text-xs mb-1">/100</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 mt-2">
                        <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${s.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Fundamental Signals</p>
                <div className="space-y-2">
                  {FUND_SIGNALS.map((s) => (
                    <ScoreBar key={s.label} label={s.label} score={s.score} color={s.color} />
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Right */}
            <ScrollReveal variant="slide-left" delay={100}>
              <div className="space-y-6">
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
                    We built EdgeScan because institutional desks have had access to quantitative
                    screening tools for decades. Individual investors had spreadsheets and gut feel.
                    That imbalance ends here.
                  </p>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Every day our engine processes revenue reports, analyst estimates, price action,
                    volume patterns, and momentum indicators — then blends them into a single,
                    transparent score you can act on immediately.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 overflow-hidden relative">
                  <div
                    className="absolute top-0 left-0 right-0 h-px opacity-50"
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
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 6 — TESTIMONIALS
      ════════════════════════════════════════ */}
      <section className="relative py-28 px-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.1) 0%, transparent 60%)' }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <ScrollReveal variant="fade-up">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">Investors Speak</p>
              <h2
                className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
              >
                The edge speaks for itself
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <ScrollReveal key={i} variant="fade-up" delay={i * 110}>
                <div
                  className="group relative rounded-2xl border border-white/8 bg-white/[0.03] p-7 hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition-all duration-300 h-full"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(90deg, transparent, #10b981 50%, transparent)' }}
                  />

                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, si) => (
                      <svg key={si} className="h-3.5 w-3.5 text-emerald-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>

                  <blockquote className="text-sm text-zinc-300 leading-relaxed mb-5">{t.quote}</blockquote>

                  <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-emerald-400">
                        {t.name.split(' ')[0][0]}{t.name.split(' ')[1][0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{t.name}</p>
                      <p className="text-[11px] text-zinc-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 7 — FEATURES GRID
      ════════════════════════════════════════ */}
      <section id="features" className="relative py-28 px-6 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 opacity-25"
          style={{ background: 'linear-gradient(to bottom, transparent, #10b981)' }}
        />

        <div className="max-w-5xl mx-auto">
          <ScrollReveal variant="fade-up">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">Everything You Need</p>
              <h2
                className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
              >
                Built for the serious investor
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <ScrollReveal key={feature.title} variant="fade-up" delay={i * 80}>
                <div
                  className="group rounded-2xl border border-white/8 bg-white/[0.02] p-7 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden h-full"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(90deg, transparent, #10b981 50%, transparent)' }}
                  />
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/15 mb-5 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all duration-300">
                    <feature.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2 text-base">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 8 — PHILOSOPHY
      ════════════════════════════════════════ */}
      <section className="relative py-28 px-6 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] opacity-[0.12] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)', filter: 'blur(80px)' }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <ScrollReveal variant="scale-up">
            <div>
              <div className="text-6xl text-emerald-500/20 font-serif leading-none mb-6 select-none">"</div>
              <blockquote
                className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug tracking-tight mb-8 bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #d4d4d8 100%)' }}
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
          </ScrollReveal>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 9 — PRICING
      ════════════════════════════════════════ */}
      <section id="pricing" className="relative py-28 px-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 60%)' }}
        />
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <ScrollReveal variant="fade-up">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">Simple Pricing</p>
              <h2
                className="text-4xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
              >
                Start free. Scale with confidence.
              </h2>
              <p className="text-zinc-400 mt-4">No credit card required to get started.</p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* FREE */}
            <ScrollReveal variant="slide-right" delay={60}>
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 flex flex-col h-full">
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
            </ScrollReveal>

            {/* PRO */}
            <ScrollReveal variant="slide-left" delay={120}>
              <div className="relative rounded-2xl p-8 flex flex-col overflow-hidden gradient-border bg-white/[0.04] h-full">
                <div
                  className="absolute top-0 left-0 right-0 h-px opacity-80"
                  style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }}
                />
                <div
                  className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 opacity-20 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', filter: 'blur(30px)' }}
                />

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
                    <span className="text-5xl font-black text-white">$15</span>
                    <span className="text-zinc-500 mb-2">/month</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">or $144/year — save 20%</p>
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
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 10 — FINAL CTA
      ════════════════════════════════════════ */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 60%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 20% 100%, rgba(99,102,241,0.1) 0%, transparent 50%)' }}
        />
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-30"
          style={{ background: 'linear-gradient(90deg, transparent, #10b981 30%, #6366f1 70%, transparent)' }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <ScrollReveal variant="fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-8">
              <Eye className="h-3.5 w-3.5" />
              Join investors who stopped guessing
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={80}>
            <h2
              className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-none mb-6 bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)' }}
            >
              Your edge starts here.
            </h2>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={160}>
            <p className="text-lg text-zinc-400 mb-10 max-w-lg mx-auto">
              503 S&amp;P 500 stocks. 15+ signals. One conviction score. Total clarity.
            </p>
          </ScrollReveal>

          <ScrollReveal variant="scale-up" delay={240}>
            <div>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white bg-emerald-500 hover:bg-emerald-400 transition-all duration-200 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-400/50 hover:-translate-y-0.5"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-4 text-xs text-zinc-600">No credit card required.</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 11 — FOOTER
      ════════════════════════════════════════ */}
      <footer className="relative border-t border-white/5 bg-black/50 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <span className="font-bold text-white tracking-tight">EdgeScan</span>
                <p className="text-xs text-zinc-600 leading-tight">See the Signal. Cut the Noise.</p>
              </div>
            </div>

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
