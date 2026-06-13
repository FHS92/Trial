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
      }
    })
  }

  const handleResetSector = () => handleSectorChange(undefined)

  const formattedDate = asOf
    ? new Date(asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'unknown'

  const dataSourceLabel = dataSource && dataSource !== 'unknown' ? ` · ${dataSource}` : ''

  const lockedCount = tier === 'free' && currentTotal > results.length
    ? currentTotal - results.length
    : 0

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Sticky free-tier banner */}
      {tier === 'free' && currentTotal > results.length && (
        <div
          className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 py-2.5 flex items-center justify-between gap-3 backdrop-blur-md border-b border-[var(--accent)]/15"
          style={{ background: 'rgba(17,17,24,0.85)' }}
        >
          <p className="text-xs text-[var(--text)]">
            <span className="font-semibold">Viewing {results.length} of {currentTotal} stocks</span>
            <span className="text-[var(--text-muted)] hidden sm:inline"> — Upgrade to unlock all S&P 500 ranked</span>
          </p>
          <Link
            href="/upgrade"
            className="pro-button shrink-0 flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
          >
            Upgrade
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gradient">Scanner</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="animate-live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <p className="text-xs text-[var(--text-muted)]">
              Updated {formattedDate}{dataSourceLabel}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right hidden sm:block">
          <p className="text-xs text-[var(--text-subtle)]">
            {tier === 'free' ? `${results.length} stocks visible` : `All ${currentTotal} ranked`}
          </p>
        </div>
      </div>

      {/* Sector filter */}
      <SectorFilter onSectorChange={handleSectorChange} currentSector={activeSector} />

      {/* Filter error */}
      {filterError && (
        <div
          className="rounded-[var(--radius)] border px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}
          role="alert"
        >
          Failed to filter by sector. Showing previous results.
        </div>
      )}

      {/* Results */}
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-sm)]"
        style={{ background: 'var(--surface)' }}
      >
        {isPending ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
            <p className="text-[var(--text-muted)] text-sm">No stocks found for this sector.</p>
            <button
              onClick={handleResetSector}
              className="text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)' }}
            >
              Show all sectors
            </button>
          </div>
        ) : (
          <>
            {results.map((result, i) => (
              <StockRow key={result.ticker} result={result} rank={i + 1} />
            ))}

            {/* Free tier locked rows */}
            {lockedCount > 0 && (
              <div className="relative">
                {[11, 12, 13, 14, 15].map((n) => (
                  <div
                    key={n}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 blur-sm select-none"
                    aria-hidden="true"
                  >
                    <span className="w-6 text-right text-xs font-mono text-[var(--text-subtle)]">{n}</span>
                    <div className="h-10 w-10 rounded-full bg-[var(--border)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-14 rounded-full bg-[var(--border)]" />
                      <div className="h-2 w-28 rounded-full bg-[var(--border)]" />
                    </div>
                    <div className="hidden sm:block h-4 w-12 rounded bg-[var(--border)]" />
                    <div className="h-4 w-16 rounded bg-[var(--border)]" />
                  </div>
                ))}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6"
                  style={{ background: 'linear-gradient(to bottom, transparent, rgba(17,17,24,0.96) 30%)' }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full border"
                    style={{ background: 'var(--accent-light)', borderColor: 'var(--accent-glow)' }}
                  >
                    <Lock className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-[var(--text)]">
                      Unlock {lockedCount} more stocks
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
                      Pro subscribers see all {currentTotal} S&P 500 stocks — with AI thesis for every pick
                    </p>
                  </div>
                  <Link
                    href="/upgrade"
                    className="pro-button flex items-center gap-1.5 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white shadow-md"
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
