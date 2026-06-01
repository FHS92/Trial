'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin] page error:', error)
  }, [error])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-400 mb-4" />
        <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Admin data unavailable</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          {error.message ?? 'Failed to load admin statistics.'}
        </p>
        <button
          onClick={reset}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
