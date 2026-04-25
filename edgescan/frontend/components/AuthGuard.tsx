'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Client-side auth guard: redirects to profile picker if no session token exists.
 * Render this near the top of any page that requires a profile to be selected.
 */
export default function AuthGuard() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('edgescan_profile_token')
      if (!token) {
        router.replace('/')
      }
    }
  }, [router])

  return null
}
