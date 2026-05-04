'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Phase = 'idle' | 'starting' | 'scanning' | 'done'

export default function ScanButton() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const scanStartedAt = useRef<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  async function startScan() {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token) return

    setPhase('starting')
    try {
      const r = await fetch(`${BASE}/api/scan/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await r.json()
      if (data.status === 'already_running') {
        // Treat as if we just started — start polling
      }
    } catch {
      setPhase('idle')
      return
    }

    // Record timestamp so we know when the scan is "new"
    scanStartedAt.current = new Date().toISOString()
    setPhase('scanning')

    // Poll /api/scan/status every 8 s
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${BASE}/api/scan/status`, { cache: 'no-store' })
        const data = await r.json()
        // Scan finished when in_progress=false AND last_scanned_at is after we started
        if (
          !data.in_progress &&
          data.last_scanned_at &&
          scanStartedAt.current &&
          data.last_scanned_at > scanStartedAt.current
        ) {
          stopPolling()
          setPhase('done')
          router.refresh()
          setTimeout(() => setPhase('idle'), 3000)
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 8000)
  }

  if (phase === 'idle') {
    return (
      <button
        onClick={startScan}
        className="flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium transition-colors hover:bg-white/[0.08]"
        style={{
          background: 'rgba(79,142,247,0.1)',
          border: '1px solid rgba(79,142,247,0.25)',
          color: '#4f8ef7',
        }}
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Scan now
      </button>
    )
  }

  if (phase === 'starting') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs" style={{ color: '#6b7a99', border: '1px solid rgba(255,255,255,0.07)' }}>
        <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth={3} />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#4f8ef7" strokeWidth={3} strokeLinecap="round" />
        </svg>
        Starting…
      </span>
    )
  }

  if (phase === 'scanning') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs" style={{ color: '#f5a623', border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(245,166,35,0.08)' }}>
        <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth={3} />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#f5a623" strokeWidth={3} strokeLinecap="round" />
        </svg>
        Scanning…
      </span>
    )
  }

  // done
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs" style={{ color: '#22d47e', border: '1px solid rgba(34,212,126,0.25)', background: 'rgba(34,212,126,0.08)' }}>
      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Done — refreshing
    </span>
  )
}
