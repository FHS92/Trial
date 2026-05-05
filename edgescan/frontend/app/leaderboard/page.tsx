'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const BADGE_META: Record<string, { emoji: string; label: string; desc: string }> = {
  crown:   { emoji: '👑', label: 'Overall #1',           desc: 'Highest total return since cost basis' },
  weekly:  { emoji: '⚡', label: 'Weekly Champion',      desc: 'Best 7-day return % this week' },
  monthly: { emoji: '🥇', label: 'Monthly Champion',     desc: 'Best 30-day return % this month' },
  rocket:  { emoji: '🚀', label: 'Biggest Weekly Mover', desc: 'Largest $ gain in the last 7 days' },
}

type TimeWindow = 'alltime' | 'weekly' | 'monthly'

const WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: 'alltime', label: 'All time' },
  { key: 'weekly',  label: '7 days' },
  { key: 'monthly', label: '30 days' },
]

interface Entry {
  profile_id: string
  name: string
  avatar_colour: string
  avatar_emoji: string | null
  total_value: number
  total_cost: number
  return_pct: number
  weekly_return_pct: number
  monthly_return_pct: number
  n_holdings: number
  rank: number
  badges: string[]
  is_me: boolean
}

interface RankedEntry extends Entry {
  display_rank: number
  display_pct: number
}

interface LeaderboardData {
  entries: Entry[]
  updated_at: string
}

interface HoldingItem {
  ticker: string
  name: string | null
  shares: number
  avg_price: number
  cost_basis: number
  current_price: number | null
  current_value: number | null
  pnl: number | null
  pnl_pct: number | null
}

interface ProfileHoldings {
  profile_id: string
  holdings: HoldingItem[]
  total_cost: number
  total_value: number
  total_pnl: number | null
  total_pnl_pct: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtDollar(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${n < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}K`
  return `${n < 0 ? '-$' : '$'}${abs.toFixed(0)}`
}

function pctColor(pct: number) {
  return pct > 0 ? '#22c55e' : pct < 0 ? '#ef4444' : 'var(--color-text-2)'
}

function ReturnPct({ pct, className = '' }: { pct: number; className?: string }) {
  return (
    <span className={`font-bold ${className}`} style={{ color: pctColor(pct) }}>
      {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
    </span>
  )
}

function rankEntries(entries: Entry[], window: TimeWindow): RankedEntry[] {
  const sortKey: keyof Entry =
    window === 'weekly'  ? 'weekly_return_pct' :
    window === 'monthly' ? 'monthly_return_pct' :
    'return_pct'

  return [...entries]
    .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))
    .map((e, i) => ({
      ...e,
      display_rank: i + 1,
      display_pct:  e[sortKey] as number,
    }))
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, colour, emoji, size = 48 }: { name: string; colour: string; emoji?: string | null; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: colour || '#4F8EF7',
        color: '#fff',
        fontSize: emoji ? Math.round(size * 0.5) : Math.round(size * 0.38),
        flexShrink: 0,
      }}
    >
      {emoji ?? name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Badge chip ───────────────────────────────────────────────────────────────

function BadgeChip({ badgeKey, small }: { badgeKey: string; small?: boolean }) {
  const meta = BADGE_META[badgeKey]
  if (!meta) return null
  return (
    <span
      title={`${meta.label}: ${meta.desc}`}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs"
      style={{
        background: 'var(--color-border)',
        border: '1px solid var(--color-border-2)',
        fontSize: small ? 10 : 11,
        color: '#a0aec0',
      }}
    >
      <span style={{ fontSize: small ? 11 : 13 }}>{meta.emoji}</span>
      {!small && <span className="hidden sm:inline">{meta.label}</span>}
    </span>
  )
}

// ─── Time window tab bar ──────────────────────────────────────────────────────

function WindowTabs({ active, onChange }: { active: TimeWindow; onChange: (w: TimeWindow) => void }) {
  return (
    <div
      className="flex gap-1 p-1 rounded-xl mb-4"
      style={{ background: '#0d1220', border: '1px solid var(--color-border)' }}
    >
      {WINDOWS.map(({ key, label }) => {
        const isActive = key === active
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: isActive ? '#4f8ef7' : 'transparent',
              color: isActive ? '#fff' : 'var(--color-text-2)',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ─── "How it works" strip ────────────────────────────────────────────────────

function HowItWorks({ updatedAt }: { updatedAt: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-xl mb-4"
      style={{ background: '#0d1220', border: '1px solid var(--color-border)' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs"
        style={{ color: 'var(--color-text-2)' }}
      >
        <span className="flex items-center gap-1.5">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
          </svg>
          How rankings are calculated
        </span>
        <svg
          width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 text-xs" style={{ color: '#8492aa' }}>
          <div className="pt-1 pb-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="font-semibold mb-1" style={{ color: '#a0aec0' }}>All-time return %</p>
            <p>( Current portfolio value − Amount invested ) ÷ Amount invested</p>
            <p className="mt-1" style={{ color: '#4a556b' }}>
              Prices are from the last EdgeScan scan · updated {timeAgo(updatedAt)}
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1" style={{ color: '#a0aec0' }}>7-day & 30-day return</p>
            <p>Compares each holding's current price to its price 7 or 30 days ago in the scan history. Weighted by position size.</p>
          </div>

          <div>
            <p className="font-semibold mb-2" style={{ color: '#a0aec0' }}>Badges</p>
            <div className="space-y-1.5">
              {Object.values(BADGE_META).map(m => (
                <div key={m.label} className="flex items-start gap-2">
                  <span style={{ fontSize: 14, lineHeight: 1.4 }}>{m.emoji}</span>
                  <span><span style={{ color: '#c0cce0' }}>{m.label}</span> — {m.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Holdings modal ───────────────────────────────────────────────────────────

function HoldingsModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const [holdings, setHoldings] = useState<ProfileHoldings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token) return
    fetch(`${BASE}/api/leaderboard/profile/${entry.profile_id}/holdings`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => setHoldings(d))
      .catch(() => setError('Could not load holdings'))
      .finally(() => setLoading(false))
  }, [entry.profile_id])

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-2)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4"
          style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <Avatar name={entry.name} colour={entry.avatar_colour} emoji={entry.avatar_emoji} size={36} />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{entry.name}</p>
              <div className="flex items-center gap-1.5">
                <ReturnPct pct={entry.return_pct} className="text-xs" />
                <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>overall</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full"
            style={{ width: 32, height: 32, background: 'var(--color-border)', color: 'var(--color-text-2)' }}
            aria-label="Close"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {loading && (
            <div className="flex justify-center items-center gap-2 py-10" style={{ color: 'var(--color-text-2)' }}>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <span className="text-sm">Loading holdings…</span>
            </div>
          )}

          {error && <p className="text-sm text-center py-8" style={{ color: '#ef4444' }}>{error}</p>}

          {!loading && !error && holdings && (
            <>
              {holdings.total_pnl !== null && (
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                >
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>Invested</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{fmtDollar(holdings.total_cost)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>Current value</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{fmtDollar(holdings.total_value)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>Gain / Loss</p>
                    <p className="text-sm font-semibold" style={{ color: pctColor(holdings.total_pnl) }}>
                      {holdings.total_pnl >= 0 ? '+' : ''}{fmtDollar(holdings.total_pnl)}
                      {holdings.total_pnl_pct !== null && (
                        <span className="text-xs ml-1" style={{ color: pctColor(holdings.total_pnl_pct) }}>
                          ({holdings.total_pnl_pct >= 0 ? '+' : ''}{holdings.total_pnl_pct.toFixed(1)}%)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {holdings.holdings.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-2)' }}>No holdings yet.</p>
              ) : (
                <div className="space-y-2">
                  {holdings.holdings.map(h => {
                    const weight = holdings.total_value > 0 && h.current_value
                      ? (h.current_value / holdings.total_value) * 100
                      : null
                    return (
                      <div
                        key={h.ticker}
                        className="px-4 py-3 rounded-xl"
                        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{h.ticker}</span>
                              {weight !== null && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}>
                                  {weight.toFixed(0)}%
                                </span>
                              )}
                            </div>
                            {h.name && (
                              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-2)' }}>{h.name}</p>
                            )}
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
                              {h.shares.toFixed(2)} sh · avg ${h.avg_price.toFixed(2)}
                              {h.current_price !== null && <span> → ${h.current_price.toFixed(2)}</span>}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            {h.current_value !== null ? (
                              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{fmtDollar(h.current_value)}</p>
                            ) : (
                              <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>—</p>
                            )}
                            {h.pnl !== null && h.pnl_pct !== null && (
                              <p className="text-xs mt-0.5" style={{ color: pctColor(h.pnl) }}>
                                {h.pnl >= 0 ? '+' : ''}{fmtDollar(h.pnl)} ({h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct.toFixed(1)}%)
                              </p>
                            )}
                          </div>
                        </div>

                        {weight !== null && (
                          <div className="mt-2 h-1 rounded-full" style={{ background: 'var(--color-border)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(weight, 100)}%`, background: '#4f8ef7' }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Podium ───────────────────────────────────────────────────────────────────

const PODIUM_ORDER       = [1, 0, 2]
const PODIUM_HEIGHT      = [72, 108, 52]
const PODIUM_MEDAL_COLOR = ['#9ca3af', '#f59e0b', '#b45212']
const PODIUM_GLOW        = ['rgba(156,163,175,0.15)', 'rgba(245,158,11,0.18)', 'rgba(180,82,18,0.15)']

function Podium({
  entries,
  onSelect,
  window: win,
  myProfileId,
}: {
  entries: RankedEntry[]
  onSelect: (e: Entry) => void
  window: TimeWindow
  myProfileId?: string
}) {
  const windowLabel = win === 'weekly' ? '7d' : win === 'monthly' ? '30d' : null

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 mb-4 pt-4">
      {PODIUM_ORDER.map((entryIdx, posIdx) => {
        const entry = entries[entryIdx]
        if (!entry) return <div key={posIdx} style={{ width: 80 }} />
        const pedH   = PODIUM_HEIGHT[posIdx]
        const medal  = PODIUM_MEDAL_COLOR[posIdx]
        const glow   = PODIUM_GLOW[posIdx]
        const isTop  = posIdx === 1
        const gain   = entry.total_value - entry.total_cost
        const showVs = myProfileId && myProfileId !== entry.profile_id

        return (
          <div
            key={entry.profile_id}
            className="flex flex-col items-center"
            style={{ width: isTop ? 96 : 80 }}
          >
            {/* Clickable avatar / info area */}
            <button
              className="flex flex-col items-center cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] w-full"
              style={{ background: 'none', border: 'none', padding: 0 }}
              onClick={() => onSelect(entry)}
              aria-label={`View ${entry.name}'s portfolio`}
            >
              {/* Badges */}
              <div className="flex gap-0.5 justify-center mb-1 flex-wrap">
                {entry.badges.map(b => (
                  <span key={b} title={`${BADGE_META[b]?.label}: ${BADGE_META[b]?.desc}`} style={{ fontSize: isTop ? 17 : 14 }}>
                    {BADGE_META[b]?.emoji}
                  </span>
                ))}
              </div>

              {/* Avatar */}
              <div className="relative mb-1">
                <Avatar name={entry.name} colour={entry.avatar_colour} emoji={entry.avatar_emoji} size={isTop ? 64 : 50} />
                {isTop && (
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ boxShadow: `0 0 28px 6px ${entry.avatar_colour}66`, borderRadius: '50%', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
                  />
                )}
                {entry.is_me && (
                  <div className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center"
                    style={{ width: 18, height: 18, background: '#4f8ef7', fontSize: 8, color: '#fff', fontWeight: 700 }}>
                    YOU
                  </div>
                )}
              </div>

              {/* Name */}
              <p className="text-center font-semibold truncate w-full mb-0.5"
                style={{ color: 'var(--color-text)', fontSize: isTop ? 13 : 11 }}>
                {entry.name}
              </p>

              {/* Primary return % for active window */}
              {windowLabel && (
                <p className="text-xs mb-0.5" style={{ color: '#4a556b' }}>{windowLabel}</p>
              )}
              <ReturnPct pct={entry.display_pct} className={isTop ? 'text-sm' : 'text-xs'} />

              {/* Always show $ gain (all-time) as secondary */}
              {win === 'alltime' && (
                <p className="text-xs mt-0.5" style={{ color: gain >= 0 ? '#22c55e88' : '#ef444488' }}>
                  {gain >= 0 ? '+' : ''}{fmtDollar(gain)}
                </p>
              )}
            </button>

            {/* VS button */}
            {showVs && (
              <Link
                href={`/leaderboard/vs/${myProfileId}/${entry.profile_id}`}
                className="mt-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors hover:brightness-110"
                style={{ background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}
                title={`Compare you vs ${entry.name}`}
              >
                VS
              </Link>
            )}

            {/* Pedestal */}
            <div className="w-full rounded-t-xl mt-2 flex items-center justify-center"
              style={{ height: pedH, background: `linear-gradient(180deg, ${glow} 0%, transparent 100%)`, border: `1px solid ${medal}44`, borderBottom: 'none' }}>
              <span className="font-black text-2xl" style={{ color: medal }}>{entry.display_rank}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Rank row ─────────────────────────────────────────────────────────────────

function RankRow({
  entry,
  onSelect,
  window: win,
  myProfileId,
}: {
  entry: RankedEntry
  onSelect: (e: Entry) => void
  window: TimeWindow
  myProfileId?: string
}) {
  const gain = entry.total_value - entry.total_cost
  const showVs = myProfileId && myProfileId !== entry.profile_id

  return (
    <div className="flex items-center gap-2">
      <div
        role="button"
        tabIndex={0}
        className="flex-1 text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:brightness-110 cursor-pointer"
        style={{
          background: entry.is_me ? 'rgba(79,142,247,0.08)' : 'var(--color-card)',
          border: `1px solid ${entry.is_me ? 'rgba(79,142,247,0.25)' : 'var(--color-border)'}`,
        }}
        onClick={() => onSelect(entry)}
        onKeyDown={e => e.key === 'Enter' && onSelect(entry)}
        aria-label={`View ${entry.name}'s portfolio`}
      >
        <span className="text-sm font-bold w-6 text-center shrink-0" style={{ color: 'var(--color-text-3)' }}>
          {entry.display_rank}
        </span>

        <div className="relative shrink-0">
          <Avatar name={entry.name} colour={entry.avatar_colour} emoji={entry.avatar_emoji} size={36} />
          {entry.is_me && (
            <div className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center"
              style={{ width: 16, height: 16, background: '#4f8ef7', fontSize: 7, color: '#fff', fontWeight: 700 }}>
              YOU
            </div>
          )}
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{entry.name}</span>
            {entry.badges.map(b => <BadgeChip key={b} badgeKey={b} small />)}
          </div>
          <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>
            {entry.n_holdings} holding{entry.n_holdings !== 1 ? 's' : ''} · tap to view
          </span>
        </div>

        {/* Returns column */}
        <div className="text-right shrink-0">
          <ReturnPct pct={entry.display_pct} className="text-sm" />
          <div className="flex gap-2 justify-end mt-0.5">
            {win !== 'alltime' && (
              <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                all <ReturnPct pct={entry.return_pct} className="text-xs" />
              </span>
            )}
            {win !== 'weekly' && (
              <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                7d <ReturnPct pct={entry.weekly_return_pct} className="text-xs" />
              </span>
            )}
            {win !== 'monthly' && (
              <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                30d <ReturnPct pct={entry.monthly_return_pct} className="text-xs" />
              </span>
            )}
            {win === 'alltime' && (
              <span className="text-xs" style={{ color: gain >= 0 ? '#22c55e66' : '#ef444466' }}>
                {gain >= 0 ? '+' : ''}{fmtDollar(gain)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* VS link — only for other players when logged in */}
      {showVs && (
        <Link
          href={`/leaderboard/vs/${myProfileId}/${entry.profile_id}`}
          className="flex-shrink-0 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors hover:brightness-110"
          style={{ background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}
          title={`Compare you vs ${entry.name}`}
        >
          VS
        </Link>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const router = useRouter()
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('alltime')

  useEffect(() => {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token) { router.replace('/'); return }

    fetch(`${BASE}/api/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(r => {
        if (r.status === 401) {
          sessionStorage.removeItem('edgescan_profile_token')
          sessionStorage.removeItem('edgescan_profile_name')
          router.replace('/')
          return null
        }
        if (!r.ok) return Promise.reject(r.statusText)
        return r.json()
      })
      .then(d => { if (d) setData(d) })
      .catch(() => setError('Could not load leaderboard'))
      .finally(() => setLoading(false))
  }, [router])

  const rankedEntries = useMemo(
    () => rankEntries(data?.entries ?? [], timeWindow),
    [data, timeWindow],
  )

  const handleSelect = useCallback((entry: Entry) => setSelectedEntry(entry), [])
  const handleClose  = useCallback(() => setSelectedEntry(null), [])

  const podiumEntries = rankedEntries.slice(0, 3)
  const restEntries   = rankedEntries.slice(3)
  const myProfileId   = rankedEntries.find(e => e.is_me)?.profile_id

  const windowLabel = timeWindow === 'weekly' ? '7-day' : timeWindow === 'monthly' ? '30-day' : 'all-time'

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-14"
        style={{ background: 'var(--color-header)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Leaderboard</span>
        {data?.updated_at && (
          <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
            Updated {timeAgo(data.updated_at)}
          </span>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>Portfolio Battle</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-2)' }}>
            Ranked by {windowLabel} return · last-scan prices · tap any player to see their portfolio
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: 'var(--color-text-2)' }}>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {error && <p className="text-sm text-center py-8" style={{ color: '#ef4444' }}>{error}</p>}

        {!loading && !error && rankedEntries.length === 0 && (
          <p className="text-sm text-center py-16" style={{ color: 'var(--color-text-2)' }}>
            No profiles with portfolios yet. Add holdings to get on the board!
          </p>
        )}

        {!loading && rankedEntries.length > 0 && (
          <>
            {/* How it works */}
            {data && <HowItWorks updatedAt={data.updated_at} />}

            {/* Time window tabs */}
            <WindowTabs active={timeWindow} onChange={setTimeWindow} />

            {/* Podium */}
            <Podium entries={podiumEntries} onSelect={handleSelect} window={timeWindow} myProfileId={myProfileId} />

            {/* Ranks 4+ */}
            {restEntries.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-3)' }}>REST OF THE FIELD</p>
                {restEntries.map(entry => (
                  <RankRow key={entry.profile_id} entry={entry} onSelect={handleSelect} window={timeWindow} myProfileId={myProfileId} />
                ))}
              </div>
            )}

            {/* Stats strip */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { label: 'Players', value: String(rankedEntries.length) },
                {
                  label: `Best ${windowLabel}`,
                  value: `${rankedEntries[0]?.display_pct >= 0 ? '+' : ''}${rankedEntries[0]?.display_pct.toFixed(1)}%`,
                },
                {
                  label: 'Most holdings',
                  value: (() => {
                    const most = [...rankedEntries].sort((a, b) => b.n_holdings - a.n_holdings)[0]
                    return `${most?.n_holdings ?? 0}`
                  })(),
                },
              ].map(s => (
                <div key={s.label} className="rounded-xl px-3 py-2 text-center"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-2)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Holdings modal */}
      {selectedEntry && (
        <HoldingsModal entry={selectedEntry} onClose={handleClose} />
      )}
    </div>
  )
}
