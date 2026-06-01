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
  const [isPending, startTransition] = useTransition()

  const handleSectorChange = (sector: string | undefined) => {
    startTransition(async () => {
      try {
        const data = await api.scanner.list({ sector })
        setResults(data.results)
      } catch {
        // Keep existing results on error
      }
    })
  }

  const formattedDate = asOf
    ? new Date(asOf).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'unknown'

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Scanner</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Updated {formattedDate} &middot; {dataSource}
        </p>
      </div>

      {/* Sector filter */}
      <SectorFilter onSectorChange={handleSectorChange} />

      {/* Results list */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {isPending ? (
          <>
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-[var(--text-muted)] text-sm">
              No results for this sector — try All
            </p>
          </div>
        ) : (
          <>
            {results.map((result, i) => (
              <StockRow key={result.ticker} result={result} rank={i + 1} />
            ))}

            {/* Free tier upgrade prompt */}
            {tier === 'free' && totalAvailable > results.length && (
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--accent)]/5 border-t border-[var(--accent)]/20">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    Showing {results.length} of {totalAvailable} stocks
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Upgrade to see all S&P 500 stocks ranked
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
