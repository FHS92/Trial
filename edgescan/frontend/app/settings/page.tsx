'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const AVATAR_COLOURS = [
  '#4F8EF7', '#22d47e', '#f75f5f', '#f5a623',
  '#9b59b6', '#1abc9c', '#e67e22', '#e91e8c',
  '#00bcd4', '#8bc34a', '#ff5722', '#607d8b',
]

const AVATAR_EMOJIS = [
  '🦁', '🐯', '🦊', '🐺', '🦝', '🐼', '🐨', '🦄',
  '🐸', '🐉', '🦅', '🦈', '🐙', '🦋', '🦩', '🐬',
  '🤖', '👾', '🧙', '🥷', '👻', '🦸', '🎭', '🧛',
  '🔥', '⚡', '💎', '🌊', '🎯', '🏆', '🎮', '🚀',
]

interface ProfileData {
  id: string
  name: string
  avatarColour: string
  avatarEmoji: string | null
  themePref: string
  hasPin: boolean
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--color-text-3)' }}>
        {title}
      </p>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({
  label, sublabel, children, last = false,
}: {
  label: string; sublabel?: string; children?: React.ReactNode; last?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3.5 gap-4"
      style={{
        background: 'var(--color-card)',
        borderBottom: last ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</p>
        {sublabel && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-3)' }}>{sublabel}</p>}
      </div>
      {children}
    </div>
  )
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium shadow-lg z-50"
      style={{ background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: ok ? '#22c55e' : '#ef4444', border: `1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}
    >
      {msg}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Editable fields
  const [name, setName]             = useState('')
  const [colour, setColour]         = useState('#4F8EF7')
  const [emoji, setEmoji]           = useState<string | null>(null)
  const [theme, setTheme]           = useState<'dark' | 'light'>('dark')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // PIN
  const [pinSection, setPinSection] = useState<'view' | 'set' | 'change' | 'remove'>('view')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin]         = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Saving
  const [saving, setSaving] = useState(false)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token) { router.replace('/'); return }

    fetch(`${BASE}/api/profiles/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(r => {
        if (r.status === 401) { router.replace('/'); return null }
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((p: ProfileData | null) => {
        if (!p) return
        sessionStorage.setItem('edgescan_profile_id', p.id)
        setProfile(p)
        setName(p.name)
        setColour(p.avatarColour)
        setEmoji(p.avatarEmoji)
        setTheme((p.themePref as 'dark' | 'light') ?? 'dark')
      })
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false))
  }, [router])

  async function saveIdentity() {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token || !profile) return
    setSaving(true)
    try {
      const res = await fetch(`${BASE}/api/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), avatarColour: colour, avatarEmoji: emoji }),
      })
      if (!res.ok) throw new Error()
      sessionStorage.setItem('edgescan_profile_name', name.trim())
      setProfile(p => p ? { ...p, name: name.trim(), avatarColour: colour, avatarEmoji: emoji } : p)
      showToast('Profile saved')
    } catch {
      showToast('Failed to save', false)
    } finally {
      setSaving(false)
    }
  }

  async function saveTheme(next: 'dark' | 'light') {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token || !profile) return
    setTheme(next)
    if (next === 'light') {
      document.documentElement.classList.add('light')
      localStorage.setItem('edgescan_theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      localStorage.setItem('edgescan_theme', 'dark')
    }
    try {
      await fetch(`${BASE}/api/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ themePref: next }),
      })
    } catch {
      // non-fatal, local state is already updated
    }
  }

  async function savePin() {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token || !profile) return
    if (newPin !== confirmPin) { showToast('PINs do not match', false); return }
    if (newPin.length < 4) { showToast('PIN must be 4–6 digits', false); return }
    setPinLoading(true)
    try {
      const res = await fetch(`${BASE}/api/profiles/${profile.id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPin: pinSection === 'change' ? currentPin : undefined,
          newPin,
        }),
      })
      if (res.status === 401) { showToast('Current PIN is incorrect', false); return }
      if (!res.ok) throw new Error()
      setProfile(p => p ? { ...p, hasPin: true } : p)
      setPinSection('view')
      setCurrentPin(''); setNewPin(''); setConfirmPin('')
      showToast(pinSection === 'change' ? 'PIN updated' : 'PIN set')
    } catch {
      showToast('Failed to update PIN', false)
    } finally {
      setPinLoading(false)
    }
  }

  async function removePin() {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token || !profile) return
    setPinLoading(true)
    try {
      const res = await fetch(`${BASE}/api/profiles/${profile.id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPin, newPin: null }),
      })
      if (res.status === 401) { showToast('Current PIN is incorrect', false); return }
      if (!res.ok) throw new Error()
      setProfile(p => p ? { ...p, hasPin: false } : p)
      setPinSection('view')
      setCurrentPin('')
      showToast('PIN removed')
    } catch {
      showToast('Failed to remove PIN', false)
    } finally {
      setPinLoading(false)
    }
  }

  async function clearWatchlist() {
    const token = sessionStorage.getItem('edgescan_profile_token')
    const profileId = sessionStorage.getItem('edgescan_profile_id')
    if (!token || !profileId) return
    if (!confirm('Clear your entire watchlist? This cannot be undone.')) return
    try {
      const res = await fetch(`${BASE}/api/profiles/${profileId}/watchlist`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      showToast('Watchlist cleared')
    } catch {
      showToast('Failed to clear watchlist', false)
    }
  }

  async function deleteProfile() {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token || !profile) return
    if (!confirm(`Delete profile "${profile.name}"? All holdings and watchlist data will be permanently removed.`)) return
    try {
      const res = await fetch(`${BASE}/api/profiles/${profile.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      sessionStorage.removeItem('edgescan_profile_token')
      sessionStorage.removeItem('edgescan_profile_name')
      sessionStorage.removeItem('edgescan_profile_id')
      router.replace('/')
    } catch {
      showToast('Failed to delete profile', false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-text-2)' }}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
    )
  }

  if (!profile) return null

  const avatarDisplay = emoji ?? name.charAt(0).toUpperCase()
  const identityChanged = name.trim() !== profile.name || colour !== profile.avatarColour || emoji !== profile.avatarEmoji

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 h-14"
        style={{ background: 'var(--color-header)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}
      >
        <Link href="/scanner" className="flex items-center gap-1 text-sm transition-colors hover:opacity-80" style={{ color: 'var(--color-text-2)' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <span style={{ color: 'var(--color-border-3)' }}>/</span>
        <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Settings</span>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-6">

        {/* Profile header card */}
        <div
          className="flex items-center gap-4 px-5 py-4 rounded-2xl mb-6"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div
            className="rounded-full flex items-center justify-center font-bold shrink-0"
            style={{ width: 56, height: 56, background: colour, color: '#fff', fontSize: emoji ? 28 : 22 }}
          >
            {avatarDisplay}
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{name || profile.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-3)' }}>
              {profile.hasPin ? 'PIN protected' : 'No PIN'} · {theme} mode
            </p>
          </div>
        </div>

        {/* ── Section 1: Profile Identity ── */}
        <Section title="Profile Identity">
          {/* Name */}
          <Row label="Display name" sublabel="Shown on leaderboard and scanner">
            <input
              type="text"
              maxLength={64}
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-sm text-right outline-none bg-transparent w-32"
              style={{ color: 'var(--color-text)' }}
            />
          </Row>

          {/* Avatar colour */}
          <Row label="Avatar colour">
            <div className="flex gap-1.5 flex-wrap justify-end" style={{ maxWidth: 180 }}>
              {AVATAR_COLOURS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColour(c)}
                  className="rounded-full transition-transform hover:scale-110"
                  style={{
                    width: 22, height: 22, background: c, flexShrink: 0,
                    outline: colour === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </Row>

          {/* Avatar emoji */}
          <Row label="Avatar character" sublabel={emoji ? `Selected: ${emoji}` : 'Letter initial (default)'} last>
            <button
              onClick={() => setShowEmojiPicker(v => !v)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:brightness-110"
              style={{ background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}
            >
              {emoji ? 'Change' : 'Pick emoji'}
            </button>
          </Row>
        </Section>

        {/* Emoji picker panel */}
        {showEmojiPicker && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-2)' }}>Choose your character</p>
              <button
                onClick={() => { setEmoji(null); setShowEmojiPicker(false) }}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: 'var(--color-border)', color: 'var(--color-text-2)' }}
              >
                Use initial
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {AVATAR_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { setEmoji(e); setShowEmojiPicker(false) }}
                  className="flex items-center justify-center rounded-xl transition-all hover:scale-110"
                  style={{
                    width: '100%', aspectRatio: '1', fontSize: 22,
                    background: emoji === e ? 'rgba(79,142,247,0.15)' : 'var(--color-border)',
                    outline: emoji === e ? '2px solid #4f8ef7' : 'none',
                    outlineOffset: 1,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save identity button — only show when changed */}
        {identityChanged && (
          <button
            onClick={saveIdentity}
            disabled={saving || !name.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold mb-6 transition-opacity disabled:opacity-40"
            style={{ background: '#4f8ef7', color: '#fff' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}

        {/* ── Section 2: PIN Management ── */}
        <Section title="Security">
          {pinSection === 'view' && (
            <>
              <Row label="PIN protection" sublabel={profile.hasPin ? 'Active — required to unlock profile' : 'Not set — anyone can access this profile'}>
                {profile.hasPin ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPinSection('change')}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}
                    >
                      Change
                    </button>
                    <button
                      onClick={() => setPinSection('remove')}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPinSection('set')}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}
                  >
                    Set PIN
                  </button>
                )}
              </Row>
            </>
          )}

          {(pinSection === 'set' || pinSection === 'change') && (
            <div className="px-4 py-4" style={{ background: 'var(--color-card)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                {pinSection === 'change' ? 'Change PIN' : 'Set a PIN'}
              </p>
              <div className="space-y-3">
                {pinSection === 'change' && (
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--color-text-2)' }}>Current PIN</label>
                    <input
                      type="password" inputMode="numeric" maxLength={6}
                      value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-2)', color: 'var(--color-text)', letterSpacing: '0.3em' }}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-2)' }}>New PIN (4–6 digits)</label>
                  <input
                    type="password" inputMode="numeric" maxLength={6}
                    value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-2)', color: 'var(--color-text)', letterSpacing: '0.3em' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-2)' }}>Confirm PIN</label>
                  <input
                    type="password" inputMode="numeric" maxLength={6}
                    value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-2)', color: 'var(--color-text)', letterSpacing: '0.3em' }}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setPinSection('view'); setCurrentPin(''); setNewPin(''); setConfirmPin('') }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--color-border)', color: 'var(--color-text-2)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePin}
                    disabled={pinLoading || newPin.length < 4 || newPin !== confirmPin || (pinSection === 'change' && !currentPin)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                    style={{ background: '#4f8ef7', color: '#fff' }}
                  >
                    {pinLoading ? 'Saving…' : pinSection === 'change' ? 'Update PIN' : 'Set PIN'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {pinSection === 'remove' && (
            <div className="px-4 py-4" style={{ background: 'var(--color-card)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Remove PIN</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-2)' }}>Current PIN to confirm</label>
                  <input
                    type="password" inputMode="numeric" maxLength={6}
                    value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-2)', color: 'var(--color-text)', letterSpacing: '0.3em' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPinSection('view'); setCurrentPin('') }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--color-border)', color: 'var(--color-text-2)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={removePin}
                    disabled={pinLoading || !currentPin}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    {pinLoading ? 'Removing…' : 'Remove PIN'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ── Section 3: Appearance ── */}
        <Section title="Appearance">
          <Row label="Theme" sublabel="Saved to your profile" last>
            <div
              className="flex gap-1 p-1 rounded-xl"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            >
              {(['dark', 'light'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => saveTheme(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: theme === t ? '#4f8ef7' : 'transparent',
                    color: theme === t ? '#fff' : 'var(--color-text-2)',
                  }}
                >
                  {t === 'dark' ? (
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M18.364 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
                    </svg>
                  )}
                  {t === 'dark' ? 'Dark' : 'Light'}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* ── Section 4: Danger Zone ── */}
        <Section title="Danger Zone">
          <Row label="Clear watchlist" sublabel="Remove all tickers from your watchlist">
            <button
              onClick={clearWatchlist}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:brightness-110"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              Clear
            </button>
          </Row>

          <Row label="Delete profile" sublabel="Permanently removes your profile, portfolio, and watchlist" last>
            <button
              onClick={deleteProfile}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:brightness-110"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              Delete
            </button>
          </Row>
        </Section>

      </main>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}
