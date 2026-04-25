'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Client-side auth guard: redirects to profile picker if no session token exists.
 * Renders a blank screen while the check is in progress to prevent flashing
 * protected content before the redirect fires.
 */
export default function AuthGuard() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token) {
      router.replace('/')
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) {
    // Render an opaque screen so no protected content is visible while
    // the auth check and potential redirect are in flight.
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#080b12',
          zIndex: 9999,
        }}
      />
    )
  }

  return null
}
