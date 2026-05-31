'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Status = 'loading' | 'success' | 'error'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided.')
      return
    }

    async function verify() {
      try {
        const res = await fetch(`${API}/api/v1/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          credentials: 'include',
        })
        if (res.ok) {
          setStatus('success')
        } else {
          const body = await res.json().catch(() => ({}))
          setStatus('error')
          setMessage(
            body?.detail ??
            body?.error?.message ??
            (res.status === 400 ? 'Invalid or expired verification link.' : 'Verification failed.')
          )
        }
      } catch {
        setStatus('error')
        setMessage('Network error. Please try again.')
      }
    }

    verify()
  }, [token])

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-8 text-center">
      {status === 'loading' && (
        <>
          <div className="mb-4 flex justify-center">
            <svg
              className="h-8 w-8 animate-spin text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
          <p className="text-slate-300 text-sm">Verifying your email...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Email verified!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your email has been confirmed. You can now sign in to your account.
          </p>
          <Link
            href="/login"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            Sign in
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Verification failed</h2>
          <p className="text-slate-400 text-sm mb-6">{message}</p>
          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
          >
            Back to sign in
          </Link>
        </>
      )}
    </div>
  )
}
