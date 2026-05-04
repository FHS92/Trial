'use client'

import { useState } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const AVATAR_COLOURS = [
  '#4F8EF7',
  '#22d47e',
  '#f75f5f',
  '#f5a623',
  '#9b59b6',
  '#1abc9c',
]

interface Props {
  onSuccess: (token: string, profileName: string) => void
  onClose: () => void
}

export default function NewProfileModal({ onSuccess, onClose }: Props) {
  const [name, setName] = useState('')
  const [addPin, setAddPin] = useState(false)
  const [pin, setPin] = useState('')
  const [colour, setColour] = useState(AVATAR_COLOURS[0])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      // 1. Create profile
      const createRes = await fetch(`${BASE}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          pin: addPin && pin ? pin : undefined,
          avatarColour: colour,
        }),
      })
      if (!createRes.ok) {
        setError('Failed to create profile. Please try again.')
        return
      }
      const profile = await createRes.json()

      // 2. Auto-unlock
      const unlockRes = await fetch(`${BASE}/api/profiles/${profile.id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addPin && pin ? { pin } : {}),
      })
      if (!unlockRes.ok) {
        setError('Profile created but could not unlock automatically. Please go back.')
        return
      }
      const unlockData = await unlockRes.json()
      onSuccess(unlockData.token, profile.name)
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
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-2)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>New Profile</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-colors hover:bg-white/[0.08]"
            style={{ color: 'var(--color-text-2)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-2)' }}>Name</label>
            <input
              autoFocus
              type="text"
              maxLength={64}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Alice"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: '#131720',
                border: '1px solid var(--color-border-2)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Avatar colour */}
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--color-text-2)' }}>Avatar colour</label>
            <div className="flex gap-2">
              {AVATAR_COLOURS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColour(c)}
                  className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{
                    width: '30px',
                    height: '30px',
                    background: c,
                    outline: colour === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  {colour === c && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* PIN toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addPin}
                onChange={e => { setAddPin(e.target.checked); if (!e.target.checked) setPin('') }}
                className="rounded"
              />
              <span className="text-sm" style={{ color: '#a0aec0' }}>Add PIN protection</span>
            </label>
          </div>

          {/* PIN input */}
          {addPin && (
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-2)' }}>PIN (up to 6 digits)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: '#131720',
                  border: '1px solid var(--color-border-2)',
                  color: 'var(--color-text)',
                  letterSpacing: '0.3em',
                }}
              />
            </div>
          )}

          {error && (
            <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || submitting || (addPin && pin.length === 0)}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ background: '#4f8ef7', color: '#fff' }}
          >
            {submitting ? 'Creating…' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
