'use client'

import { useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  function validatePassword(val: string) {
    if (val.length > 0 && val.length < 8) {
      setPwError('Password must be at least 8 characters.')
    } else {
      setPwError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setPwError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.detail ?? body?.error?.message ?? 'Registration failed.')
      }
      setSuccess(true)
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const inputBase = [
    'w-full rounded-[var(--radius)] px-4 py-3 text-sm',
    'bg-[var(--bg)] border border-[var(--border)]',
    'text-[var(--text)] placeholder:text-[var(--text-subtle)]',
    'focus:outline-none focus:border-[var(--accent)]',
    'focus:shadow-[0_0_0_3px_var(--accent-glow)]',
    'transition-all duration-200',
  ].join(' ')

  if (success) {
    return (
      <div
        className="rounded-[var(--radius-xl)] border border-[var(--border)] p-8 text-center shadow-[var(--shadow-lg)]"
        style={{ background: 'var(--surface)' }}
      >
        <div className="mb-5 flex justify-center">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.35)' }}
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="#22c55e" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Check your email</h2>
        <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
          We&apos;ve sent a verification link to{' '}
          <span className="font-semibold text-[var(--text)]">{email}</span>.
          Click it to activate your account.
        </p>
        <Link
          href="/login"
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent)' }}
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div
      className="rounded-[var(--radius-xl)] border border-[var(--border)] p-8 shadow-[var(--shadow-lg)]"
      style={{ background: 'var(--surface)' }}
    >
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">Create your account</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Free forever — upgrade when you&apos;re ready</p>
      </div>

      {error && (
        <div
          className="mb-5 rounded-[var(--radius)] border px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
            Display name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className={inputBase}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputBase}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              validatePassword(e.target.value)
            }}
            placeholder="Min. 8 characters"
            className={`${inputBase}${pwError ? ' !border-red-500 focus:!border-red-500 !shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
          />
          {pwError && (
            <p className="mt-1.5 text-xs text-red-400" role="alert">{pwError}</p>
          )}
        </div>

        <div className="flex items-start gap-3 pt-1">
          <input
            id="tos"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded cursor-pointer accent-[var(--accent)]"
          />
          <label htmlFor="tos" className="text-sm text-[var(--text-muted)] cursor-pointer leading-relaxed">
            I agree to the{' '}
            <Link href="/legal#terms" className="font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/legal#privacy" className="font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              Privacy Policy
            </Link>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !agreed || !!pwError}
          className="pro-button w-full text-white text-sm font-semibold py-3 rounded-[var(--radius)] mt-1 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {loading ? 'Creating account…' : 'Create free account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent)' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
