export default function EarningsLoading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="space-y-1">
        <div className="h-7 w-40 rounded bg-[var(--border)] animate-pulse" />
        <div className="h-4 w-64 rounded bg-[var(--border)] animate-pulse" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="h-8 bg-[var(--border)]/30 animate-pulse border-b border-[var(--border)]" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-14 border-b border-[var(--border)] last:border-b-0 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}
