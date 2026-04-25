'use client'

import { useState } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Props {
  profileId: string
  profileName: string
  onSuccess: (token: string) => void
  onClose: () => void
}

export default function PinModal({ profileId, profileName, onSuccess, onClose }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/api/profiles/${profileId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (res.ok) {
        const data = await res.json()
        onSuccess(data.token)
      } else if (res.status === 401) {
        setError('Incorrect PIN, try again')
        setPin('')
      } else {
        setError('Something went wrong, please try again')
      }
    } catch {
      setError('Network error, please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#e2e8f8' }}>Enter PIN</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b7a99' }}>{profileName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-colors hover:bg-white/[0.08]"
            style={{ color: '#6b7a99' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(null) }}
            placeholder="••••••"
            className="w-full px-4 py-3 rounded-xl text-center text-xl tracking-widest outline-none"
            style={{
              background: '#131720',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: '#e2e8f8',
              letterSpacing: '0.4em',
            }}
          />

          {error && (
            <p className="text-xs text-center" style={{ color: '#ef4444' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length === 0 || submitting}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ background: '#4f8ef7', color: '#fff' }}
          >
            {submitting ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}
