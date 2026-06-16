'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Briefcase, Plus, ArrowRight, TrendingUp, Upload, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { formatPrice, formatPercent, formatDate, cn } from '@/lib/utils'
import type { PortfolioResponse } from '@/lib/types'
import { PortfolioRow } from './PortfolioRow'
import { TransactionModal } from './TransactionModal'
import { PortfolioCharts } from './PortfolioCharts'

type ModalState =
  | { open: false }
  | { open: true; lockedTicker?: string; type: 'buy' | 'sell'; maxShares?: number }

function plColor(value: number | null | undefined): string {
  if (value == null || value === 0) return 'var(--text)'
  return value > 0 ? 'var(--score-strong)' : 'var(--score-weak)'
}

export function PortfolioClient() {
  const [data, setData] = useState<PortfolioResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.portfolio.list()
      setData(res)
      setError(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('sign-in-required')
      else setError('Failed to load portfolio.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const isPro = data ? data.limit === null : false
  const atLimit = data?.limit != null && data.count >= data.limit

  function openTrade(ticker: string, type: 'buy' | 'sell', maxShares: number) {
    setModal({ open: true, lockedTicker: ticker, type, maxShares })
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    setImporting(true)
    setImportMsg(null)
    try {
      const text = await file.text()
      const res = await api.portfolio.importCsv(text)
      const errCount = res.errors.length
      setImportMsg(
        `Imported ${res.imported} transaction${res.imported === 1 ? '' : 's'}` +
          (errCount ? ` · ${errCount} row${errCount === 1 ? '' : 's'} skipped` : '')
      )
      await load()
    } catch (err) {
      setImportMsg(err instanceof ApiError ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  // ----- Loading -----
  if (loading) {
    return (
      <Shell>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[var(--radius-lg)] bg-[var(--border)] animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[var(--radius-lg)] bg-[var(--border)] animate-pulse" />
          ))}
        </div>
      </Shell>
    )
  }

  // ----- Sign-in required -----
  if (error === 'sign-in-required') {
    return (
      <Shell>
        <div className="mt-8 flex flex-col items-center justify-center py-16 px-4 text-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border)]">
          <Briefcase className="h-10 w-10 text-[var(--text-muted)] mb-4" />
          <p className="text-base font-bold text-[var(--text)] mb-2">Sign in to track your portfolio</p>
          <Link
            href="/login?callbackUrl=/portfolio"
            className="pro-button inline-flex items-center gap-2 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white shadow-sm mt-2"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    )
  }

  // ----- Error -----
  if (error || !data) {
    return (
      <Shell>
        <div
          className="mt-4 rounded-[var(--radius)] border px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}
          role="alert"
        >
          {error ?? 'Failed to load portfolio.'}
        </div>
      </Shell>
    )
  }

  const { summary, positions } = data

  return (
    <Shell
      action={
        <div className="flex items-center gap-2 shrink-0">
          {isPro && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)] transition-colors disabled:opacity-60"
              title="Import transactions from CSV"
            >
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Import
            </button>
          )}
          {!atLimit && (
            <button
              onClick={() => setModal({ open: true, type: 'buy' })}
              className="pro-button flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportFile}
      />
      {importMsg && (
        <div
          className="mb-4 rounded-[var(--radius)] border px-4 py-2.5 text-xs flex items-center justify-between gap-3"
          style={{ background: 'var(--accent-light)', borderColor: 'var(--accent-glow)', color: 'var(--text)' }}
        >
          <span>{importMsg}</span>
          <button onClick={() => setImportMsg(null)} className="text-[var(--text-muted)] hover:text-[var(--text)]">✕</button>
        </div>
      )}
      {/* Summary cards */}
      {positions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <SummaryCard label="Total value" value={formatPrice(summary.total_value)} />
          <SummaryCard
            label="Unrealized P&L"
            value={`${summary.total_unrealized_pl >= 0 ? '+' : ''}${formatPrice(summary.total_unrealized_pl)}`}
            sub={summary.total_unrealized_pl_pct != null ? formatPercent(summary.total_unrealized_pl_pct) : undefined}
            color={plColor(summary.total_unrealized_pl)}
          />
          {isPro ? (
            <SummaryCard
              label="Realized P&L"
              value={`${(summary.total_realized_pl ?? 0) >= 0 ? '+' : ''}${formatPrice(summary.total_realized_pl ?? 0)}`}
              color={plColor(summary.total_realized_pl)}
            />
          ) : (
            <SummaryCard label="Cost basis" value={formatPrice(summary.total_cost)} />
          )}
        </div>
      )}

      {/* Value-over-time + sector allocation (pro) */}
      {isPro && positions.length > 0 && (
        <PortfolioCharts allocation={data.allocation} />
      )}

      {/* Free-tier banner */}
      {!isPro && data.limit != null && (
        <div
          className="mb-4 rounded-[var(--radius-lg)] border p-4 flex items-center justify-between gap-4"
          style={{ background: 'var(--accent-light)', borderColor: 'var(--accent-glow)' }}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">
              {data.count} / {data.limit} positions · Free plan
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Pro unlocks unlimited holdings, multiple buy lots, and realized P&L.
            </p>
          </div>
          <Link
            href="/upgrade"
            className="pro-button shrink-0 flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
          >
            Upgrade
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Positions */}
      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full mb-4" style={{ background: 'var(--surface-elevated)' }}>
            <Briefcase className="h-7 w-7 text-[var(--text-muted)]" />
          </div>
          <p className="text-base font-bold text-[var(--text)] mb-1">No holdings yet</p>
          <p className="text-sm text-[var(--text-muted)] mb-5 max-w-xs">
            Add a position to track P&amp;L, cost basis, and how its EdgeScan score drifts since you bought.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal({ open: true, type: 'buy' })}
              className="pro-button inline-flex items-center gap-2 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add holding
            </button>
            <Link
              href="/scanner"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)] transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              Browse stocks
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-sm)]"
          style={{ background: 'var(--surface)' }}
        >
          {positions.map(p => (
            <PortfolioRow key={p.ticker} position={p} isPro={isPro} onTrade={openTrade} />
          ))}
        </div>
      )}

      {/* Closed positions / realized history (pro) */}
      {isPro && data.closed_positions && data.closed_positions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-2 px-1">
            Closed positions
          </h2>
          <div
            className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-sm)]"
            style={{ background: 'var(--surface)' }}
          >
            {data.closed_positions.map(c => (
              <div
                key={c.ticker}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-[var(--text)] tracking-tight">{c.ticker}</span>
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {c.shares_sold} sh sold{c.last_sell_date ? ` · ${formatDate(c.last_sell_date)}` : ''}
                  </p>
                </div>
                <span
                  className="text-sm font-mono font-semibold tabular-nums shrink-0"
                  style={{ color: plColor(c.realized_pl) }}
                >
                  {c.realized_pl >= 0 ? '+' : ''}{formatPrice(c.realized_pl)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal.open && (
        <TransactionModal
          lockedTicker={modal.lockedTicker}
          defaultType={modal.type}
          maxSellShares={modal.type === 'sell' ? modal.maxShares : undefined}
          onClose={() => setModal({ open: false })}
          onSaved={load}
        />
      )}
    </Shell>
  )
}

function Shell({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-gradient">Portfolio</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Track your positions and performance</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-3.5" style={{ background: 'var(--surface)' }}>
      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold tabular-nums mt-1" style={{ color: color ?? 'var(--text)' }}>{value}</p>
      {sub && <p className="text-xs font-semibold tabular-nums mt-0.5" style={{ color: color ?? 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}
