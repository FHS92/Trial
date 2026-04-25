import Link from 'next/link'

export const metadata = {
  title: 'How EdgeScan Works',
  description: 'AI-powered stock intelligence for the S&P 500. Discover how EdgeScan scores, ranks, and tracks opportunities.',
}

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    title: 'Smart Scanner',
    colour: '#4f8ef7',
    desc: 'Every S&P 500 stock is scored daily across 12 fundamental and technical signals. The scanner surfaces the top opportunities ranked by composite score so you always know where the edge is.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    title: 'Watchlist',
    colour: '#f5a623',
    desc: 'Star any stock from the scanner or detail page. Your watchlist syncs to your profile across every device — phone, tablet, desktop — with no setup required.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: 'Portfolio Tracker',
    colour: '#22c55e',
    desc: "Log your real holdings — ticker, shares, and buy price. EdgeScan calculates live P&L, score-at-buy vs today's score, and flags positions where the model's conviction has dropped.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    title: 'Earnings Calendar',
    colour: '#a78bfa',
    desc: 'See upcoming earnings dates for every stock in the scanner, sorted by date and enriched with the current EdgeScan score — so you know which reports actually matter.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Backtest Engine',
    colour: '#f75f5f',
    desc: 'Replay the scoring model from Jan 2020 to today. Pick a 1- or 3-month hold period and see exactly how the top-ranked picks performed against a SPY buy-and-hold benchmark.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    title: 'Paper Trading',
    colour: '#34d399',
    desc: "Watch EdgeScan's algorithm trade in real time with $6,000 of virtual capital. Monthly auto-rebalance into the top-ranked picks — a live proof of concept running alongside your real decisions.",
  },
]

const SCORE_PILLARS = [
  {
    label: 'Fundamental',
    weight: '50%',
    colour: '#4f8ef7',
    signals: ['Revenue growth (YoY)', 'EPS growth', 'Free cash flow yield', 'Return on equity', 'Gross margin', 'Debt-to-equity'],
  },
  {
    label: 'Technical',
    weight: '50%',
    colour: '#22c55e',
    signals: ['MACD crossover', 'RSI momentum', 'Volume trend', '52-week range position', 'Analyst consensus', 'Earnings proximity'],
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Pick your profile',
    desc: 'Create a named profile on the landing page. Add an optional PIN for privacy. Your watchlist and portfolio travel with your profile across every device.',
  },
  {
    n: '02',
    title: 'Find your edge',
    desc: "Open the Scanner. Stocks are ranked by composite score — anything above 70 is a strong signal. Tap a row to see the full breakdown, price chart, and analyst thesis.",
  },
  {
    n: '03',
    title: 'Track and decide',
    desc: 'Star stocks to your Watchlist. Log real positions in the Portfolio to track P&L and score drift. Run a Backtest to validate the model before you commit capital.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: '#080b12', color: '#e2e8f8' }}>

      {/* ── Nav ── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 sm:px-10 h-14"
        style={{
          background: 'rgba(8,11,18,0.88)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href="/" className="flex items-center gap-1">
          <span className="text-lg font-bold tracking-tight" style={{ color: '#4f8ef7' }}>Edge</span>
          <span className="text-lg font-bold tracking-tight" style={{ color: '#e2e8f8' }}>Scan</span>
        </Link>
        <Link
          href="/"
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}
        >
          Open App →
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-10 pb-24">

        {/* ── Hero ── */}
        <section className="pt-20 pb-16 text-center">
          {/* Glow */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: '80px',
              width: '600px',
              height: '300px',
              background: 'radial-gradient(ellipse, rgba(79,142,247,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.25)' }}
          >
            S&amp;P 500 · Daily Signals · Multi-Profile
          </div>
          <h1
            className="text-4xl sm:text-5xl font-black leading-tight mb-5"
            style={{ color: '#e2e8f8', letterSpacing: '-0.02em' }}
          >
            Stock intelligence that<br />
            <span style={{ color: '#4f8ef7' }}>cuts through the noise.</span>
          </h1>
          <p className="text-base sm:text-lg max-w-xl mx-auto mb-8" style={{ color: '#6b7a99', lineHeight: 1.7 }}>
            EdgeScan scores every S&amp;P 500 stock across 12 signals, ranks the best opportunities
            daily, and gives you the tools to act — watchlist, portfolio, backtest, earnings calendar,
            all in one place.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#4f8ef7', color: '#fff' }}
          >
            Get started free
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 mt-14">
            {[
              { value: '500+', label: 'S&P 500 stocks scored' },
              { value: '12', label: 'signals per stock' },
              { value: 'Daily', label: 'model refresh' },
              { value: '2020', label: 'backtest start' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black mb-0.5" style={{ color: '#4f8ef7' }}>{s.value}</p>
                <p className="text-xs" style={{ color: '#6b7a99' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How the Score Works ── */}
        <section className="py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ letterSpacing: '-0.01em' }}>The EdgeScan Score</h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: '#6b7a99', lineHeight: 1.7 }}>
              Every stock gets a score from 0–100 built from two equally-weighted pillars.
              No black box — every component is transparent and traceable.
            </p>
          </div>

          {/* Score dial mock */}
          <div className="flex justify-center mb-10">
            <div
              className="flex items-center gap-6 px-8 py-5 rounded-2xl"
              style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {[
                { score: 88, label: 'NVDA', color: '#22c55e' },
                { score: 71, label: 'META', color: '#22c55e' },
                { score: 54, label: 'XOM', color: '#f59e0b' },
                { score: 31, label: 'WBA', color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center gap-1.5">
                  <div
                    className="flex items-center justify-center rounded-full text-sm font-black"
                    style={{
                      width: '52px',
                      height: '52px',
                      background: `${s.color}18`,
                      border: `2px solid ${s.color}55`,
                      color: s.color,
                    }}
                  >
                    {s.score}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: '#6b7a99' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {SCORE_PILLARS.map(p => (
              <div
                key={p.label}
                className="rounded-2xl p-6"
                style={{ background: '#0f1521', border: `1px solid ${p.colour}22` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold" style={{ color: p.colour }}>{p.label}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${p.colour}18`, color: p.colour }}
                  >
                    {p.weight} weight
                  </span>
                </div>
                <ul className="space-y-2">
                  {p.signals.map(sig => (
                    <li key={sig} className="flex items-center gap-2 text-sm" style={{ color: '#a0aec0' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.colour, flexShrink: 0, display: 'inline-block' }} />
                      {sig}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Score legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {[
              { range: '70 – 100', label: 'Strong buy signal', color: '#22c55e' },
              { range: '50 – 69', label: 'Neutral / watch', color: '#f59e0b' },
              { range: '0 – 49', label: 'Weak / avoid', color: '#ef4444' },
            ].map(l => (
              <div key={l.range} className="flex items-center gap-2 text-xs" style={{ color: '#6b7a99' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                <span style={{ color: l.color, fontWeight: 600 }}>{l.range}</span>
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ letterSpacing: '-0.01em' }}>Everything you need. Nothing you don&apos;t.</h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: '#6b7a99', lineHeight: 1.7 }}>
              Six tightly integrated tools — all derived from the same underlying scoring engine.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-2xl p-6"
                style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="flex items-center justify-center rounded-xl mb-4"
                  style={{ width: '44px', height: '44px', background: `${f.colour}15`, color: f.colour }}
                >
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold mb-2" style={{ color: '#e2e8f8' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#6b7a99' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How to get started ── */}
        <section className="py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ letterSpacing: '-0.01em' }}>Up and running in 60 seconds.</h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: '#6b7a99' }}>
              No account form. No email required. Just pick a profile and start exploring.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden sm:block absolute top-6 left-[calc(100%-0px)] w-full h-px"
                    style={{ background: 'linear-gradient(to right, rgba(79,142,247,0.3), transparent)', zIndex: 0 }}
                  />
                )}
                <div
                  className="rounded-2xl p-6 h-full relative z-10"
                  style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span
                    className="inline-block text-xs font-black mb-3 px-2 py-0.5 rounded-lg"
                    style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}
                  >
                    {step.n}
                  </span>
                  <h3 className="text-sm font-bold mb-2" style={{ color: '#e2e8f8' }}>{step.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#6b7a99' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          className="rounded-2xl p-10 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(79,142,247,0.08) 0%, rgba(34,197,94,0.05) 100%)',
            border: '1px solid rgba(79,142,247,0.2)',
          }}
        >
          <h2 className="text-2xl font-black mb-3" style={{ letterSpacing: '-0.01em' }}>
            Ready to find your edge?
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6b7a99' }}>
            The scanner is live. The scores are fresh. Pick a profile and start exploring.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#4f8ef7', color: '#fff' }}
          >
            Open EdgeScan
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        {/* ── Disclaimer ── */}
        <p className="text-center text-xs mt-10" style={{ color: '#3a4259', lineHeight: 1.7 }}>
          EdgeScan is a research and analysis tool, not a financial adviser.
          Scores and signals do not constitute investment advice.
          Past backtest performance does not guarantee future results.
        </p>
      </main>
    </div>
  )
}
