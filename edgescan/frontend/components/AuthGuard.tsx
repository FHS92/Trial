'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

/**
 * Client-side auth guard: redirects to profile picker if no session token exists.
 * Also opportunistically populates edgescan_profile_id in sessionStorage from
 * /api/profiles/me so that the settings page works for users who logged in before
 * the profile_id was stored locally.
 */
export default function AuthGuard() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token) {
      router.replace('/')
      return
    }

    // Populate profile_id if not already stored (once per session)
    if (!sessionStorage.getItem('edgescan_profile_id')) {
      fetch(`${BASE}/api/profiles/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.id) {
            sessionStorage.setItem('edgescan_profile_id', data.id)
            if (data.themePref) {
              sessionStorage.setItem('edgescan_theme_pref', data.themePref)
            }
          }
        })
        .catch(() => {})
    }

    setChecked(true)
  }, [router])

  if (!checked) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--color-bg)',
          zIndex: 9999,
        }}
      />
    )
  }

  return null
}

