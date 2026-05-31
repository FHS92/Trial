import { auth } from '@/auth'
import type { Session } from 'next-auth'

export async function getSession(): Promise<Session | null> {
  return auth()
}

export async function getCurrentUser() {
  try {
    const session = await getSession()
    if (!session?.user) return null
    return {
      id: (session.user as any).id ?? '',
      email: session.user.email ?? '',
      name: session.user.name ?? null,
      tier: ((session.user as any).tier ?? 'free') as import('./types').Tier,
      isAdmin: (session.user as any).is_admin ?? false,
    }
  } catch {
    return null
  }
}
