'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Crown, LogOut, Trash2, Check, X, CreditCard, Loader2, Zap } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { Tier } from '@/lib/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Props {
  user: {
    id: string
    email: string
    name: string | null
    tier: Tier
    isAdmin: boolean
  }
}

function getInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default function AccountClient({ user }: Props) {
  const [savedName, setSavedName] = useState(user.name ?? '')
  const [displayName, setDisplayName] = useState(user.name ?? '')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  const isPro = user.tier === 'pro'
  const initials = getInitials(user.name, user.email)

  async function handleBillingClick() {
    setBillingLoading(true)
    setBillingError(null)
    try {
      if (isPro) {
        const { url } = await api.billing.portal()
        window.location.href = url
      } else {
        window.location.href = '/upgrade'
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        window.location.href = '/upgrade'
      } else {
        setBillingError('Unable to open billing portal. Please try again.')
        setBillingLoading(false)
      }
    }
  }

  async function saveName() {
    if (!displayName.trim()) { setNameError('Name cannot be empty.'); return }
    setSavingName(true)
    setNameError(null)
    try {
      const res = await fetch(`${API}/api/v1/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to update name.')
      setSavedName(displayName.trim())
      setEditingName(false)
    } catch (err: unknown) {
      setNameError((err as Error).message ?? 'Something went wrong.')
    } finally {
      setSavingName(false)
    }
  }

  async function deleteAccount() {
    setDeletingAccount(true)
    setDeleteError(null)
    try {
      const res = await fetch(`${API}/api/v1/auth/account`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete account.')
      await signOut({ redirectTo: '/login' })
    } catch (err: unknown) {
      setDeleteError((err as Error).message ?? 'Something went wrong.')
      setDeletingAccount(false)
    }
  }

  const inputClass = [
    'flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-sm',
    'border border-[var(--border)]',
    'text-[var(--text)] focus:outline-none focus:border-[var(--accent)]',
    'focus:shadow-[0_0_0_2px_var(--accent-glow)] transition-all duration-200',
  ].join(' ')

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] mb-7">Account settings</h1>

      {/* Profile card */}
      <div
        className="rounded-[var(--radius-xl)] border border-[var(--border)] mb-4 overflow-hidden shadow-[var(--shadow-sm)]"
        style={{ background: 'var(--surface)' }}
      >
        {/* Cover strip */}
        <div
          className="h-14"
          style={{
            background: isPro
              ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.08) 100%)'
              : 'var(--surface-elevated)',
          }}
        />

        <div className="px-6 pb-6">
          {/* Avatar + name row */}
          <div className="flex items-end justify-between -mt-7 mb-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-base font-extrabold border-2 border-[var(--surface)] shadow-[var(--shadow-sm)]"
              style={isPro ? {
                background: 'var(--pro-gradient)',
                color: '#fff',
              } : {
                background: 'var(--surface-elevated)',
                color: 'var(--text-muted)',
                borderColor: 'var(--border)',
              }}
            >
              {initials}
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={isPro ? {
                background: 'var(--accent-light)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-glow)',
              } : {
                background: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              {isPro ? <><Crown className="h-3 w-3" /> Pro Member</> : 'Free Plan'}
            </span>
          </div>

          <p className="font-bold text-[var(--text)] text-base">{savedName || 'No name set'}</p>
          <p className="text-sm text-[var(--text-muted)]">{user.email}</p>

          {/* Display name edit */}
          <div className="border-t border-[var(--border)] pt-4 mt-5">
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
              Display name
            </label>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                  style={{ background: 'var(--bg)' }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="p-2 rounded-[var(--radius-sm)] text-white transition-opacity hover:opacity-90 disabled:opacity-50 shadow-sm"
                  style={{ background: 'var(--accent)' }}
                  title="Save"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setEditingName(false); setDisplayName(savedName) }}
                  className="p-2 rounded-[var(--radius-sm)] border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4 text-[var(--text-muted)]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text)]">{savedName || '—'}</span>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  Edit
                </button>
              </div>
            )}
            {nameError && <p className="mt-1.5 text-xs text-red-400">{nameError}</p>}
          </div>

          {/* Email */}
          <div className="border-t border-[var(--border)] pt-4 mt-4">
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
              Email address
            </label>
            <span className="text-sm text-[var(--text)]">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Subscription card */}
      <div
        className="rounded-[var(--radius-xl)] border border-[var(--border)] p-6 mb-4 shadow-[var(--shadow-sm)]"
        style={{ background: 'var(--surface)' }}
      >
        <h2 className="font-bold text-[var(--text)] tracking-tight mb-0.5">Subscription</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {isPro
            ? 'You are on the Pro plan. Manage billing below.'
            : 'You are on the Free plan. Upgrade to unlock all features.'}
        </p>
        <button
          onClick={handleBillingClick}
          disabled={billingLoading}
          className="pro-button inline-flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-[var(--radius)] transition-opacity hover:opacity-90 disabled:opacity-70 shadow-sm"
        >
          {billingLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : isPro
              ? <CreditCard className="h-4 w-4" />
              : <Zap className="h-4 w-4 text-yellow-300" />
          }
          {isPro ? 'Manage billing' : 'Upgrade to Pro'}
        </button>
        {billingError && <p className="mt-2 text-xs text-red-400">{billingError}</p>}
      </div>

      {/* Danger zone */}
      <div
        className="rounded-[var(--radius-xl)] border border-[var(--border)] p-6 space-y-3 shadow-[var(--shadow-sm)]"
        style={{ background: 'var(--surface)' }}
      >
        <h2 className="font-bold text-[var(--text)] tracking-tight">Account actions</h2>

        <button
          onClick={() => signOut({ redirectTo: '/login' })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] border border-[var(--border)] hover:border-[var(--text-muted)] text-[var(--text)] text-sm font-medium transition-colors"
        >
          <LogOut className="h-4 w-4 text-[var(--text-muted)]" />
          Sign out
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] border text-sm font-medium transition-colors"
          style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#f87171' }}
        >
          <Trash2 className="h-4 w-4" />
          Delete account
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--border)] p-6 shadow-[var(--shadow-lg)]"
            style={{ background: 'var(--surface-elevated)' }}
          >
            <h3 className="text-lg font-bold text-[var(--text)] mb-2">Delete account?</h3>
            <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
              This action is permanent and cannot be undone. All your data will be erased.
            </p>
            {deleteError && <p className="mb-4 text-sm text-red-400">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError(null) }}
                className="flex-1 py-2.5 rounded-[var(--radius)] border border-[var(--border)] hover:border-[var(--text-muted)] text-[var(--text)] text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-2.5 rounded-[var(--radius)] text-white text-sm font-bold transition-colors disabled:opacity-50"
                style={{ background: '#dc2626' }}
              >
                {deletingAccount ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
