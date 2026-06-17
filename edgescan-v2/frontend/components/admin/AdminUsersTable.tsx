'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronLeft, ChevronRight, Crown } from 'lucide-react'
import { api, type AdminUsersResponse, type AdminUserRow } from '@/lib/api'

type TierFilter = 'all' | 'pro' | 'free'

export function AdminUsersTable({ initial }: { initial: AdminUsersResponse }) {
  const [data, setData] = useState(initial)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refetch = useCallback(async (q: string, tier: TierFilter, pg: number) => {
    setLoading(true)
    try {
      const res = await api.admin.users({
        page: pg,
        per_page: 20,
        search: q || undefined,
        tier: tier === 'all' ? undefined : tier,
      })
      setData(res)
    } catch { /* swallow — data stays stale */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => refetch(search, tierFilter, page), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search, tierFilter, page, refetch])

  function handleSearch(v: string) { setSearch(v); setPage(1) }
  function handleTier(t: TierFilter) { setTierFilter(t); setPage(1) }

  async function toggleTier(user: AdminUserRow) {
    const newTier = user.tier === 'pro' ? 'free' : 'pro'
    const action = newTier === 'pro' ? 'promote to Pro' : 'demote to Free'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user? This does not affect their Stripe subscription.`)) return
    setUpdatingId(user.id)
    try {
      await api.admin.updateUser(user.id, { tier: newTier as 'free' | 'pro' })
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === user.id ? { ...u, tier: newTier } : u),
      }))
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update tier.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by email…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-[var(--radius)] border border-[var(--border)] p-0.5 shrink-0">
          {(['all', 'pro', 'free'] as TierFilter[]).map(t => (
            <button
              key={t}
              onClick={() => handleTier(t)}
              className={`px-3 py-1 text-xs font-semibold rounded-[calc(var(--radius)-2px)] transition-colors capitalize ${
                tierFilter === t
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--text-muted)] sm:ml-auto shrink-0">
          {data.total.toLocaleString()} user{data.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border border-[var(--border)] overflow-hidden transition-opacity"
        style={{ background: 'var(--surface)', opacity: loading ? 0.65 : 1 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]" style={{ background: 'color-mix(in srgb, var(--border) 20%, transparent)' }}>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Email / Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Tier</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Plan</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Joined</th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-muted)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-xs text-[var(--text-muted)]">
                    No users found.
                  </td>
                </tr>
              ) : (
                data.users.map(u => (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--border)] last:border-b-0 transition-colors"
                    style={{ ':hover': { background: 'color-mix(in srgb, var(--border) 10%, transparent)' } } as React.CSSProperties}
                    onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--border) 10%, transparent)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-[var(--text)] truncate max-w-[180px]">{u.email}</span>
                        {u.is_admin && <span className="text-[10px] font-bold text-amber-400 shrink-0">[admin]</span>}
                      </div>
                      {u.name && <p className="text-xs text-[var(--text-muted)] mt-0.5">{u.name}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          u.tier === 'pro'
                            ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                            : 'bg-[var(--border)] text-[var(--text-muted)]'
                        }`}
                      >
                        {u.tier === 'pro' && <Crown className="h-2.5 w-2.5" />}
                        {u.tier}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                      {u.subscription
                        ? `${u.subscription.plan} · ${u.subscription.status}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] tabular-nums">
                      {new Date(u.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!u.is_admin && (
                        <button
                          onClick={() => toggleTier(u)}
                          disabled={updatingId === u.id}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] border transition-colors disabled:opacity-50 ${
                            u.tier === 'pro'
                              ? 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                              : 'border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/10'
                          }`}
                        >
                          {updatingId === u.id ? '…' : u.tier === 'pro' ? 'Demote' : 'Promote'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pages > 1 && (
          <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Page {data.page} of {data.pages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1 rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages || loading}
                className="p-1 rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
