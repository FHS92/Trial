import type { User } from './types'

// STUB — Phase 3 replaces with real Auth.js v5 session
export async function getCurrentUser(): Promise<User | null> {
  return null // anonymous for now
}

export function useRequireAuth() {
  // Phase 3 will redirect to /login if not authenticated
}
