'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadWatchlist, toggleWatchlist } from '@/app/watchlist/WatchlistClient'

interface Props {
  ticker: string
}

export default function WatchStar({ ticker }: Props) {
  const [starred, setStarred] = useState(false)

  // Initialize from localStorage only on the client (SSR-safe)
  useEffect(() => {
    setStarred(loadWatchlist().includes(ticker))
  }, [ticker])

  const handleStar = useCallback(() => {
    const next = toggleWatchlist(ticker)
    setStarred(next)
  }, [ticker])

  return (
    <button
      type="button"
      onClick={handleStar}
      className="flex items-center justify-center rounded transition-colors hover:bg-white/[0.08]"
      style={{ minWidth: 44, minHeight: 44 }}
      title={starred ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-label={starred ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      {starred ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7a99" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      )}
    </button>
  )
}
