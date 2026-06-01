import { SkeletonRow } from '@/components/ui/SkeletonRow'

export default function ScannerLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-1">
        <div className="h-7 w-32 rounded bg-[var(--border)] animate-pulse" />
        <div className="h-4 w-56 rounded bg-[var(--border)] animate-pulse" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-[var(--border)] animate-pulse shrink-0" />
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  )
}
