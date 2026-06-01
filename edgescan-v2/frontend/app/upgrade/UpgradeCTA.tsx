'use client'

import { useState } from 'react'
import { Zap, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'

interface Props {
  plan: 'monthly' | 'annual'
  label?: string
}

export function UpgradeCTA({ plan, label }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const { url } = await api.billing.createCheckout(plan)
      window.location.href = url
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('You already have an active Pro subscription.')
      } else if (err instanceof ApiError && err.status === 401) {
        window.location.href = '/login?callbackUrl=/upgrade'
      } else {
        setError('Unable to start checkout. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
        {loading ? 'Redirecting to checkout…' : (label ?? 'Upgrade to Pro')}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  )
}
