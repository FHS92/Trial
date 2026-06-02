import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Scoring Methodology — EdgeScan',
  description: 'How EdgeScan scores S&P 500 stocks using fundamental and technical analysis.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-[var(--text)] mb-3">{title}</h2>
      {children}
    </section>
  )
}

interface ScoreRow {
  factor: string
  maxPts: number
  description: string
}

function ScoreTable({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--border)]/30">
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Factor</th>
            <th className="text-right px-4 py-2.5 font-medium text-[var(--text-muted)] w-20">Max pts</th>
            <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.factor}
              className={`border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--bg)]'}`}
            >
              <td className="px-4 py-2.5 font-mono text-xs text-[var(--text)]">{r.factor}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--accent)] font-semibold">{r.maxPts}</td>
              <td className="px-4 py-2.5 text-[var(--text-muted)]">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FUNDAMENTAL_FACTORS: ScoreRow[] = [
  { factor: 'Revenue growth', maxPts: 15, description: 'Year-over-year revenue growth rate. Rewards consistent top-line expansion without penalising early-stage acceleration.' },
  { factor: 'EPS growth', maxPts: 15, description: 'Earnings per share growth. Combined with revenue growth to filter out margin-improvement-only stories.' },
  { factor: 'FCF yield', maxPts: 10, description: 'Free cash flow yield relative to sector median. High FCF yield signals undervaluation and capital generation capacity.' },
  { factor: 'ROE', maxPts: 10, description: 'Return on equity vs. sector peers. Rewards capital-efficient businesses with durable competitive advantages.' },
  { factor: 'Gross margin', maxPts: 10, description: 'Gross margin level and trend. Expanding margins indicate pricing power or improving operational leverage.' },
  { factor: 'Debt / equity', maxPts: 10, description: 'Balance-sheet leverage relative to sector. Penalises over-leveraged companies that face refinancing risk.' },
  { factor: 'EPS revision', maxPts: 10, description: 'Analyst EPS estimate revisions. Upgrades signal improving business momentum; downgrades flag deteriorating outlook.' },
  { factor: 'Forward P/E', maxPts: 10, description: 'Forward P/E vs. sector average. A valuation tiebreaker — rewards cheapness, penalises extreme premiums.' },
]

const TECHNICAL_FACTORS: ScoreRow[] = [
  { factor: 'RSI (14-day)', maxPts: 8, description: 'RSI in the 40–70 range earns full points. Overbought (>70) is slightly penalised; oversold (<30) earns partial credit given mean-reversion potential.' },
  { factor: 'MACD', maxPts: 8, description: 'Bullish crossover earns full credit. Above-signal-line earns partial. Below-signal or bearish crossover loses points.' },
  { factor: 'vs 200-day MA', maxPts: 8, description: 'Percentage gap above or below the 200-day moving average. Rewards stocks in confirmed uptrends while flagging those in structural downtrends.' },
  { factor: 'Volume trend', maxPts: 6, description: 'OBV slope and recent volume vs. 50-day average. Rising volume on up-days vs. flat/falling on down-days signals institutional accumulation.' },
  { factor: '52-week position', maxPts: 6, description: 'Position within the trailing 52-week range. Rewards stocks near highs (momentum) while not excessively penalising recent dips in strong fundamentals names.' },
  { factor: 'OBV slope', maxPts: 6, description: 'On-balance volume 30-day slope as a standalone confirmation of volume-price agreement.' },
  { factor: 'ROC (20-day)', maxPts: 6, description: '20-day rate of change — a momentum proxy. Rewards recent positive momentum without double-counting the 200MA factor.' },
  { factor: 'Earnings penalty', maxPts: -8, description: 'Up to −8 points deducted when earnings are within 14 days (−8) or 30 days (−4). Reduces false positives from pre-earnings volatility.' },
]

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/scanner"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Scanner
      </Link>

      <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Scoring Methodology</h1>
      <p className="text-[var(--text-muted)] mb-8 leading-relaxed">
        EdgeScan computes a composite score (0–100) for each S&amp;P 500 constituent using a rules-based
        blend of fundamental and technical factors. No machine learning or black-box models are used —
        every point allocation is documented below.
      </p>

      <Section title="Score structure">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
            <p className="text-3xl font-bold text-[var(--text)] mb-1">8</p>
            <p className="text-sm text-[var(--text-muted)]">Fundamental factors</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
            <p className="text-3xl font-bold text-[var(--text)] mb-1">5</p>
            <p className="text-sm text-[var(--text-muted)]">Technical factors</p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          Each factor earns a partial score based on how the stock ranks relative to its S&amp;P 500 peers.
          Raw points are normalized to a 0–100 composite score. Fundamental factors carry more weight,
          reflecting the view that business quality (fundamentals) drives sustainable returns,
          while technical analysis improves entry timing.
        </p>
      </Section>

      <Section title="Fundamental factors">
        <ScoreTable rows={FUNDAMENTAL_FACTORS} />
        <p className="text-xs text-[var(--text-muted)]">
          Fundamentals sourced from SEC EDGAR XBRL filings (quarterly, with annual supplementation)
          and from the configured data provider (Alpha Vantage or equivalent).
          Sector medians are computed from the current S&amp;P 500 universe and refreshed with each scan.
        </p>
      </Section>

      <Section title="Technical factors (incl. penalties)">
        <ScoreTable rows={TECHNICAL_FACTORS} />
        <p className="text-xs text-[var(--text-muted)]">
          Technical indicators computed on adjusted close prices using a 252-trading-day lookback
          (approximately one year). Data sourced from Alpha Vantage EOD prices or equivalent provider.
          pandas-ta is used for RSI, MACD, OBV, and ROC calculations.
        </p>
      </Section>

      <Section title="Price target">
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          The 1-month price target is a weighted blend of (1) the analyst consensus price target from
          covering brokers, (2) a DCF estimate using trailing FCF and a sector-appropriate discount
          rate, and (3) a relative valuation estimate based on sector P/E medians. Weighting is
          50% analyst / 30% DCF / 20% relative. The upside percentage is relative to the most recent
          closing price.
        </p>
      </Section>

      <Section title="Scan cadence">
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          The full S&amp;P 500 universe is scanned three times per trading day: pre-market (06:00 ET),
          mid-day (12:00 ET), and post-close (18:00 ET). Scans are skipped on US market holidays.
          Score history is retained for 90 days. Pro subscribers can trigger an additional on-demand
          scan (rate-limited to once per hour).
        </p>
      </Section>

      <Section title="AI thesis (Pro)">
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          The &ldquo;Why Now&rdquo; thesis is generated by Claude (Anthropic) using the stock&rsquo;s score breakdown,
          key metrics, recent price action, and earnings calendar. Theses are cached and regenerated
          when the composite score changes by ≥5 points or after 7 days. The AI output is informational
          only and does not constitute investment advice.
        </p>
      </Section>

      <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 mt-6">
        <p className="text-xs text-amber-300/80 leading-relaxed">
          <span className="font-semibold">Disclaimer:</span> EdgeScan scores are algorithmic outputs
          for informational purposes only. They are not personalised investment advice, do not account
          for your risk tolerance or financial situation, and should not be the sole basis for any
          investment decision. Past score performance does not guarantee future returns.
          See our{' '}
          <Link href="/legal#disclaimer" className="underline hover:text-amber-200">full disclaimer</Link>.
        </p>
      </div>
    </div>
  )
}
