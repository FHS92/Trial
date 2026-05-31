import { Calendar } from 'lucide-react'

export default function EarningsPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Earnings</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Upcoming earnings for your watchlist and high-score stocks
      </p>

      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed border-[var(--border)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--border)] mb-4">
          <Calendar className="h-7 w-7 text-[var(--text-muted)]" />
        </div>
        <p className="text-base font-medium text-[var(--text)] mb-2">
          Earnings calendar coming soon
        </p>
        <p className="text-sm text-[var(--text-muted)] max-w-xs">
          See upcoming earnings dates for S&P 500 stocks ranked by EdgeScan score. Get notified before key catalysts.
        </p>
      </div>
    </div>
  )
}
