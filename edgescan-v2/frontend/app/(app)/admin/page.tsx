import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Users, Crown, TrendingUp, Calendar, BarChart2, Percent } from 'lucide-react'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import {
  serverFetch,
  type AdminStatsResponse,
  type AdminUsersResponse,
  type AdminScanHistoryResponse,
} from '@/lib/api'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import { AdminScanCard } from '@/components/admin/AdminScanCard'

export const metadata = { title: 'Admin — EdgeScan' }

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--surface)' }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}>
          <Icon className="h-4 w-4 text-[var(--accent)]" />
        </div>
      </div>
      <p className="text-3xl font-bold text-[var(--text)] tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
    </div>
  )
}

async function AdminContent() {
  const currentUser = await getCurrentUser()
  const cookieHeader = (await cookies()).getAll().map(c => `${c.name}=${c.value}`).join('; ')

  const [stats, usersData, scanHistory] = await Promise.all([
    serverFetch<AdminStatsResponse>('/admin/stats', cookieHeader, undefined, currentUser),
    serverFetch<AdminUsersResponse>('/admin/users?per_page=20', cookieHeader, undefined, currentUser),
    serverFetch<AdminScanHistoryResponse>('/admin/scan/history?limit=8', cookieHeader, undefined, currentUser),
  ])

  const latestScanAt = stats.latest_scan.started_at
    ? new Date(stats.latest_scan.started_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : 'No scan yet'

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total users" value={stats.total_users.toLocaleString()} icon={Users} />
        <StatCard
          label="Pro subscribers"
          value={stats.pro_users.toLocaleString()}
          sub={`${stats.active_subscriptions} active subscription${stats.active_subscriptions !== 1 ? 's' : ''}`}
          icon={Crown}
        />
        <StatCard label="Free users" value={stats.free_users.toLocaleString()} icon={Users} />
        <StatCard
          label="New signups"
          value={stats.new_users_7d}
          sub={`${stats.new_users_30d} in last 30 days`}
          icon={TrendingUp}
        />
        <StatCard
          label="Conversion rate"
          value={`${stats.conversion_rate}%`}
          sub="free → pro"
          icon={Percent}
        />
        <StatCard
          label="Latest scan"
          value={stats.latest_scan.tickers_scanned.toLocaleString()}
          sub={latestScanAt}
          icon={Calendar}
        />
      </div>

      {/* Users table */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">
          Users
          <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
            ({usersData.total.toLocaleString()} total)
          </span>
        </h2>
        <AdminUsersTable initial={usersData} />
      </div>

      {/* Scan management */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Scan operations</h2>
        <AdminScanCard initial={scanHistory.runs} />
      </div>
    </div>
  )
}

function AdminSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] p-5 h-24 animate-pulse" style={{ background: 'var(--surface)' }} />
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] h-72 animate-pulse" style={{ background: 'var(--surface)' }} />
      <div className="rounded-xl border border-[var(--border)] h-40 animate-pulse" style={{ background: 'var(--surface)' }} />
    </div>
  )
}

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user?.isAdmin) redirect('/scanner')

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-gradient">Admin Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Signed in as {user.email}</p>
      </div>
      <Suspense fallback={<AdminSkeleton />}>
        <AdminContent />
      </Suspense>
    </div>
  )
}
