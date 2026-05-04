export default function StockLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <header
        className="h-14"
        style={{ background: 'var(--color-header)', borderBottom: '1px solid var(--color-border)' }}
      />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 w-24 rounded-cell animate-pulse" style={{ background: 'var(--surf3)' }} />
            <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'var(--surf3)' }} />
            <div className="h-6 w-20 rounded animate-pulse" style={{ background: 'var(--surf3)' }} />
          </div>
          <div className="w-16 h-16 rounded-full animate-pulse" style={{ background: 'var(--surf3)' }} />
        </div>
        {/* Banner skeleton */}
        <div className="h-20 rounded-card animate-pulse" style={{ background: 'var(--surf3)' }} />
        {/* Chart skeleton */}
        <div className="h-72 rounded-card animate-pulse" style={{ background: 'var(--color-card)' }} />
        {/* Grid skeleton */}
        <div className="grid grid-cols-3 gap-px rounded-cell overflow-hidden" style={{ background: 'var(--color-border)' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse" style={{ background: 'var(--color-card)' }} />
          ))}
        </div>
      </main>
    </div>
  )
}
