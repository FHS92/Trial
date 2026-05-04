'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 1500)
  }

  return (
    <button
      onClick={handleRefresh}
      className="flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium transition-colors hover:bg-white/[0.08]"
      style={{ color: 'var(--color-text-2)', border: '1px solid var(--color-border-2)' }}
      title="Refresh stock data"
      aria-label="Refresh stock data"
    >
      <svg
        width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        className={spinning ? 'animate-spin' : ''}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh
    </button>
  )
}
