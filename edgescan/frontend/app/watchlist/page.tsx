import WatchlistClient from './WatchlistClient'

export const metadata = { title: 'Watchlist — EdgeScan' }

export default function WatchlistPage() {
  return (
    <div className="min-h-screen" style={{ background: '#080b12' }}>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-14"
        style={{
          background: 'rgba(8,11,18,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <a href="/" className="text-base font-bold">
          <span style={{ color: '#4f8ef7' }}>Edge</span>
          <span style={{ color: '#e2e8f8' }}>Scan</span>
        </a>
        <nav className="flex gap-1">
          <a href="/search" className="px-3 py-1.5 rounded-cell text-xs" style={{ color: '#6b7a99' }}>Search</a>
        </nav>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold mb-2" style={{ color: '#e2e8f8' }}>Watchlist</h1>
        <p className="text-sm mb-6" style={{ color: '#6b7a99' }}>
          Saved tickers — stored in your browser. No login required.
        </p>
        <WatchlistClient />
      </main>
    </div>
  )
}
