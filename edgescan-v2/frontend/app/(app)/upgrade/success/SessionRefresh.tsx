'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

/**
 * Silently triggers a NextAuth session refresh when the upgrade success page
 * loads, so the user's tier is updated to 'pro' without requiring a re-login.
 */
export function SessionRefresh() {
  const { update } = useSession()

  useEffect(() => {
    // Small delay to allow Stripe webhook to process and backend tier to update
    const timer = setTimeout(() => {
      update()
    }, 1500)
    return () => clearTimeout(timer)
  }, [update])

  return null
}
