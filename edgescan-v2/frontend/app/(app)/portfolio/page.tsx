import { Briefcase } from 'lucide-react'

export const metadata = { title: 'Portfolio — EdgeScan' }

export default function PortfolioPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Portfolio</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Track your positions and performance
      </p>

      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed border-[var(--border)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--border)] mb-4">
          <Briefcase className="h-7 w-7 text-[var(--text-muted)]" />
        </div>
        <p className="text-base font-medium text-[var(--text)] mb-2">
          Portfolio coming soon
        </p>
        <p className="text-sm text-[var(--text-muted)] max-w-xs">
          Build and track a model portfolio of EdgeScan-ranked stocks. Monitor P&L, allocation, and score drift over time.
        </p>
      </div>
    </div>
  )
}
