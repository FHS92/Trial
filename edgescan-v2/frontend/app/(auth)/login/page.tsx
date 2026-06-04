'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const rawCallback = searchParams.get('callbackUrl') ?? '/scanner'
  const callbackUrl = rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/scanner'
  const errorParam = searchParams.get('error')

  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isVerifyError, setIsVerifyError] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam ? 'Sign-in failed. Please check your credentials.' : null
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn('credentials', {
      email,
      password,
      redirectTo: callbackUrl,
      redirect: false,
    })
    if (res?.error) {
      // Auth.js wraps error codes — check for email-not-verified pattern
      const errMsg = res.error ?? ''
      if (errMsg.includes('EMAIL_NOT_VERIFIED') || errMsg.includes('verify')) {
        setIsVerifyError(true)
        setError('Please verify your email address before signing in.')
      } else {
        setIsVerifyError(false)
        setError('Invalid email or password.')
      }
      setLoading(false)
    }
    if (res?.ok && !res?.error) {
      router.push(callbackUrl)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    await signIn('google', { redirectTo: callbackUrl })
  }

  const inputClass = [
    'w-full rounded-lg px-4 py-3 text-sm',
    'bg-[var(--bg)] border border-[var(--border)]',
    'text-[var(--text)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)]',
    'transition-colors',
  ].join(' ')

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
      <h1 className="text-xl font-semibold text-[var(--text)] mb-6">Sign in to EdgeScan</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/20 border border-red-700/40 px-4 py-3 text-sm text-red-400" role="alert">
          {error}
          {isVerifyError && (
            <span> Check your inbox (and spam folder) for the verification link.</span>
          )}
        </div>
      )}

      {/* Google Sign-in */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border border-[var(--border)] hover:border-[var(--accent)]/50 text-[var(--text)] text-sm font-medium py-3 rounded-lg transition-colors mb-6 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        Continue with Google
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs text-[var(--text-muted)] uppercase">
          <span className="bg-[var(--surface)] px-3">or sign in with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-muted)]">
              Password
            </label>
            <Link href="/forgot" className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full text-white text-sm font-semibold py-3 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[var(--accent)] hover:opacity-80 font-medium transition-opacity">
          Sign up
        </Link>
      </p>
    </div>
  )
}
