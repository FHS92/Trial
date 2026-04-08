'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface Props {
  data: { close: number }[]
  positive?: boolean
}

export default function Sparkline({ data, positive }: Props) {
  if (!data || data.length < 2) {
    return <div className="w-20 h-8" />
  }
  const color = positive ? '#22d47e' : '#f75f5f'
  return (
    <div style={{ width: 80, height: 32 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
