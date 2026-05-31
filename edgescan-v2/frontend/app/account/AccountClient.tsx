'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { User, Crown, LogOut, Trash2, Check, X, CreditCard } from 'lucide-react'
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

export default function AccountClient({ user }: Props) {
  const [displayName, setDisplayName] = useState(user.name ?? '')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function saveName() {
    if (!displayName.trim()) {
      setNameError('Name cannot be empty.')
      return
    }
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
      setEditingName(false)
    } catch (err: any) {
      setNameError(err.message ?? 'Something went wrong.')
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
    } catch (err: any) {
      setDeleteError(err.message ?? 'Something went wrong.')
      setDeletingAccount(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-8">Account settings</h1>

      {/* Profile card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-full bg-[var(--border)] flex items-center justify-center shrink-0">
            <User className="h-7 w-7 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text)]">{user.name ?? 'No name set'}</p>
            <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
          </div>
          <div className="ml-auto">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                user.tier === 'pro'
                  ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/50'
                  : 'bg-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              {user.tier === 'pro' ? (
                <><Crown className="h-3 w-3" /> Pro</>
              ) : (
                'Free'
              )}
            </span>
          </div>
        </div>

        {/* Display name edit */}
        <div className="border-t border-[var(--border)] pt-4">
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            Display name
          </label>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-500 transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
              />
              <button
                onClick={saveName}
                disabled={savingName}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
                title="Save"
              >
                <Check className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={() => { setEditingName(false); setDisplayName(user.name ?? '') }}
                className="p-2 rounded-lg border border-[var(--border)] hover:border-slate-500 transition-colors"
                title="Cancel"
              >
                <X className="h-4 w-4 text-[var(--text-muted)]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text)]">{user.name ?? '—'}</span>
              <button
                onClick={() => setEditingName(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Edit
              </button>
            </div>
          )}
          {nameError && <p className="mt-1.5 text-xs text-red-400">{nameError}</p>}
        </div>

        {/* Email (read-only) */}
        <div className="border-t border-[var(--border)] pt-4 mt-4">
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            Email address
          </label>
          <span className="text-sm text-[var(--text)]">{user.email}</span>
        </div>
      </div>

      {/* Billing card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6">
        <h2 className="font-semibold text-[var(--text)] mb-1">Subscription</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {user.tier === 'pro'
            ? 'You are on the Pro plan.'
            : 'You are on the Free plan. Upgrade to unlock all features.'}
        </p>
        <a
          href="#billing"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          {user.tier === 'pro' ? 'Manage billing' : 'Upgrade to Pro'}
        </a>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
        <h2 className="font-semibold text-[var(--text)] mb-1">Account actions</h2>

        {/* Sign out */}
        <button
          onClick={() => signOut({ redirectTo: '/login' })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border)] hover:border-slate-500 text-[var(--text)] text-sm font-medium transition-colors"
        >
          <LogOut className="h-4 w-4 text-[var(--text-muted)]" />
          Sign out
        </button>

        {/* Delete account */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-red-700/40 hover:border-red-600 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete account
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-[#1a1d27] border border-[#2a2d3a] p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Delete account?</h3>
            <p className="text-slate-400 text-sm mb-6">
              This action is permanent and cannot be undone. All your data will be erased.
            </p>
            {deleteError && (
              <p className="mb-4 text-sm text-red-400">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError(null) }}
                className="flex-1 py-2.5 rounded-lg border border-[#2a2d3a] hover:border-slate-500 text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
