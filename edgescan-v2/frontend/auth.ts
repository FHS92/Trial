import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'

const API = process.env.API_URL ?? 'http://localhost:8000'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        try {
          const res = await fetch(`${API}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          })
          if (!res.ok) return null
          const user = await res.json()
          return { id: String(user.id), email: user.email, name: user.name, tier: user.tier, is_admin: user.is_admin, has_onboarded: user.has_onboarded }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-ins, upsert the user in our FastAPI DB and copy tier/role back
      if (account?.provider === 'google') {
        try {
          const res = await fetch(`${API}/api/v1/auth/google-upsert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '',
            },
            body: JSON.stringify({
              google_id: account.providerAccountId,
              email: user.email,
              name: user.name,
              avatar_url: user.image,
            }),
          })
          if (res.ok) {
            const dbUser = await res.json()
            ;(user as any).id = String(dbUser.id)
            ;(user as any).tier = dbUser.tier
            ;(user as any).is_admin = dbUser.is_admin
            ;(user as any).has_onboarded = dbUser.has_onboarded
          }
        } catch { /* non-fatal */ }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id ?? user.id
        token.tier = (user as any).tier ?? 'free'
        token.is_admin = (user as any).is_admin ?? false
        token.has_onboarded = (user as any).has_onboarded ?? false
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as any).tier = token.tier ?? 'free'
        ;(session.user as any).is_admin = token.is_admin ?? false
        ;(session.user as any).has_onboarded = token.has_onboarded ?? false
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
