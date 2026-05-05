'use client'
import { useState, useEffect } from 'react'

export type Universe = 'sp500'

export const UNIVERSE_LABELS: Record<Universe, string> = {
  sp500: 'S&P 500',
}

export function useUniverse() {
  const [universe] = useState<Universe>('sp500')

  useEffect(() => {
    localStorage.setItem('edgescan_universe', 'sp500')
  }, [])

  return { universe, setUniverse: () => {}, label: UNIVERSE_LABELS[universe] }
}
