'use client'

import { useState, useEffect, useCallback } from 'react'
import { getServerWatchlist, loadWatchlist, toggleWatchlist } from '@/app/watchlist/WatchlistClient'

interface Props {
  ticker: string
}

export default function WatchStar({ ticker }: Props) {
  const [starred, setStarred] = useState(false)

  // Initial state comes from the server so it reflects the active profile,
  // not whatever another profile may have left in localStorage.
  useEffect(() => {
    getServerWatchlist().then(list => setStarred(list.includes(ticker)))
  }, [ticker])

  // Keep in sync when toggleWatchlist updates localStorage on this page
  useEffect(() => {
    function onStorage() {
      setStarred(loadWatchlist().includes(ticker))
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('edgescan:watchlist', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('edgescan:watchlist', onStorage)
    }
  }, [ticker])

  const handleClick = useCallback(() => {
    const next = toggleWatchlist(ticker)
    setStarred(next)
    window.dispatchEvent(new Event('edgescan:watchlist'))
  }, [ticker])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors hover:bg-white/[0.08]"
      title={starred ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-label={starred ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      {starred ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-2)" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      )}
    </button>
  )
}
