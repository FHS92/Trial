export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)] last:border-b-0 animate-pulse">
      <div className="w-5 h-3 rounded-full shrink-0" style={{ background: 'var(--surface-elevated)' }} />
      <div className="w-10 h-10 rounded-full shrink-0" style={{ background: 'var(--surface-elevated)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded-full w-20" style={{ background: 'var(--surface-elevated)' }} />
        <div className="h-2 rounded-full w-36" style={{ background: 'var(--border)' }} />
      </div>
      <div className="hidden sm:flex flex-col gap-1.5 items-end shrink-0">
        <div className="h-2 rounded-full w-10" style={{ background: 'var(--border)' }} />
        <div className="h-2 rounded-full w-10" style={{ background: 'var(--border)' }} />
      </div>
      <div className="flex flex-col gap-1.5 items-end shrink-0">
        <div className="h-3 rounded-full w-16" style={{ background: 'var(--surface-elevated)' }} />
        <div className="h-2 rounded-full w-10" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  )
}
