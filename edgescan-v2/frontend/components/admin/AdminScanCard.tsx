'use client'

import { useState } from 'react'
import { Play, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { api, type AdminScanRun } from '@/lib/api'

function formatDuration(s: number | null): string {
  if (s == null) return ''
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function RunRow({ run }: { run: AdminScanRun }) {
  const isRunning = !run.completed_at
  const hasError = !!run.error

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0">
      <div className="shrink-0">
        {isRunning
          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
          : hasError
          ? <XCircle className="h-3.5 w-3.5 text-red-500" />
          : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[var(--text)]">
            {isRunning ? 'Running…' : `${run.tickers_succeeded.toLocaleString()} tickers`}
          </span>
          {run.tickers_failed > 0 && (
            <span className="text-[10px] text-red-400">{run.tickers_failed} failed</span>
          )}
          {run.duration_s != null && (
            <span className="text-[10px] text-[var(--text-muted)]">{formatDuration(run.duration_s)}</span>
          )}
          {hasError && (
            <span className="text-[10px] text-red-400 truncate max-w-[200px]">{run.error}</span>
          )}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
          {new Date(run.started_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
          {' · '}{run.data_source}
        </p>
      </div>
      <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">#{run.id}</span>
    </div>
  )
}

export function AdminScanCard({ initial }: { initial: AdminScanRun[] }) {
  const [runs, setRuns] = useState<AdminScanRun[]>(initial)
  const [triggering, setTriggering] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await api.admin.scanHistory(10)
      setRuns(res.runs)
    } catch {}
    finally { setRefreshing(false) }
  }

  async function handleTrigger() {
    if (!confirm('Trigger a full universe scan now? This runs in the background and may take several minutes.')) return
    setTriggering(true)
    setMsg(null)
    try {
      const res = await api.admin.triggerScan()
      setMsg({ text: `Scan #${res.run_id} started successfully.`, ok: true })
      const hist = await api.admin.scanHistory(10)
      setRuns(hist.runs)
    } catch (err: any) {
      setMsg({ text: err?.message ?? 'Failed to trigger scan.', ok: false })
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">Scan History</p>
          {msg && (
            <p className={`text-xs mt-0.5 ${msg.ok ? 'text-emerald-500' : 'text-red-400'}`}>
              {msg.text}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh history"
            className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
          >
            {triggering
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Play className="h-3.5 w-3.5" />}
            Run scan
          </button>
        </div>
      </div>
      {runs.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs text-[var(--text-muted)]">No scan runs yet.</div>
      ) : (
        runs.map(r => <RunRow key={r.id} run={r} />)
      )}
    </div>
  )
}
