'use client'

import { useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function ForgotPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${API}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      })
    } catch {
      // Swallow errors — always show success to prevent email enumeration
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-12 w-12 rounded-full bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-center">
            <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Check your inbox</h2>
        <p className="text-slate-400 text-sm mb-6">
          If an account with that email exists, we&apos;ve sent a password reset link.
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
      <h1 className="text-xl font-semibold text-white mb-2">Reset your password</h1>
      <p className="text-slate-400 text-sm mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Remembered it?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
