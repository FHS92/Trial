export default function DashboardLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="h-14" style={{ borderBottom: '1px solid var(--color-border)' }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="h-6 w-40 rounded animate-pulse mb-2" style={{ background: 'var(--surf3)' }} />
        <div className="h-4 w-56 rounded animate-pulse mb-6" style={{ background: 'var(--surf3)' }} />
        <div className="flex gap-2 mb-5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-7 w-20 rounded-pill animate-pulse" style={{ background: 'var(--surf3)' }} />
          ))}
        </div>
        <div className="rounded-card overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="w-6 h-4 rounded animate-pulse" style={{ background: 'var(--surf3)' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-16 rounded animate-pulse" style={{ background: 'var(--surf3)' }} />
                <div className="h-3 w-32 rounded animate-pulse" style={{ background: 'var(--surf3)' }} />
              </div>
              <div className="hidden md:block w-20 h-8 rounded animate-pulse" style={{ background: 'var(--surf3)' }} />
              <div className="w-16 h-8 rounded animate-pulse" style={{ background: 'var(--surf3)' }} />
              <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: 'var(--surf3)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
