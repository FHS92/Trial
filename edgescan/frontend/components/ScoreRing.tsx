'use client'

interface Props {
  score: number
  size?: number
  strokeWidth?: number
}

export default function ScoreRing({ score, size = 52, strokeWidth = 4 }: Props) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (score / 100)
  const dash = `${fill} ${circ}`

  const color =
    score >= 80 ? '#22d47e' :
    score >= 60 ? '#f5a623' :
    '#f75f5f'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
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
        className="absolute text-xs font-semibold"
        style={{ color, fontSize: size < 44 ? 10 : 12 }}
      >
        {score}
      </span>
    </div>
  )
}
