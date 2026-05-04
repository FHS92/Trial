import WatchlistClient from './WatchlistClient'

export const metadata = { title: 'Watchlist — EdgeScan' }

export default function WatchlistPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-14"
        style={{
          background: 'var(--color-header)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <a href="/" className="text-base font-bold">
          <span style={{ color: '#4f8ef7' }}>Edge</span>
          <span style={{ color: 'var(--color-text)' }}>Scan</span>
        </a>
        <nav className="flex gap-1">
          <a href="/search" className="px-3 py-1.5 rounded-cell text-xs" style={{ color: 'var(--color-text-2)' }}>Search</a>
        </nav>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Watchlist</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-2)' }}>
          Saved tickers — stored in your browser. No login required.
        </p>
        <WatchlistClient />
      </main>
    </div>
  )
}
