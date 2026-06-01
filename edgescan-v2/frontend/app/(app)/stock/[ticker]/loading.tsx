import { SkeletonCard } from '@/components/ui/SkeletonCard'

export default function StockLoading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="h-5 w-32 rounded bg-[var(--border)] animate-pulse" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-9 w-24 rounded bg-[var(--border)] animate-pulse" />
          <div className="h-4 w-48 rounded bg-[var(--border)] animate-pulse" />
          <div className="h-8 w-32 rounded bg-[var(--border)] animate-pulse" />
        </div>
        <div className="h-28 w-28 rounded-full bg-[var(--border)] animate-pulse shrink-0" />
      </div>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
