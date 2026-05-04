'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UniverseBadge from '@/components/UniverseBadge'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface SectorRow {
  sector: string
  monthly_scores: Record<string, number>
  avg_score: number
  stock_count: number
}

interface HeatmapData {
  months: string[]
  sectors: SectorRow[]
}

function scoreColor(score: number): { bg: string; text: string } {
  if (score >= 70) return { bg: 'rgba(34,197,94,0.25)', text: '#22c55e' }
  if (score >= 55) return { bg: 'rgba(234,179,8,0.15)', text: '#eab308' }
  return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' }
}

function avgColor(score: number): { bg: string; text: string } {
  if (score >= 70) return { bg: 'rgba(34,197,94,0.35)', text: '#22c55e' }
  if (score >= 55) return { bg: 'rgba(234,179,8,0.25)', text: '#eab308' }
  return { bg: 'rgba(239,68,68,0.25)', text: '#ef4444' }
}

function formatMonth(m: string): string {
  const [year, month] = m.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

export default function HeatmapPage() {
  const router = useRouter()
  const [data, setData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadHeatmap() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${BASE}/api/analytics/sector-heatmap`, { cache: 'no-store' })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail ?? `Server error ${r.status}`)
      }
      const json: HeatmapData = await r.json()
      // Sort sectors by avg_score descending
      json.sectors = [...json.sectors].sort((a, b) => b.avg_score - a.avg_score)
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load heatmap data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHeatmap()
  }, [])

  const months = data?.months ?? []
  const sectors = data?.sectors ?? []

  // Column widths: sector name col + one col per month + avg col
  const monthColWidth = 88
  const sectorColWidth = 180
  const avgColWidth = 80

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 sm:px-6 h-14"
        style={{
          background: 'var(--color-header)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
          Sector Heatmap
        </span>
        <UniverseBadge />
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
            Sector Rotation Heatmap
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>
            Average composite score by sector over recent months
          </p>
        </div>

        {/* Load button */}
        <div className="mb-6">
          <button
            onClick={loadHeatmap}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            style={{ background: '#4f8ef7', color: '#fff' }}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Loading…
              </>
            ) : (
              'Load Heatmap'
            )}
          </button>
        </div>

        {/* Error state */}
        {error && (
          <p
            className="text-sm mb-4 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          >
            {error}
          </p>
        )}

        {/* Heatmap table */}
        {data && (
          <div className="space-y-4">
            <div
              className="rounded-xl overflow-auto"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: sectorColWidth + months.length * monthColWidth + avgColWidth }}>
                {/* Header row */}
                <thead>
                  <tr style={{ background: 'var(--color-card-alt)', borderBottom: '1px solid var(--color-border)' }}>
                    <th
                      style={{
                        width: sectorColWidth,
                        minWidth: sectorColWidth,
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--color-text-2)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        position: 'sticky',
                        left: 0,
                        background: 'var(--color-card-alt)',
                        zIndex: 2,
                        borderRight: '1px solid var(--color-border)',
                      }}
                    >
                      Sector
                    </th>
                    {months.map((m) => (
                      <th
                        key={m}
                        style={{
                          width: monthColWidth,
                          minWidth: monthColWidth,
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--color-text-2)',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          borderRight: '1px solid var(--color-border)',
                        }}
                      >
                        {formatMonth(m)}
                      </th>
                    ))}
                    <th
                      style={{
                        width: avgColWidth,
                        minWidth: avgColWidth,
                        padding: '10px 12px',
                        textAlign: 'center',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--color-text-2)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        borderLeft: '1px solid var(--color-border-2)',
                      }}
                    >
                      Avg
                    </th>
                  </tr>
                </thead>

                {/* Data rows */}
                <tbody>
                  {sectors.map((row, i) => {
                    const avgC = avgColor(row.avg_score)
                    const rowBg = i % 2 === 0 ? 'var(--color-card)' : '#0b1019'
                    return (
                      <tr
                        key={row.sector}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: rowBg,
                        }}
                      >
                        {/* Sector name cell — click → scanner filtered by sector */}
                        <td
                          onClick={() => router.push(`/scanner?sector=${encodeURIComponent(row.sector)}`)}
                          title={`View ${row.sector} stocks in scanner`}
                          style={{
                            padding: '10px 16px',
                            position: 'sticky',
                            left: 0,
                            background: rowBg,
                            zIndex: 1,
                            borderRight: '1px solid var(--color-border)',
                            cursor: 'pointer',
                          }}
                        >
                          <span
                            style={{
                              display: 'block',
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--color-text)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.sector}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: 11,
                              color: '#4f8ef7',
                              marginTop: 2,
                            }}
                          >
                            {row.stock_count} stocks →
                          </span>
                        </td>

                        {/* Monthly score cells */}
                        {months.map((m) => {
                          const score = row.monthly_scores[m]
                          if (score == null) {
                            return (
                              <td
                                key={m}
                                style={{
                                  padding: '8px',
                                  textAlign: 'center',
                                  borderRight: '1px solid var(--color-border)',
                                  fontSize: 13,
                                  color: 'var(--color-text-3)',
                                }}
                              >
                                —
                              </td>
                            )
                          }
                          const c = scoreColor(score)
                          return (
                            <td
                              key={m}
                              onClick={() => router.push(`/scanner?sector=${encodeURIComponent(row.sector)}`)}
                              title={`View ${row.sector} stocks in scanner`}
                              style={{
                                padding: '8px',
                                textAlign: 'center',
                                borderRight: '1px solid var(--color-border)',
                                cursor: 'pointer',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  background: c.bg,
                                  color: c.text,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  fontVariantNumeric: 'tabular-nums',
                                  minWidth: 44,
                                }}
                              >
                                {score.toFixed(1)}
                              </span>
                            </td>
                          )
                        })}

                        {/* Avg cell */}
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'center',
                            borderLeft: '1px solid var(--color-border-2)',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: 6,
                              background: avgC.bg,
                              color: avgC.text,
                              fontSize: 13,
                              fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums',
                              minWidth: 44,
                            }}
                          >
                            {row.avg_score.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div
              className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl text-xs"
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-2)',
              }}
            >
              <span style={{ fontWeight: 600, color: '#a0aec0' }}>Legend:</span>
              <span className="flex items-center gap-1.5">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: 'rgba(34,197,94,0.25)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: '#22c55e', fontWeight: 600 }}>Dark green</span>
                <span>= strong (≥70)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: 'rgba(234,179,8,0.15)',
                    border: '1px solid rgba(234,179,8,0.35)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: '#eab308', fontWeight: 600 }}>Yellow</span>
                <span>= neutral (55–69)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: '#ef4444', fontWeight: 600 }}>Red</span>
                <span>= weak (&lt;55)</span>
              </span>
            </div>
          </div>
        )}

        {/* Empty state when no data and not loading */}
        {!data && !loading && !error && (
          <div
            className="flex flex-col items-center justify-center rounded-xl py-16"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-2)',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.4 }}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <p className="text-sm">Click "Load Heatmap" to fetch sector data</p>
          </div>
        )}
      </main>
    </div>
  )
}
