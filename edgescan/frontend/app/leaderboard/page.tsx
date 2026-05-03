'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const BADGE_META: Record<string, { emoji: string; label: string }> = {
  crown:   { emoji: '👑', label: 'Overall #1' },
  weekly:  { emoji: '⚡', label: 'Weekly Champion' },
  monthly: { emoji: '🥇', label: 'Monthly Champion' },
  rocket:  { emoji: '🚀', label: 'Biggest Weekly Mover' },
}

interface Entry {
  profile_id: string
  name: string
  avatar_colour: string
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

interface LeaderboardData {
  entries: Entry[]
  updated_at: string
}

function Avatar({ name, colour, size = 48 }: { name: string; colour: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, background: colour, fontSize: Math.round(size * 0.38) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function ReturnPct({ pct, className = '' }: { pct: number; className?: string }) {
  const color = pct > 0 ? '#22c55e' : pct < 0 ? '#ef4444' : '#6b7a99'
  return (
    <span className={`font-bold ${className}`} style={{ color }}>
      {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
    </span>
  )
}

const PODIUM_ORDER = [1, 0, 2] // entries index → left, centre, right
const PODIUM_HEIGHT = [72, 108, 52]
const PODIUM_MEDAL_COLOR = ['#9ca3af', '#f59e0b', '#b45212']
const PODIUM_GLOW = ['rgba(156,163,175,0.15)', 'rgba(245,158,11,0.18)', 'rgba(180,82,18,0.15)']

function Podium({ entries }: { entries: Entry[] }) {
  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 mb-6 pt-6">
      {PODIUM_ORDER.map((entryIdx, posIdx) => {
        const entry = entries[entryIdx]
        if (!entry) return <div key={posIdx} className="w-24" />
        const pedH   = PODIUM_HEIGHT[posIdx]
        const medal  = PODIUM_MEDAL_COLOR[posIdx]
        const glow   = PODIUM_GLOW[posIdx]
        const isTop  = posIdx === 1

        return (
          <div key={entry.profile_id} className="flex flex-col items-center" style={{ width: isTop ? 96 : 80 }}>
            {/* Badges */}
            <div className="flex gap-0.5 justify-center mb-1 h-6">
              {entry.badges.map(b => (
                <span key={b} title={BADGE_META[b]?.label} style={{ fontSize: isTop ? 18 : 15 }}>
                  {BADGE_META[b]?.emoji}
                </span>
              ))}
            </div>

            {/* Avatar with glow for top spot */}
            <div className="relative mb-1">
              <Avatar name={entry.name} colour={entry.avatar_colour} size={isTop ? 64 : 50} />
              {isTop && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: `0 0 28px 6px ${entry.avatar_colour}66`,
                    borderRadius: '50%',
                    animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                  }}
                />
              )}
              {entry.is_me && (
                <div
                  className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center"
                  style={{ width: 18, height: 18, background: '#4f8ef7', fontSize: 8, color: '#fff', fontWeight: 700 }}
                >
                  YOU
                </div>
              )}
            </div>

            {/* Name */}
            <p
              className="text-center font-semibold truncate w-full mb-0.5"
              style={{ color: '#e2e8f8', fontSize: isTop ? 13 : 11 }}
            >
              {entry.name}
            </p>

            {/* Return % */}
            <ReturnPct pct={entry.return_pct} className={isTop ? 'text-base' : 'text-xs'} />

            {/* Pedestal */}
            <div
              className="w-full rounded-t-xl mt-2 flex items-center justify-center"
              style={{
                height: pedH,
                background: `linear-gradient(180deg, ${glow} 0%, transparent 100%)`,
                border: `1px solid ${medal}44`,
                borderBottom: 'none',
              }}
            >
              <span className="font-black text-2xl" style={{ color: medal }}>
                {entry.rank}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RankRow({ entry }: { entry: Entry }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: entry.is_me ? 'rgba(79,142,247,0.08)' : '#0f1521',
        border: `1px solid ${entry.is_me ? 'rgba(79,142,247,0.25)' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      {/* Rank */}
      <span className="text-sm font-bold w-6 text-center shrink-0" style={{ color: '#3a4259' }}>
        {entry.rank}
      </span>

      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar name={entry.name} colour={entry.avatar_colour} size={36} />
        {entry.is_me && (
          <div
            className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center"
            style={{ width: 16, height: 16, background: '#4f8ef7', fontSize: 7, color: '#fff', fontWeight: 700 }}
          >
            YOU
          </div>
        )}
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate" style={{ color: '#e2e8f8' }}>{entry.name}</span>
          {entry.badges.map(b => (
            <span key={b} title={BADGE_META[b]?.label} style={{ fontSize: 13 }}>{BADGE_META[b]?.emoji}</span>
          ))}
        </div>
        <span className="text-xs" style={{ color: '#6b7a99' }}>
          {entry.n_holdings} holding{entry.n_holdings !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Returns */}
      <div className="text-right shrink-0">
        <ReturnPct pct={entry.return_pct} className="text-sm" />
        <div className="flex gap-2 justify-end mt-0.5">
          <span className="text-xs" style={{ color: '#3a4259' }}>
            7d <ReturnPct pct={entry.weekly_return_pct} className="text-xs" />
          </span>
        </div>
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const entries = data?.entries ?? []
  const podiumEntries = entries.slice(0, 3)
  const restEntries   = entries.slice(3)

  return (
    <div className="min-h-screen pb-24" style={{ background: '#080b12' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-14"
        style={{
          background: 'rgba(8,11,18,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div>
          <span className="font-semibold text-sm" style={{ color: '#e2e8f8' }}>Leaderboard</span>
        </div>
        {data?.updated_at && (
          <span className="text-xs" style={{ color: '#3a4259' }}>
            Updated {data.updated_at}
          </span>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-4">
        {/* Title */}
        <div className="text-center mb-2">
          <h1 className="text-2xl font-black" style={{ color: '#e2e8f8' }}>
            Portfolio Battle
          </h1>
          <p className="text-xs mt-1" style={{ color: '#6b7a99' }}>
            Ranked by total portfolio return vs. cost basis
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: '#6b7a99' }}>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {error && (
          <p className="text-sm text-center py-8" style={{ color: '#ef4444' }}>{error}</p>
        )}

        {!loading && !error && entries.length === 0 && (
          <p className="text-sm text-center py-16" style={{ color: '#6b7a99' }}>
            No profiles with portfolios yet. Add holdings to get on the board!
          </p>
        )}

        {!loading && entries.length > 0 && (
          <>
            {/* Podium — top 3 */}
            <Podium entries={podiumEntries} />

            {/* Ranks 4+ */}
            {restEntries.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-semibold mb-3" style={{ color: '#3a4259' }}>
                  REST OF THE FIELD
                </p>
                {restEntries.map(entry => (
                  <RankRow key={entry.profile_id} entry={entry} />
                ))}
              </div>
            )}

            {/* Badge legend */}
            <div
              className="mt-6 rounded-xl px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5"
              style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {Object.entries(BADGE_META).map(([, { emoji, label }]) => (
                <div key={label} className="flex items-center gap-2 text-xs" style={{ color: '#6b7a99' }}>
                  <span style={{ fontSize: 14 }}>{emoji}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Stats strip */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Players', value: entries.length },
                {
                  label: 'Best overall',
                  value: `${entries[0]?.return_pct >= 0 ? '+' : ''}${entries[0]?.return_pct.toFixed(1)}%`,
                },
                {
                  label: 'Best this week',
                  value: (() => {
                    const best = [...entries].sort((a, b) => b.weekly_return_pct - a.weekly_return_pct)[0]
                    return `${best?.weekly_return_pct >= 0 ? '+' : ''}${best?.weekly_return_pct.toFixed(1)}%`
                  })(),
                },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-xl px-3 py-2 text-center"
                  style={{ background: '#0f1521', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <p className="text-sm font-bold" style={{ color: '#e2e8f8' }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7a99' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
