'use client'

import { useState, useTransition } from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { SectorFilter } from './SectorFilter'
import { StockRow } from '@/components/stock/StockRow'
import { SkeletonRow } from '@/components/ui/SkeletonRow'
import type { ScanResult, Tier } from '@/lib/types'
import { api } from '@/lib/api'

interface ScannerClientProps {
  initialResults: ScanResult[]
  tier: Tier
  totalAvailable: number
  asOf: string
  dataSource: string
}

export function ScannerClient({
  initialResults,
  tier,
  totalAvailable,
  asOf,
  dataSource,
}: ScannerClientProps) {
  const [results, setResults] = useState(initialResults)
  const [currentTotal, setCurrentTotal] = useState(totalAvailable)
  const [isPending, startTransition] = useTransition()
  const [filterError, setFilterError] = useState(false)
  const [activeSector, setActiveSector] = useState<string | undefined>(undefined)

  const handleSectorChange = (sector: string | undefined) => {
    setFilterError(false)
    setActiveSector(sector)
    startTransition(async () => {
      try {
        const data = await api.scanner.list({ sector, limit: 500 })
        setResults(data.results)
        setCurrentTotal(data.total_available)
      } catch {
        setFilterError(true)
        // Keep existing results on error
      }
    })
  }

  const handleResetSector = () => {
    handleSectorChange(undefined)
  }

  const formattedDate = asOf
    ? new Date(asOf).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'unknown'

  const dataSourceLabel = dataSource && dataSource !== 'unknown' ? ` · ${dataSource}` : ''

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Scanner</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Updated {formattedDate}{dataSourceLabel}
        </p>
      </div>

      {/* Sector filter */}
      <SectorFilter onSectorChange={handleSectorChange} currentSector={activeSector} />

      {/* Filter error banner */}
      {filterError && (
        <div className="rounded-lg bg-red-900/20 border border-red-700/40 px-4 py-3 text-sm text-red-400" role="alert">
          Failed to filter by sector. Showing previous results.
        </div>
      )}

      {/* Results list */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {isPending ? (
          <>
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
            <p className="text-[var(--text-muted)] text-sm">
              No stocks found for this sector.
            </p>
            <button
              onClick={handleResetSector}
              className="text-xs text-[var(--accent)] hover:opacity-80 font-medium transition-opacity"
            >
              Show all sectors
            </button>
          </div>
        ) : (
          <>
            {results.map((result, i) => (
              <StockRow key={result.ticker} result={result} rank={i + 1} />
            ))}

            {/* Free tier upgrade prompt */}
            {tier === 'free' && currentTotal > results.length && (
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--accent)]/5 border-t border-[var(--accent)]/20">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    Showing {results.length} of {currentTotal} stocks
                    {activeSector ? ` in ${activeSector}` : ''}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Upgrade to see all {activeSector ? `${activeSector} ` : 'S&P 500 '}stocks ranked
                  </p>
                </div>
                <Link
                  href="/upgrade"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Upgrade
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
