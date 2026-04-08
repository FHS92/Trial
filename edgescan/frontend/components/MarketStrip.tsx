'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { MarketPulse } from '@/lib/types'

function fmt(n: number | null, decimals = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-pill"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-xs" style={{ color: '#6b7a99' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: '#e2e8f8' }}>{value}</span>
    </div>
  )
}

export default function MarketStrip() {
  const [pulse, setPulse] = useState<MarketPulse | null>(null)

  useEffect(() => {
    api.marketPulse().then(setPulse).catch(() => {})
    const id = setInterval(() => api.marketPulse().then(setPulse).catch(() => {}), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  if (!pulse) {
    return (
      <div className="flex gap-2">
        {['SPX', 'VIX', '10Y'].map(l => (
          <div key={l} className="h-6 w-20 rounded-pill animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Chip label="SPX" value={fmt(pulse.spx, 0)} />
      <Chip label="VIX" value={fmt(pulse.vix)} />
      <Chip label="10Y" value={pulse.ten_year_yield != null ? `${fmt(pulse.ten_year_yield, 2)}%` : '—'} />
    </div>
  )
}
