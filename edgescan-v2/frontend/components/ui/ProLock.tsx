import { Lock } from 'lucide-react'
import Link from 'next/link'

interface ProLockProps {
  benefit: string
  children: React.ReactNode
}

export function ProLock({ benefit, children }: ProLockProps) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Blurred content */}
      <div className="pro-blur select-none pointer-events-none" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 bg-[var(--surface)]/80 backdrop-blur-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30">
          <Lock className="h-5 w-5 text-[var(--accent)]" />
        </div>

        <p className="text-sm text-center text-[var(--text)] font-medium max-w-xs leading-snug">
          {benefit}
        </p>

        <Link
          href="/upgrade"
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Start free trial
        </Link>
      </div>
    </div>
  )
}
