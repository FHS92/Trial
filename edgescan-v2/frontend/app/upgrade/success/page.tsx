import Link from 'next/link'
import { CheckCircle, Crown } from 'lucide-react'
import { auth } from '@/auth'

export const metadata = { title: 'Welcome to Pro — EdgeScan' }

export default async function UpgradeSuccessPage() {
  const session = await auth()
  const name = session?.user?.name ?? session?.user?.email ?? 'there'

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <CheckCircle className="h-16 w-16 text-green-400" />
            <div className="absolute -top-1 -right-1 bg-[var(--accent)] rounded-full p-1">
              <Crown className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Welcome to Pro, {typeof name === 'string' ? name.split(' ')[0] : 'there'}!
        </h1>
        <p className="text-[var(--text-muted)] mb-8 leading-relaxed">
          Your subscription is active. You now have access to AI trade theses, technical signals, and score history across the full S&amp;P 500.
        </p>

        <div className="space-y-3 mb-8">
          <Link
            href="/scanner"
            className="block w-full rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Open the Scanner
          </Link>
          <Link
            href="/account"
            className="block w-full rounded-lg px-6 py-3 text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:border-slate-500 transition-colors"
          >
            Manage billing &amp; account
          </Link>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          A confirmation receipt has been sent to your email by Stripe.
        </p>
      </div>
    </div>
  )
}
