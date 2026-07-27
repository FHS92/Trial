'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Phase = 'idle' | 'starting' | 'scanning' | 'done' | 'error'

export default function ScanButton() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const scanStartedAt = useRef<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const missedPolls = useRef(0)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  async function startScan() {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token) return

    setPhase('starting')
    setErrorMsg(null)
    setProgress(null)
    try {
      const r = await fetch(`${BASE}/api/scan/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setErrorMsg(body.detail ?? `Couldn't start scan (server error ${r.status}).`)
        setPhase('error')
        return
      }
      await r.json()
    } catch {
      setErrorMsg('Network error — could not reach the server.')
      setPhase('error')
      return
    }

    // Record timestamp so we know when the scan is "new"
    scanStartedAt.current = new Date().toISOString()
    setPhase('scanning')
    missedPolls.current = 0

    // Poll /api/scan/status every 3 s for live progress
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${BASE}/api/scan/status`, { cache: 'no-store' })
        if (!r.ok) throw new Error(String(r.status))
        const data = await r.json()
        missedPolls.current = 0

        if (typeof data.tickers_done === 'number' && typeof data.total_tickers === 'number') {
          setProgress({ done: data.tickers_done, total: data.total_tickers })
        }

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
          setTimeout(() => { setPhase('idle'); setProgress(null) }, 3000)
        }
      } catch {
        // network hiccup — keep polling a few times before giving up
        missedPolls.current += 1
        if (missedPolls.current >= 10) {
          stopPolling()
          setErrorMsg('Lost connection while checking scan progress.')
          setPhase('error')
        }
      }
    }, 3000)
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
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs" style={{ color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>
        <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="var(--color-border-3)" strokeWidth={3} />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#4f8ef7" strokeWidth={3} strokeLinecap="round" />
        </svg>
        Starting…
      </span>
    )
  }

  if (phase === 'scanning') {
    const pct = progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : null

    return (
      <span
        className="flex items-center gap-2 px-3 py-1 rounded-pill text-xs"
        style={{ color: '#f5a623', border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(245,166,35,0.08)' }}
      >
        <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="var(--color-border-3)" strokeWidth={3} />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#f5a623" strokeWidth={3} strokeLinecap="round" />
        </svg>
        {pct !== null ? (
          <>
            <span className="tabular-nums">Scanning… {pct}%</span>
            <span
              className="relative h-1 rounded-full overflow-hidden"
              style={{ width: '48px', background: 'rgba(245,166,35,0.2)' }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: '#f5a623' }}
              />
            </span>
            <span className="tabular-nums" style={{ color: 'var(--color-text-3)' }}>
              {progress!.done}/{progress!.total}
            </span>
          </>
        ) : (
          <span>Scanning…</span>
        )}
      </span>
    )
  }

  if (phase === 'error') {
    return (
      <button
        onClick={startScan}
        title={errorMsg ?? 'Scan failed'}
        className="flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium transition-colors hover:bg-white/[0.08]"
        style={{ color: '#f75f5f', border: '1px solid rgba(247,95,95,0.3)', background: 'rgba(247,95,95,0.08)' }}
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        {errorMsg ?? 'Scan failed'} — retry
      </button>
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
