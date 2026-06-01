import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { SkeletonRow } from '@/components/ui/SkeletonRow'
import { ScannerClient } from './ScannerClient'
import { serverFetch } from '@/lib/api'
import type { ScannerResponse } from '@/lib/types'

async function ScannerContent() {
  const cookieHeader = (await cookies()).getAll().map(c => `${c.name}=${c.value}`).join('; ')

  let data: ScannerResponse
  try {
    data = await serverFetch<ScannerResponse>('/scanner', cookieHeader)
  } catch (err) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Scanner</h1>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-[var(--text-muted)] text-sm mb-1">
            Could not load scanner data.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Make sure the backend is running at{' '}
            <code className="font-mono text-[var(--accent)]">
              {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}
            </code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScannerClient
      initialResults={data.results}
      tier={data.tier}
      totalAvailable={data.total_available}
      asOf={data.last_scanned_at ?? ''}
      dataSource={data.data_source ?? ''}
    />
  )
}

function ScannerSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-1">
        <div className="h-7 w-32 rounded bg-[var(--border)] animate-pulse" />
        <div className="h-4 w-56 rounded bg-[var(--border)] animate-pulse" />
      </div>
      {/* Sector pills skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-[var(--border)] animate-pulse shrink-0" />
        ))}
      </div>
      {/* Rows skeleton */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  )
}

export default function ScannerPage() {
  return (
    <Suspense fallback={<ScannerSkeleton />}>
      <ScannerContent />
    </Suspense>
  )
}
