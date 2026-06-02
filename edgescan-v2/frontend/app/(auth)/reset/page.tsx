'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function ResetPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const pwMismatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (!token) { setError('Missing reset token. Please use the link from your email.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
        credentials: 'include',
      })
      if (res.ok) {
        setSuccess(true)
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body?.detail ?? body?.error?.message ?? (res.status === 400 ? 'Invalid or expired reset link.' : 'Reset failed. Please try again.'))
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputBase = 'w-full rounded-lg px-4 py-3 text-sm bg-[var(--bg)] border text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 transition-colors'

  if (success) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-12 w-12 rounded-full bg-green-900/30 border border-green-700/40 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Password updated!</h2>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="inline-block text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
      <h1 className="text-xl font-semibold text-[var(--text)] mb-2">Set a new password</h1>
      <p className="text-[var(--text-muted)] text-sm mb-6">Choose a strong password for your account.</p>

      {!token && (
        <div className="mb-4 rounded-lg bg-red-900/20 border border-red-700/40 px-4 py-3 text-sm text-red-400" role="alert">
          Missing reset token. Please use the link from your email.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-900/20 border border-red-700/40 px-4 py-3 text-sm text-red-400" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">New password</label>
          <input
            id="password" type="password" autoComplete="new-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className={`${inputBase} border-[var(--border)] focus:ring-[var(--accent)] focus:border-[var(--accent)]`}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Confirm new password</label>
          <input
            id="confirm" type="password" autoComplete="new-password" required
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            className={`${inputBase} ${pwMismatch ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[var(--border)] focus:ring-[var(--accent)] focus:border-[var(--accent)]'}`}
          />
          {pwMismatch && <p className="mt-1.5 text-xs text-red-400" role="alert">Passwords do not match.</p>}
        </div>
        <button
          type="submit" disabled={loading || !token || pwMismatch}
          className="w-full text-white text-sm font-semibold py-3 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
