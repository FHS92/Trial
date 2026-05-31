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

  const fontSize =
    size >= 100 ? 28 : size >= 60 ? 18 : size >= 44 ? 13 : 10

  return (
    <div
      className="relative flex flex-col items-center gap-1"
      style={{ width: size }}
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
          aria-label={`Score: ${score}`}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset={0}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <span
          className="absolute font-semibold tabular-nums leading-none"
          style={{ color, fontSize }}
        >
          {score}
        </span>
      </div>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color }}>
          {score >= 80 ? 'Strong' : score >= 60 ? 'Moderate' : 'Weak'}
        </span>
      )}
    </div>
  )
}
