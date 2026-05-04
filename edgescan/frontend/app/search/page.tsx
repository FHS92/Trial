import SearchClient from './SearchClient'

export const metadata = { title: 'Search — EdgeScan' }

export default function SearchPage() {
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
        <a href="/" className="text-base font-bold" style={{ color: '#4f8ef7' }}>
          Edge<span style={{ color: 'var(--color-text)' }}>Scan</span>
        </a>
        <nav className="flex gap-1">
          <a href="/watchlist" className="px-3 py-1.5 rounded-cell text-xs" style={{ color: 'var(--color-text-2)' }}>Watchlist</a>
        </nav>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>Search S&P 500</h1>
        <SearchClient />
      </main>
    </div>
  )
}
