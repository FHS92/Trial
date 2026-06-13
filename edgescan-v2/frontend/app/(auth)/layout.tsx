import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--bg)]">

      {/* Atmospheric background */}
      <div className="absolute inset-0 dot-grid opacity-60 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute -top-48 -right-48 h-[500px] w-[500px] rounded-full opacity-[0.07] pointer-events-none animate-blob"
        style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-48 -left-48 h-[400px] w-[400px] rounded-full opacity-[0.05] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #10b981, transparent 70%)',
          animationDelay: '3s',
          animation: 'blob 9s infinite',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[900px] mx-auto px-4 py-12 flex flex-col md:flex-row items-center gap-12 md:gap-20">

        {/* Left: branding + tagline (desktop only) */}
        <div className="hidden md:flex flex-col gap-6 flex-1 min-w-0">
          <Link href="/" className="inline-flex items-center gap-3 group w-fit">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
              style={{ background: 'var(--pro-gradient)' }}
            >
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-[var(--text)]">
              EdgeScan
            </span>
          </Link>

          <div>
            <h2 className="text-3xl font-bold leading-snug mb-3 text-gradient">
              The edge that<br />moves markets
            </h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-xs">
              AI-powered ranking of all 500 S&P stocks — fundamental + technical scores updated three times daily.
            </p>
          </div>

          {/* Mini feature pills */}
          <div className="flex flex-col gap-2.5 mt-2">
            {[
              '500 stocks ranked by composite score',
              'AI-generated "Why Now" thesis per stock',
              'Technical signals + score history',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5">
                <div
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
                <span className="text-sm text-[var(--text-muted)]">{feat}</span>
              </div>
            ))}
          </div>

          {/* Score demo ring preview */}
          <div
            className="mt-4 rounded-2xl border border-[var(--border)] p-5 max-w-xs"
            style={{ background: 'var(--surface-elevated)' }}
          >
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
              Top pick today
            </p>
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center h-14 w-14 shrink-0">
                <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="28" cy="28" r="22" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#22c55e" strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="121 138"
                  />
                </svg>
                <span className="absolute text-sm font-bold tabular-nums" style={{ color: '#22c55e' }}>87</span>
              </div>
              <div>
                <p className="font-bold text-[var(--text)] tracking-tight">NVDA</p>
                <p className="text-xs text-[var(--text-muted)]">NVIDIA Corporation</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: '#22c55e' }}>+18.4% upside</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="w-full max-w-md flex flex-col gap-6">
          {/* Mobile logo */}
          <div className="flex md:hidden items-center justify-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md"
                style={{ background: 'var(--pro-gradient)' }}
              >
                <TrendingUp className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-[var(--text)]">EdgeScan</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
