'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import {
  BarChart2,
  Star,
  Briefcase,
  Calendar,
  MessageSquare,
  TrendingUp,
  User,
  LogOut,
  Settings,
  Zap,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { signOut } from 'next-auth/react'
import { api } from '@/lib/api'

interface NavSidebarProps {
  className?: string
}

const navItems = [
  { label: 'Scan', href: '/scanner', icon: BarChart2, soon: false },
  { label: 'Watchlist', href: '/watchlist', icon: Star, soon: false },
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase, soon: true },
  { label: 'Earnings', href: '/earnings', icon: Calendar, soon: false },
  { label: 'Chat', href: '/chat', icon: MessageSquare, soon: true },
]

export function NavSidebar({ className }: NavSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useCurrentUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ ticker: string; name: string | null }[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (!searchQuery.trim()) { setSearchResults([]); setSearchOpen(false); return }
    searchDebounce.current = setTimeout(async () => {
      try {
        const data = await api.search(searchQuery.trim())
        setSearchResults(data.results.slice(0, 6))
        setSearchOpen(true)
      } catch { setSearchResults([]) }
    }, 200)
  }, [searchQuery])

  useEffect(() => {
    function handleOut(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleOut)
    return () => document.removeEventListener('mousedown', handleOut)
  }, [])

  return (
    <aside
      className={cn(
        'flex flex-col w-60 h-screen border-r shrink-0',
        'bg-[var(--surface)] border-[var(--border)]',
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-[var(--border)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-[var(--text)]">
          EdgeScan
        </span>
        <span className="ml-auto text-xs text-[var(--text-muted)] font-mono">v2</span>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-[var(--border)]" ref={searchRef}>
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            placeholder="Search tickers…"
            aria-label="Search stocks"
            aria-expanded={searchOpen && searchResults.length > 0}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            className={cn(
              'w-full rounded-md px-3 py-2 text-sm',
              'bg-[var(--bg)] border border-[var(--border)]',
              'text-[var(--text)] placeholder:text-[var(--text-muted)]',
              'focus:outline-none focus:ring-1 focus:ring-[var(--accent)]',
              'transition-colors'
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = searchQuery.trim()
                if (value) {
                  router.push(`/stock/${value.toUpperCase()}`)
                  setSearchQuery('')
                  setSearchOpen(false)
                }
              } else if (e.key === 'Escape') {
                setSearchOpen(false)
              }
            }}
          />
          {searchOpen && searchResults.length > 0 && (
            <div
              role="listbox"
              aria-label="Search results"
              className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden"
            >
              {searchResults.map(r => (
                <button
                  key={r.ticker}
                  role="option"
                  aria-selected={false}
                  onMouseDown={() => {
                    router.push(`/stock/${r.ticker}`)
                    setSearchQuery('')
                    setSearchOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-[var(--border)]/50 transition-colors"
                >
                  <span className="font-mono font-semibold text-[var(--text)] w-12 shrink-0">{r.ticker}</span>
                  {r.name && <span className="text-xs text-[var(--text-muted)] truncate">{r.name}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon, soon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium',
                'transition-colors duration-150',
                isActive
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50'
              )}
            >
              {isActive && (
                <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-r bg-[var(--accent)]" />
              )}
              <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-[var(--accent)]')} />
              {label}
              {soon && (
                <span className="ml-auto shrink-0 rounded-full bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                  Soon
                </span>
              )}
            </Link>
          )
        })}

        {/* Admin link — only shown to admins */}
        {user?.isAdmin && (
          <Link
            href="/admin"
            className={cn(
              'relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium',
              'transition-colors duration-150',
              pathname === '/admin'
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/5'
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Admin
          </Link>
        )}

        {/* Upgrade CTA — only shown to free users */}
        {user && user.tier !== 'pro' && (
          <div className="pt-2">
            <Link
              href="/upgrade"
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold',
                'text-white transition-opacity hover:opacity-90',
                pathname === '/upgrade' && 'opacity-80'
              )}
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Zap className="h-4 w-4 shrink-0" />
              Upgrade to Pro
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-[var(--border)] space-y-3">
        {/* Tier badge + theme toggle */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              user?.tier === 'pro'
                ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                : 'bg-[var(--border)] text-[var(--text-muted)]'
            )}
          >
            <span aria-hidden="true">{user?.tier === 'pro' ? '⚡' : '🔒'}</span>
          {user?.tier === 'pro' ? 'Pro' : 'Free'}
          </span>
          <ThemeToggle />
        </div>

        {/* User info */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--border)]">
            <User className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--text)]">
              {user?.name ?? 'Guest'}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {user?.email ?? 'Not signed in'}
            </p>
          </div>
        </div>

        {/* Account + Sign out row */}
        {user ? (
          <div className="flex items-center gap-1">
            <Link
              href="/account"
              className={cn(
                'flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium',
                'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors',
                pathname === '/account' && 'text-[var(--accent)]'
              )}
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              Account
            </Link>
            <button
              onClick={() => signOut({ redirectTo: '/login' })}
              aria-label="Sign out"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--border)]/50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Sign in
          </Link>
        )}
      </div>
    </aside>
  )
}
