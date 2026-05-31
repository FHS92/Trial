export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 animate-pulse">
      {/* Rank */}
      <div className="w-6 h-3 rounded bg-[var(--border)] shrink-0" />
      {/* Ring */}
      <div className="w-10 h-10 rounded-full bg-[var(--border)] shrink-0" />
      {/* Name */}
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 rounded bg-[var(--border)] w-24" />
        <div className="h-2.5 rounded bg-[var(--border)] w-40" />
      </div>
      {/* Sub-scores */}
      <div className="hidden sm:flex flex-col gap-1 items-end shrink-0">
        <div className="h-2.5 rounded bg-[var(--border)] w-10" />
        <div className="h-2.5 rounded bg-[var(--border)] w-10" />
      </div>
      {/* Price */}
      <div className="flex flex-col gap-1 items-end shrink-0">
        <div className="h-3.5 rounded bg-[var(--border)] w-16" />
        <div className="h-2.5 rounded bg-[var(--border)] w-12" />
      </div>
    </div>
  )
}
