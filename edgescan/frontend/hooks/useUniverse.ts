'use client'
import { useState, useEffect } from 'react'

export type Universe = 'sp500' | 'russell'

export const UNIVERSE_LABELS: Record<Universe, string> = {
  sp500: 'S&P 500',
  russell: 'Russell 1000',
}

export function useUniverse() {
  const [universe, setUniverseState] = useState<Universe>('sp500')

  useEffect(() => {
    const stored = localStorage.getItem('edgescan_universe') as Universe | null
    if (stored === 'sp500' || stored === 'russell') setUniverseState(stored)
  }, [])

  function setUniverse(u: Universe) {
    localStorage.setItem('edgescan_universe', u)
    setUniverseState(u)
  }

  return { universe, setUniverse, label: UNIVERSE_LABELS[universe] }
}
