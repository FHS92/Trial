'use client'

import { useState } from 'react'
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

  const handleClick = (sector: string) => {
    setActive(sector)
    onSectorChange(sector === 'All' ? undefined : sector)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {SECTORS.map((sector) => (
        <button
          key={sector}
          onClick={() => handleClick(sector)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
            active === sector
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]'
          )}
        >
          {sector}
        </button>
      ))}
    </div>
  )
}
