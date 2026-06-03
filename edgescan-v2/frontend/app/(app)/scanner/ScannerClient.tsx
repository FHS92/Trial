'use client'

import { useState, useTransition } from 'react'
import { ArrowRight, Lock } from 'lucide-react'
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

  const lockedCount = tier === 'free' && currentTotal > results.length
    ? currentTotal - results.length
    : 0

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Sticky free-tier banner */}
      {tier === 'free' && currentTotal > results.length && (
        <div className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 py-2.5 bg-[var(--surface)] border-b border-[var(--accent)]/20 flex items-center justify-between gap-3 backdrop-blur-sm">
          <p className="text-xs text-[var(--text)]">
            <span className="font-semibold">Viewing {results.length} of {currentTotal} stocks</span>
            <span className="text-[var(--text-muted)] hidden sm:inline"> — Upgrade to unlock all S&P 500 ranked</span>
          </p>
          <Link
            href="/upgrade"
            className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Upgrade
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

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

            {/* Free tier — blurred rows 11-15 with unlock overlay */}
            {lockedCount > 0 && (
              <div className="relative">
                {[11, 12, 13, 14, 15].map((n) => (
                  <div
                    key={n}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 blur-sm select-none"
                    aria-hidden="true"
                  >
                    <span className="w-6 text-right text-xs font-mono text-[var(--text-muted)]">{n}</span>
                    <div className="h-10 w-10 rounded-full bg-[var(--border)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-14 rounded bg-[var(--border)]" />
                      <div className="h-2 w-28 rounded bg-[var(--border)]" />
                    </div>
                    <div className="hidden sm:block h-4 w-12 rounded bg-[var(--border)]" />
                    <div className="h-4 w-16 rounded bg-[var(--border)]" />
                  </div>
                ))}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 bg-[var(--surface)]/85 backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30">
                    <Lock className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text)] text-center">
                    Unlock {lockedCount} more stocks
                  </p>
                  <p className="text-xs text-[var(--text-muted)] text-center max-w-xs">
                    Pro subscribers see all {currentTotal} S&P 500 stocks ranked — with AI thesis for every pick
                  </p>
                  <Link
                    href="/upgrade"
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    Upgrade to Pro
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
