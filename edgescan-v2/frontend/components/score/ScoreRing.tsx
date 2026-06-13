'use client'

import { getScoreColor } from '@/lib/utils'

interface ScoreRingProps {
  score: number
  size?: number
  showLabel?: boolean
  strokeWidth?: number
}

export function ScoreRing({
  score,
  size = 52,
  showLabel = false,
  strokeWidth = 4,
}: ScoreRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (Math.min(100, Math.max(0, score)) / 100)
  const dash = `${fill} ${circ}`
  const color = getScoreColor(score)
  const isLarge = size >= 100

  const fontSize =
    size >= 100 ? 28 : size >= 60 ? 18 : size >= 44 ? 13 : 10

  const sw = isLarge ? Math.max(strokeWidth, 6) : strokeWidth

  return (
    <div
      className="relative flex flex-col items-center gap-1"
      style={{ width: size }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
          className={isLarge ? 'animate-score-glow' : undefined}
          aria-label={`Score: ${score}`}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={sw}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset={0}
            style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <span
          className="absolute font-bold tabular-nums leading-none"
          style={{ color, fontSize }}
        >
          {score}
        </span>
      </div>
      {showLabel && (
        <span className="text-xs font-semibold tracking-wide uppercase" style={{ color }}>
          {score >= 80 ? 'Strong' : score >= 60 ? 'Moderate' : 'Weak'}
        </span>
      )}
    </div>
  )
}
