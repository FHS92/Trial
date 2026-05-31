import { cn } from '@/lib/utils'

interface SkeletonCardProps {
  className?: string
  lines?: number
}

export function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 animate-pulse',
        className
      )}
    >
      <div className="h-4 rounded bg-[var(--border)] w-32 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-[var(--border)]"
            style={{ width: `${85 - i * 10}%` }}
          />
        ))}
      </div>
    </div>
  )
}
