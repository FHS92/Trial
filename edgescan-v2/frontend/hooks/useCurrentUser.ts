'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/lib/types'

// STUB — Phase 3 replaces with real session hook
export function useCurrentUser(): { user: User | null; loading: boolean } {
  const [user] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate async session check
    setLoading(false)
  }, [])

  return { user, loading }
}
