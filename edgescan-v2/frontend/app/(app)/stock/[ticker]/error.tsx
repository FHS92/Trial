'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function StockError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link
        href="/scanner"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Scanner
      </Link>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <p className="text-base font-semibold text-[var(--text)] mb-2">Something went wrong</p>
        <p className="text-sm text-[var(--text-muted)] mb-4">{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="rounded-lg px-4 py-2 text-sm font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
