'use client'

import { useEffect, useState } from 'react'

interface Multiple {
  label: string
  key: string
  stock: number | null
  median: number | null
  cheaper: boolean | null
}

interface Data {
  ticker: string
  sector: string
  peer_count: number
  multiples: Multiple[]
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function fmt(v: number | null) {
  if (v === null) return '—'
  return v.toFixed(1) + 'x'
}

export default function IndustryMultiples({ ticker }: { ticker: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`${BASE}/api/stock/${ticker}/industry-multiples`, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(setData)
      .catch(() => setError(true))
  }, [ticker])

  if (error) return null
  if (!data) {
    return (
      <div
        className="rounded-xl p-4 animate-pulse"
        style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)', height: 120 }}
      />
    )
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold" style={{ color: '#6b7a99' }}>
          Valuation vs {data.sector} Peers
        </p>
        <span className="text-xs" style={{ color: '#3a4259' }}>
          {data.peer_count} peers
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid text-xs mb-1 px-1"
        style={{ gridTemplateColumns: '1fr 72px 72px 20px', color: '#4a556b' }}
      >
        <span>Multiple</span>
        <span className="text-right">{ticker}</span>
        <span className="text-right">Sector med.</span>
        <span />
      </div>

      <div className="space-y-1">
        {data.multiples.map(m => {
          const valueColor =
            m.cheaper === true  ? '#22d47e' :
            m.cheaper === false ? '#f75f5f' :
            '#a0aec0'

          return (
            <div
              key={m.key}
              className="grid items-center px-1 py-1.5 rounded-lg text-sm"
              style={{
                gridTemplateColumns: '1fr 72px 72px 20px',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <span className="text-xs" style={{ color: '#8492aa' }}>{m.label}</span>
              <span className="text-right text-xs font-semibold" style={{ color: valueColor }}>
                {fmt(m.stock)}
              </span>
              <span className="text-right text-xs" style={{ color: '#6b7a99' }}>
                {fmt(m.median)}
              </span>
              <span className="text-right text-xs" style={{ color: valueColor }}>
                {m.cheaper === true ? '↓' : m.cheaper === false ? '↑' : ''}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-xs mt-3" style={{ color: '#3a4259' }}>
        Green ↓ = trading cheaper than sector · Red ↑ = trading richer
      </p>
    </div>
  )
}
