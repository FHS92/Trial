'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const SECTORS = [
  'All',
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Industrials',
  'Energy',
  'Materials',
  'Utilities',
  'Real Estate',
  'Communication Services',
]

interface SectorFilterProps {
  onSectorChange: (sector: string | undefined) => void
  currentSector?: string
}

export function SectorFilter({ onSectorChange, currentSector }: SectorFilterProps) {
  const [active, setActive] = useState(currentSector ?? 'All')

  useEffect(() => {
    setActive(currentSector ?? 'All')
  }, [currentSector])

  const handleClick = (sector: string) => {
    setActive(sector)
    onSectorChange(sector === 'All' ? undefined : sector)
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {SECTORS.map((sector) => {
        const isActive = active === sector
        return (
          <button
            key={sector}
            onClick={() => handleClick(sector)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap',
              isActive
                ? 'text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
            )}
            style={isActive ? {
              background: 'var(--pro-gradient)',
            } : {
              background: 'var(--surface-elevated)',
            }}
          >
            {sector}
          </button>
        )
      })}
    </div>
  )
}
