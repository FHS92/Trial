'use client'

import { useState, useEffect } from 'react'
import UniverseBadge from '@/components/UniverseBadge'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface PickEntry {
  ticker: string
  score: number
  sector: string
  current_price: number
  name: string
}

interface RebalanceSuggestions {
  month: string
  universe: string
  top_picks: PickEntry[]
  previous_picks: PickEntry[]
  to_buy: string[]
  to_sell: string[]
  to_hold: string[]
  alloc_per_stock: number
}

function scoreBadge(score: number) {
  let bg: string
  let color: string
  if (score >= 70) {
    bg = 'rgba(34,197,94,0.15)'
    color = '#22c55e'
  } else if (score >= 55) {
    bg = 'rgba(245,158,11,0.15)'
    color = '#f59e0b'
  } else {
    bg = 'rgba(239,68,68,0.15)'
    color = '#ef4444'
  }
  return (
    <span
      style={{
        background: bg,
        color,
        border: `1px solid ${color}33`,
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.03em',
      }}
    >
      {score}
    </span>
  )
}

function formatPrice(price: number) {
  return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function formatAlloc(alloc: number) {
  return alloc.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function PickCard({
  pick,
  alloc,
  dimmed,
}: {
  pick: PickEntry
  alloc?: number
  dimmed?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '10px 12px',
        borderRadius: 10,
        background: dimmed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        opacity: dimmed ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f8', letterSpacing: '0.04em' }}>
          {pick.ticker}
        </span>
        {scoreBadge(pick.score)}
      </div>
      <span style={{ fontSize: 12, color: '#9aa5c0', lineHeight: 1.4 }}>{pick.name}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
        <span
          style={{
            fontSize: 11,
            color: '#6b7a99',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 4,
            padding: '1px 6px',
          }}
        >
          {pick.sector}
        </span>
        <span style={{ fontSize: 12, color: '#6b7a99' }}>{formatPrice(pick.current_price)}</span>
      </div>
      {alloc !== undefined && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: '#22c55e',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>Suggested allocation:</span>
          <span>{formatAlloc(alloc)}</span>
        </div>
      )}
    </div>
  )
}

interface ActionColumnProps {
  title: string
  icon: React.ReactNode
  borderColor: string
  bgColor: string
  children: React.ReactNode
  emptyMsg: string
  isEmpty: boolean
}

function ActionColumn({ title, icon, borderColor, bgColor, children, emptyMsg, isEmpty }: ActionColumnProps) {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 220,
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 16,
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f8' }}>{title}</span>
      </div>
      {isEmpty ? (
        <p style={{ fontSize: 12, color: '#6b7a99', fontStyle: 'italic' }}>{emptyMsg}</p>
      ) : (
        children
      )}
    </div>
  )
}

export default function RebalancePage() {
  const [universe, setUniverse] = useState<'sp500' | 'russell'>('sp500')
  const [data, setData] = useState<RebalanceSuggestions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noData, setNoData] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('edgescan_universe')
    if (stored === 'sp500' || stored === 'russell') setUniverse(stored)
  }, [])

  async function loadSuggestions(uni: string) {
    setLoading(true)
    setError(null)
    setNoData(false)
    try {
      const res = await fetch(`${API}/api/analytics/rebalance-suggestions?universe=${uni}`)
      if (res.status === 404 || res.status === 204) {
        setNoData(true)
        setData(null)
        return
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server error ${res.status}`)
      }
      const json: RebalanceSuggestions = await res.json()
      if (!json.top_picks || json.top_picks.length === 0) {
        setNoData(true)
        setData(null)
      } else {
        setData(json)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuggestions(universe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleUniverseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as 'sp500' | 'russell'
    setUniverse(val)
    loadSuggestions(val)
  }

  // Derived maps
  const topPickMap: Record<string, PickEntry> = {}
  const prevPickMap: Record<string, PickEntry> = {}
  if (data) {
    for (const p of data.top_picks) topPickMap[p.ticker] = p
    for (const p of data.previous_picks) prevPickMap[p.ticker] = p
  }

  const buyPicks = data ? data.to_buy.map(t => topPickMap[t]).filter(Boolean) : []
  const holdPicks = data ? data.to_hold.map(t => topPickMap[t] ?? prevPickMap[t]).filter(Boolean) : []
  const sellPicks = data ? data.to_sell.map(t => prevPickMap[t]).filter(Boolean) : []

  return (
    <div style={{ minHeight: '100vh', background: '#080b12' }}>
      {/* Sticky header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 24px',
          background: 'rgba(8,11,18,0.93)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 56,
            gap: 12,
          }}
        >
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#4f8ef7', letterSpacing: '-0.01em' }}>Edge</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f8', letterSpacing: '-0.01em' }}>Scan</span>
          </a>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f8' }}>Rebalancing Assistant</span>
            <span style={{ fontSize: 11, color: '#6b7a99', marginTop: 1 }}>
              Monthly top-3 picks vs last month — what to buy, sell, or hold
            </span>
          </div>

          <UniverseBadge />
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px 64px' }}>
        {/* Controls row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {/* Universe selector */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#6b7a99', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Universe
            </span>
            <select
              value={universe}
              onChange={handleUniverseChange}
              style={{
                background: '#0f1521',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color: '#e2e8f8',
                fontSize: 13,
                padding: '6px 32px 6px 10px',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7a99' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                outline: 'none',
              }}
            >
              <option value="sp500">S&amp;P 500</option>
              <option value="russell">Russell 2000</option>
            </select>
          </label>

          {/* Load button */}
          <button
            onClick={() => loadSuggestions(universe)}
            disabled={loading}
            style={{
              alignSelf: 'flex-end',
              padding: '7px 18px',
              borderRadius: 8,
              background: loading ? 'rgba(79,142,247,0.3)' : '#4f8ef7',
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.15s',
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                Loading…
              </>
            ) : (
              'Load Suggestions'
            )}
          </button>

          {/* Month label */}
          {data && (
            <div
              style={{
                marginLeft: 'auto',
                padding: '6px 14px',
                borderRadius: 8,
                background: 'rgba(79,142,247,0.1)',
                border: '1px solid rgba(79,142,247,0.25)',
                fontSize: 12,
                color: '#4f8ef7',
                fontWeight: 600,
              }}
            >
              Current Month: {data.month}
            </div>
          )}
        </div>

        {/* Spinner keyframe */}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>

        {/* Error state */}
        {error && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444',
              fontSize: 13,
              marginBottom: 24,
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* No data state */}
        {noData && !error && (
          <div
            style={{
              padding: '48px 24px',
              borderRadius: 16,
              background: '#0f1521',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f8', marginBottom: 8 }}>
              No scan data available yet.
            </p>
            <p style={{ fontSize: 13, color: '#6b7a99' }}>
              Run a scan from the home page first.
            </p>
          </div>
        )}

        {/* Main content — only when data is available */}
        {data && !noData && (
          <>
            {/* Three action columns */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 32,
              }}
            >
              {/* Buy column */}
              <ActionColumn
                title="Buy"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                }
                borderColor="rgba(34,197,94,0.3)"
                bgColor="rgba(34,197,94,0.05)"
                isEmpty={buyPicks.length === 0}
                emptyMsg="Nothing to buy this month."
              >
                {buyPicks.map(pick => (
                  <PickCard key={pick.ticker} pick={pick} alloc={data.alloc_per_stock} />
                ))}
              </ActionColumn>

              {/* Hold column */}
              <ActionColumn
                title="Hold"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                }
                borderColor="rgba(79,142,247,0.3)"
                bgColor="rgba(79,142,247,0.05)"
                isEmpty={holdPicks.length === 0}
                emptyMsg="No overlapping picks to hold."
              >
                {holdPicks.map(pick => (
                  <PickCard key={pick.ticker} pick={pick} />
                ))}
              </ActionColumn>

              {/* Sell column */}
              <ActionColumn
                title="Sell"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                }
                borderColor="rgba(239,68,68,0.3)"
                bgColor="rgba(239,68,68,0.05)"
                isEmpty={sellPicks.length === 0}
                emptyMsg="Nothing to sell this month."
              >
                {sellPicks.map(pick => (
                  <PickCard key={pick.ticker} pick={pick} dimmed />
                ))}
              </ActionColumn>
            </div>

            {/* Top picks table */}
            <div
              style={{
                background: '#0f1521',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e2e8f8' }}>
                  Top Picks — This Month
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    color: '#6b7a99',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 6,
                    padding: '2px 8px',
                  }}
                >
                  {data.top_picks.length} picks
                </span>
              </div>

              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 72px 1fr 80px 130px 90px',
                  padding: '8px 20px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {['Rank', 'Ticker', 'Name', 'Score', 'Sector', 'Price'].map(col => (
                  <span
                    key={col}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#6b7a99',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {col}
                  </span>
                ))}
              </div>

              {/* Table rows */}
              {data.top_picks.map((pick, i) => (
                <div
                  key={pick.ticker}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 72px 1fr 80px 130px 90px',
                    padding: '12px 20px',
                    borderBottom:
                      i < data.top_picks.length - 1
                        ? '1px solid rgba(255,255,255,0.04)'
                        : 'none',
                    alignItems: 'center',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  <span style={{ fontSize: 12, color: '#6b7a99', fontWeight: 600 }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f8', letterSpacing: '0.04em' }}>
                    {pick.ticker}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#9aa5c0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      paddingRight: 8,
                    }}
                  >
                    {pick.name}
                  </span>
                  <span>{scoreBadge(pick.score)}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#6b7a99',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 4,
                      padding: '2px 7px',
                      width: 'fit-content',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 120,
                    }}
                  >
                    {pick.sector}
                  </span>
                  <span style={{ fontSize: 12, color: '#9aa5c0', textAlign: 'right' }}>
                    {formatPrice(pick.current_price)}
                  </span>
                </div>
              ))}
            </div>

            {/* Previous picks reference table */}
            {data.previous_picks.length > 0 && (
              <div
                style={{
                  marginTop: 20,
                  background: '#0f1521',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  opacity: 0.75,
                }}
              >
                <div
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#9aa5c0' }}>
                    Previous Month Picks
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#6b7a99',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 6,
                      padding: '2px 8px',
                    }}
                  >
                    {data.previous_picks.length} picks
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 72px 1fr 80px 130px 90px',
                    padding: '8px 20px',
                    background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {['Rank', 'Ticker', 'Name', 'Score', 'Sector', 'Price'].map(col => (
                    <span
                      key={col}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#6b7a99',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {col}
                    </span>
                  ))}
                </div>

                {data.previous_picks.map((pick, i) => (
                  <div
                    key={pick.ticker}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px 72px 1fr 80px 130px 90px',
                      padding: '12px 20px',
                      borderBottom:
                        i < data.previous_picks.length - 1
                          ? '1px solid rgba(255,255,255,0.04)'
                          : 'none',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#6b7a99', fontWeight: 600 }}>#{i + 1}</span>
                    <span
                      style={{ fontSize: 13, fontWeight: 700, color: '#9aa5c0', letterSpacing: '0.04em' }}
                    >
                      {pick.ticker}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: '#6b7a99',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        paddingRight: 8,
                      }}
                    >
                      {pick.name}
                    </span>
                    <span>{scoreBadge(pick.score)}</span>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#6b7a99',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 4,
                        padding: '2px 7px',
                        width: 'fit-content',
                      }}
                    >
                      {pick.sector}
                    </span>
                    <span style={{ fontSize: 12, color: '#6b7a99', textAlign: 'right' }}>
                      {formatPrice(pick.current_price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
