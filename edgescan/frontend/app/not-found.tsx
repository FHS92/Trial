import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#080b12' }}>
      <p className="text-5xl font-bold mb-3" style={{ color: '#1e2540' }}>404</p>
      <p className="text-lg font-semibold mb-1" style={{ color: '#e2e8f8' }}>Stock not found</p>
      <p className="text-sm mb-6" style={{ color: '#6b7a99' }}>
        This ticker may not be in the S&P 500 or the backend is offline.
      </p>
      <Link
        href="/"
        className="px-5 py-2 rounded-pill text-sm font-medium transition-colors hover:opacity-80"
        style={{ background: '#4f8ef7', color: '#fff' }}
      >
        Back to Scanner
      </Link>
    </div>
  )
}
