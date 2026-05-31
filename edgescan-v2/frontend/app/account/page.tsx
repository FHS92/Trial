import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'

export const metadata = { title: 'Account — EdgeScan' }

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login?callbackUrl=/account')
  }
  return (
    <AccountClient
      user={{
        id: (session.user as any).id ?? '',
        email: session.user.email ?? '',
        name: session.user.name ?? null,
        tier: (session.user as any).tier ?? 'free',
        isAdmin: (session.user as any).is_admin ?? false,
      }}
    />
  )
}
