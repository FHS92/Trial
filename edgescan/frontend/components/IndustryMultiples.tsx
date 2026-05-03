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
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setErrorMsg(null)
    fetch(`${BASE}/api/stock/${ticker}/industry-multiples`, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setErrorMsg(e.message ?? 'error'); setLoading(false) })
  }, [ticker])

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold" style={{ color: '#6b7a99' }}>
          {data ? `Valuation vs ${data.sector} Peers` : 'Industry Multiples'}
        </p>
        {data && (
          <span className="text-xs" style={{ color: '#3a4259' }}>
            {data.peer_count} peers
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-7 rounded animate-pulse" style={{ background: '#1e2540' }} />
          ))}
        </div>
      )}

      {!loading && errorMsg && (
        <p className="text-xs py-4 text-center" style={{ color: '#4a556b' }}>
          Valuation data unavailable
        </p>
      )}

      {!loading && data && (
        <>
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
            Green ↓ = cheaper than sector · Red ↑ = richer than sector
          </p>
        </>
      )}
    </div>
  )
}
