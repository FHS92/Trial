'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      {status === 'loading' && (
        <>
          <div className="mb-4 flex justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          </div>
          <p className="text-[var(--text-muted)] text-sm">Verifying your email…</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mb-4 flex justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Email verified!</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">
            Your email has been confirmed. You can now sign in to your account.
          </p>
          <Link
            href="/login"
            className="inline-block text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Sign in
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mb-4 flex justify-center">
            <XCircle className="h-12 w-12 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Verification failed</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">{message}</p>
          <Link
            href="/login"
            className="text-[var(--accent)] hover:opacity-80 text-sm font-medium transition-opacity"
          >
            Back to sign in
          </Link>
        </>
      )}
    </div>
  )
}
