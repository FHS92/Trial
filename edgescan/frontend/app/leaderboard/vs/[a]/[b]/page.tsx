'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const BADGE_META: Record<string, { emoji: string; label: string }> = {
  crown:   { emoji: '👑', label: 'Overall #1' },
  weekly:  { emoji: '⚡', label: 'Weekly Champion' },
  monthly: { emoji: '🥇', label: 'Monthly Champion' },
  rocket:  { emoji: '🚀', label: 'Biggest Mover' },
}

interface Entry {
  profile_id: string
  name: string
  avatar_colour: string
  avatar_emoji: string | null
  return_pct: number
  weekly_return_pct: number
  monthly_return_pct: number
  total_value: number
  total_cost: number
  n_holdings: number
  badges: string[]
}

interface HoldingItem {
  ticker: string
  name: string | null
  current_value: number | null
  pnl_pct: number | null
}

function Avatar({ name, colour, emoji, size = 48 }: { name: string; colour: string; emoji?: string | null; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, background: colour, fontSize: emoji ? Math.round(size * 0.5) : Math.round(size * 0.38) }}
    >
      {emoji ?? name.charAt(0).toUpperCase()}
    </div>
  )
}

function fmtDollar(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${n < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}K`
  return `${n < 0 ? '-$' : '$'}${abs.toFixed(0)}`
}

function pctStr(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function StatRow({
  label, aVal, bVal, aRaw, bRaw, higherIsBetter = true,
}: {
  label: string; aVal: string; bVal: string
  aRaw: number; bRaw: number; higherIsBetter?: boolean
}) {
  const aWins = higherIsBetter ? aRaw > bRaw : aRaw < bRaw
  const bWins = higherIsBetter ? bRaw > aRaw : bRaw < aRaw
  return (
    <div className="flex items-center px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <span className="flex-1 text-xs" style={{ color: 'var(--color-text-2)' }}>{label}</span>
      <span className="w-28 text-center text-sm font-bold" style={{ color: aWins ? '#22c55e' : bWins ? '#ef4444' : 'var(--color-text)' }}>
        {aVal}{aWins && <span className="ml-1 text-xs opacity-70">✓</span>}
      </span>
      <span className="w-28 text-center text-sm font-bold" style={{ color: bWins ? '#22c55e' : aWins ? '#ef4444' : 'var(--color-text)' }}>
        {bVal}{bWins && <span className="ml-1 text-xs opacity-70">✓</span>}
      </span>
    </div>
  )
}

function TickerPills({ tickers, label, colour }: { tickers: HoldingItem[]; label: string; colour: string }) {
  if (tickers.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: colour }}>
        {label} ({tickers.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tickers.map(h => (
          <Link
            key={h.ticker}
            href={`/stock/${h.ticker}`}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-colors hover:brightness-110"
            style={{ background: 'var(--color-border)', color: 'var(--color-text)', border: '1px solid var(--color-border-2)' }}
          >
            {h.ticker}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function VsPage({ params }: { params: { a: string; b: string } }) {
  const router = useRouter()
  const { a: idA, b: idB } = params

  const [entryA, setEntryA] = useState<Entry | null>(null)
  const [entryB, setEntryB] = useState<Entry | null>(null)
  const [holdingsA, setHoldingsA] = useState<HoldingItem[]>([])
  const [holdingsB, setHoldingsB] = useState<HoldingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('edgescan_profile_token')
    if (!token) { router.replace('/'); return }

    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch(`${BASE}/api/leaderboard`, { headers, cache: 'no-store' }).then(r => r.json()),
      fetch(`${BASE}/api/leaderboard/profile/${idA}/holdings`, { headers, cache: 'no-store' })
        .then(r => r.ok ? r.json() : { holdings: [] }).catch(() => ({ holdings: [] })),
      fetch(`${BASE}/api/leaderboard/profile/${idB}/holdings`, { headers, cache: 'no-store' })
        .then(r => r.ok ? r.json() : { holdings: [] }).catch(() => ({ holdings: [] })),
    ])
      .then(([lb, hA, hB]) => {
        const entries: Entry[] = lb.entries ?? []
        setEntryA(entries.find(e => e.profile_id === idA) ?? null)
        setEntryB(entries.find(e => e.profile_id === idB) ?? null)
        setHoldingsA(hA.holdings ?? [])
        setHoldingsB(hB.holdings ?? [])
      })
      .catch(() => setError('Failed to load comparison data'))
      .finally(() => setLoading(false))
  }, [idA, idB, router])

  const tickersA  = new Set(holdingsA.map(h => h.ticker))
  const tickersB  = new Set(holdingsB.map(h => h.ticker))
  const shared    = holdingsA.filter(h => tickersB.has(h.ticker))
  const uniqueA   = holdingsA.filter(h => !tickersB.has(h.ticker))
  const uniqueB   = holdingsB.filter(h => !tickersA.has(h.ticker))

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 h-14"
        style={{ background: 'var(--color-header)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}
      >
        <Link href="/leaderboard" className="flex items-center gap-1 text-sm hover:opacity-80" style={{ color: 'var(--color-text-2)' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Leaderboard
        </Link>
        <span style={{ color: 'var(--color-border-3)' }}>/</span>
        <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Head to Head</span>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: 'var(--color-text-2)' }}>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {error && <p className="text-sm text-center py-8" style={{ color: '#ef4444' }}>{error}</p>}

        {!loading && !error && (!entryA || !entryB) && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-2)' }}>
            One or both profiles not found on the leaderboard.
          </p>
        )}

        {!loading && entryA && entryB && (
          <div className="space-y-5">
            {/* VS banner */}
            <div className="flex items-center gap-4">
              <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
                <Avatar name={entryA.name} colour={entryA.avatar_colour} emoji={entryA.avatar_emoji} size={56} />
                <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{entryA.name}</p>
                <div className="flex gap-0.5 justify-center min-h-[20px]">
                  {entryA.badges.map(b => (
                    <span key={b} title={BADGE_META[b]?.label} style={{ fontSize: 14 }}>{BADGE_META[b]?.emoji}</span>
                  ))}
                </div>
              </div>

              <div
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-black"
                style={{ background: 'var(--surf2)', border: '1px solid var(--color-border-2)', color: '#4f8ef7' }}
              >
                VS
              </div>

              <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
                <Avatar name={entryB.name} colour={entryB.avatar_colour} emoji={entryB.avatar_emoji} size={56} />
                <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{entryB.name}</p>
                <div className="flex gap-0.5 justify-center min-h-[20px]">
                  {entryB.badges.map(b => (
                    <span key={b} title={BADGE_META[b]?.label} style={{ fontSize: 14 }}>{BADGE_META[b]?.emoji}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats comparison table */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              {/* Column headers */}
              <div
                className="flex items-center px-4 py-2"
                style={{ background: 'var(--color-card-alt)', borderBottom: '1px solid var(--color-border)' }}
              >
                <span className="flex-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>Stat</span>
                <span className="w-28 text-center text-xs font-bold truncate" style={{ color: entryA.avatar_colour }}>{entryA.name}</span>
                <span className="w-28 text-center text-xs font-bold truncate" style={{ color: entryB.avatar_colour }}>{entryB.name}</span>
              </div>
              <StatRow label="Overall return"   aVal={pctStr(entryA.return_pct)}         bVal={pctStr(entryB.return_pct)}         aRaw={entryA.return_pct}         bRaw={entryB.return_pct} />
              <StatRow label="7-day return"     aVal={pctStr(entryA.weekly_return_pct)}  bVal={pctStr(entryB.weekly_return_pct)}  aRaw={entryA.weekly_return_pct}  bRaw={entryB.weekly_return_pct} />
              <StatRow label="30-day return"    aVal={pctStr(entryA.monthly_return_pct)} bVal={pctStr(entryB.monthly_return_pct)} aRaw={entryA.monthly_return_pct} bRaw={entryB.monthly_return_pct} />
              <StatRow label="Portfolio value"  aVal={fmtDollar(entryA.total_value)}     bVal={fmtDollar(entryB.total_value)}     aRaw={entryA.total_value}        bRaw={entryB.total_value} />
              <StatRow label="Amount invested"  aVal={fmtDollar(entryA.total_cost)}      bVal={fmtDollar(entryB.total_cost)}      aRaw={entryA.total_cost}         bRaw={entryB.total_cost} />
              <StatRow label="# Holdings"       aVal={String(entryA.n_holdings)}         bVal={String(entryB.n_holdings)}         aRaw={entryA.n_holdings}         bRaw={entryB.n_holdings} />
            </div>

            {/* Holdings breakdown */}
            {(shared.length > 0 || uniqueA.length > 0 || uniqueB.length > 0) && (
              <div className="space-y-4">
                {shared.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-2)' }}>
                      Both own ({shared.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {shared.map(h => (
                        <Link
                          key={h.ticker}
                          href={`/stock/${h.ticker}`}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-colors hover:brightness-110"
                          style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}
                        >
                          {h.ticker}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                <TickerPills tickers={uniqueA} label={`Only ${entryA.name}`} colour={entryA.avatar_colour} />
                <TickerPills tickers={uniqueB} label={`Only ${entryB.name}`} colour={entryB.avatar_colour} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
