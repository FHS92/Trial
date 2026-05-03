interface Props {
  data: { close: number }[]
  positive?: boolean
}

export default function Sparkline({ data, positive }: Props) {
  if (!data || data.length < 2) {
    return <div style={{ width: 80, height: 32 }} />
  }

  const color = positive ? '#22d47e' : '#f75f5f'
  const W = 80
  const H = 32
  const PAD = 2

  const closes = data.map(d => d.close)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const range = max - min || 1

  const points = closes
    .map((c, i) => {
      const x = PAD + (i / (closes.length - 1)) * (W - PAD * 2)
      const y = PAD + (1 - (c - min) / range) * (H - PAD * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
