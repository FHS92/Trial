export default function StockLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      <header
        className="h-14"
        style={{ background: 'rgba(8,11,18,0.92)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 w-24 rounded-cell animate-pulse" style={{ background: '#1e2540' }} />
            <div className="h-4 w-40 rounded animate-pulse" style={{ background: '#1e2540' }} />
            <div className="h-6 w-20 rounded animate-pulse" style={{ background: '#1e2540' }} />
          </div>
          <div className="w-16 h-16 rounded-full animate-pulse" style={{ background: '#1e2540' }} />
        </div>
        {/* Banner skeleton */}
        <div className="h-20 rounded-card animate-pulse" style={{ background: '#1e2540' }} />
        {/* Chart skeleton */}
        <div className="h-72 rounded-card animate-pulse" style={{ background: '#0f1420' }} />
        {/* Grid skeleton */}
        <div className="grid grid-cols-3 gap-px rounded-cell overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse" style={{ background: '#0f1420' }} />
          ))}
        </div>
      </main>
    </div>
  )
}
