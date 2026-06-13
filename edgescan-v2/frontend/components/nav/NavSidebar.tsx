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
  LogOut,
  Settings,
  Zap,
  ShieldCheck,
  Crown,
  Lock,
  Search,
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

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'ES'
}

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

  const isPro = user?.tier === 'pro'
  const initials = getInitials(user?.name, user?.email)

  return (
    <aside
      className={cn(
        'flex flex-col w-60 h-screen border-r shrink-0',
        'border-[var(--border)]',
        className
      )}
      style={{ background: 'var(--surface)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[var(--border)]">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] shadow-sm shrink-0"
          style={{ background: 'var(--pro-gradient)' }}
        >
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className="text-[17px] font-extrabold tracking-tight text-[var(--text)]">
          EdgeScan
        </span>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-[var(--border)]" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-subtle)] pointer-events-none" />
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
            aria-controls="nav-search-results"
            className={cn(
              'w-full rounded-[var(--radius-sm)] pl-8 pr-3 py-2 text-sm',
              'border border-[var(--border)]',
              'text-[var(--text)] placeholder:text-[var(--text-subtle)]',
              'focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_2px_var(--accent-glow)]',
              'transition-all duration-200'
            )}
            style={{ background: 'var(--bg)' }}
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
              id="nav-search-results"
              role="listbox"
              aria-label="Search results"
              className="absolute left-0 right-0 top-full mt-1 z-50 rounded-[var(--radius)] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-lg)]"
              style={{ background: 'var(--surface-elevated)' }}
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
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--accent-light)] transition-colors"
                >
                  <span className="font-mono font-bold text-[var(--text)] w-12 shrink-0 text-xs">{r.ticker}</span>
                  {r.name && <span className="text-xs text-[var(--text-muted)] truncate">{r.name}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2.5 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon, soon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium',
                'transition-all duration-150',
                isActive
                  ? 'text-[var(--accent)] shadow-[inset_0_0_14px_var(--accent-glow)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              )}
              style={isActive ? { background: 'var(--accent-light)' } : {}}
            >
              {isActive && (
                <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-[var(--accent)]" />
              )}
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[var(--accent)]' : '')} />
              {label}
              {soon && (
                <span className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-subtle)]"
                  style={{ background: 'var(--border)' }}>
                  Soon
                </span>
              )}
            </Link>
          )
        })}

        {user?.isAdmin && (
          <Link
            href="/admin"
            className={cn(
              'relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium',
              'transition-all duration-150',
              pathname === '/admin'
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/5'
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Admin
          </Link>
        )}

        {/* Upgrade CTA — free users only */}
        {user && !isPro && (
          <div className="pt-3">
            <Link
              href="/upgrade"
              className={cn(
                'pro-button flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold',
                'text-white shadow-md',
                pathname === '/upgrade' && 'opacity-80'
              )}
            >
              <Zap className="h-4 w-4 shrink-0 text-yellow-300" />
              Upgrade to Pro
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-[var(--border)] space-y-3">
        {/* Tier badge + theme */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            )}
            style={isPro ? {
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-glow)',
            } : {
              background: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            {isPro
              ? <><Crown className="h-3 w-3" /> Pro</>
              : <><Lock className="h-3 w-3" /> Free</>
            }
          </span>
          <ThemeToggle />
        </div>

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={isPro ? {
              background: 'var(--pro-gradient)',
              color: '#fff',
            } : {
              background: 'var(--border)',
              color: 'var(--text-muted)',
            }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--text)]">
              {user?.name ?? 'Guest'}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {user?.email ?? 'Not signed in'}
            </p>
          </div>
        </div>

        {/* Account + Sign out */}
        {user ? (
          <div className="flex items-center gap-1">
            <Link
              href="/account"
              className={cn(
                'flex flex-1 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium',
                'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors',
                pathname === '/account' && 'text-[var(--accent)]'
              )}
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              Account
            </Link>
            <button
              onClick={() => signOut({ redirectTo: '/login' })}
              aria-label="Sign out"
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/8 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="pro-button flex w-full items-center justify-center rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </aside>
  )
}
