import Link from 'next/link'
import { Star } from 'lucide-react'

export default function WatchlistPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Watchlist</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Track your favourite stocks
      </p>

      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed border-[var(--border)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--border)] mb-4">
          <Star className="h-7 w-7 text-[var(--text-muted)]" />
        </div>
        <p className="text-base font-medium text-[var(--text)] mb-1">
          Your watchlist is empty
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs">
          Add stocks from the scanner to track their scores over time.
        </p>
        <Link
          href="/scanner"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Browse Scanner
        </Link>
      </div>
    </div>
  )
}
