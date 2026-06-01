import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Users, Crown, TrendingUp, Calendar, BarChart2 } from 'lucide-react'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { serverFetch, type AdminStatsResponse, type AdminUsersResponse } from '@/lib/api'

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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
        <div className="h-8 w-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-[var(--accent)]" />
        </div>
      </div>
      <p className="text-3xl font-bold text-[var(--text)] tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
    </div>
  )
}

async function AdminContent() {
  const cookieHeader = (await cookies()).toString()
  const [stats, usersData] = await Promise.all([
    serverFetch<AdminStatsResponse>('/admin/stats', cookieHeader),
    serverFetch<AdminUsersResponse>('/admin/users?per_page=20', cookieHeader),
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
        <StatCard label="Total users" value={stats.total_users} icon={Users} />
        <StatCard
          label="Pro subscribers"
          value={stats.pro_users}
          sub={`${stats.active_subscriptions} active subs`}
          icon={Crown}
        />
        <StatCard label="Free users" value={stats.free_users} icon={Users} />
        <StatCard label="New users (7d)" value={stats.new_users_7d} icon={TrendingUp} />
        <StatCard
          label="Scan rows (DB)"
          value={stats.total_scan_rows.toLocaleString()}
          icon={BarChart2}
        />
        <StatCard
          label="Latest scan"
          value={stats.latest_scan.tickers_scanned}
          sub={latestScanAt}
          icon={Calendar}
        />
      </div>

      {/* User table */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">
          Recent users
          <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
            ({usersData.total} total)
          </span>
        </h2>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--border)]/20">
                  <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Tier</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Plan</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Joined</th>
                </tr>
              </thead>
              <tbody>
                {usersData.users.map(u => (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--border)]/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-[var(--text)] font-mono text-xs truncate max-w-[200px]">
                      {u.email}
                      {u.is_admin && (
                        <span className="ml-1.5 text-xs text-amber-400 font-sans">[admin]</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">
                      {u.name ?? <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          u.tier === 'pro'
                            ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                            : 'bg-[var(--border)] text-[var(--text-muted)]'
                        }`}
                      >
                        {u.tier}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)] text-xs">
                      {u.subscription
                        ? `${u.subscription.plan} · ${u.subscription.status}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)] text-xs tabular-nums">
                      {new Date(u.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usersData.total > usersData.per_page && (
            <div className="px-4 py-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
              Showing {usersData.users.length} of {usersData.total} users
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AdminSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 h-24 animate-pulse" />
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] h-64 animate-pulse" />
    </div>
  )
}

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user?.isAdmin) redirect('/scanner')

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Admin Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Signed in as {user.email}
        </p>
      </div>
      <Suspense fallback={<AdminSkeleton />}>
        <AdminContent />
      </Suspense>
    </div>
  )
}
