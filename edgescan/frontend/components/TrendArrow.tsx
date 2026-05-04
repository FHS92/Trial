interface Props {
  delta: number | null
}

export default function TrendArrow({ delta }: Props) {
  if (delta === null) return <span style={{ width: 16, display: 'inline-block' }} />

  if (delta > 3) {
    return (
      <span className="text-xs font-bold" style={{ color: '#22d47e' }} title={`Score up ${delta} pts`}>
        ↑
      </span>
    )
  }
  if (delta < -3) {
    return (
      <span className="text-xs font-bold" style={{ color: '#f75f5f' }} title={`Score down ${Math.abs(delta)} pts`}>
        ↓
      </span>
    )
  }
  return (
    <span className="text-xs" style={{ color: '#4a556b' }} title={`Score change ${delta > 0 ? '+' : ''}${delta} pts`}>
      →
    </span>
  )
}
