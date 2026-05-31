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
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-12 w-12 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
        <p className="text-slate-400 text-sm mb-6">
          We&apos;ve sent a verification link to <span className="text-white font-medium">{email}</span>.
          Click the link to activate your account.
        </p>
        <Link
          href="/login"
          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-8">
      <h1 className="text-xl font-semibold text-white mb-6">Create your account</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">
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
            className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
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
            className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
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
            className={`w-full bg-[#0f1117] border rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition-colors ${
              pwError ? 'border-red-500 focus:border-red-500' : 'border-[#2a2d3a] focus:border-indigo-500'
            }`}
          />
          {pwError && (
            <p className="mt-1.5 text-xs text-red-400">{pwError}</p>
          )}
        </div>

        <div className="flex items-start gap-3 pt-1">
          <input
            id="tos"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#2a2d3a] bg-[#0f1117] accent-indigo-500 cursor-pointer"
          />
          <label htmlFor="tos" className="text-sm text-slate-400 cursor-pointer">
            I agree to the{' '}
            <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer">Terms of Service</span>
            {' '}and{' '}
            <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer">Privacy Policy</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !agreed || !!pwError}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
