import { Lock } from 'lucide-react'
import Link from 'next/link'

interface ProLockProps {
  benefit: string
  children: React.ReactNode
}

export function ProLock({ benefit, children }: ProLockProps) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)]">
      {/* Blurred content */}
      <div className="pro-blur select-none pointer-events-none" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 p-6 backdrop-blur-sm"
        style={{ background: 'linear-gradient(135deg, rgba(17,17,24,0.82) 0%, rgba(16,185,129,0.06) 100%)' }}
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full border"
          style={{ background: 'var(--accent-light)', borderColor: 'var(--accent-glow)' }}
        >
          <Lock className="h-5 w-5" style={{ color: 'var(--accent)' }} />
        </div>

        <p className="text-sm text-center text-[var(--text)] font-semibold max-w-xs leading-snug">
          {benefit}
        </p>

        <Link
          href="/upgrade"
          className="pro-button inline-flex items-center gap-1.5 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white shadow-md"
        >
          Unlock with Pro
        </Link>
      </div>
    </div>
  )
}
