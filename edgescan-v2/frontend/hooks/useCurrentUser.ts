'use client'
import { useSession } from 'next-auth/react'

export function useCurrentUser() {
  const { data: session, status } = useSession()
  const user = session?.user ?? null
  return {
    user: user
      ? {
          id: (user as any).id ?? '',
          email: user.email ?? '',
          name: user.name ?? null,
          tier: ((user as any).tier ?? 'free') as 'free' | 'pro',
          isAdmin: (user as any).is_admin ?? false,
        }
      : null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  }
}
