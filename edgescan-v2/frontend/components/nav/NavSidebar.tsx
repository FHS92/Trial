'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  Star,
  Briefcase,
  Calendar,
  MessageSquare,
  TrendingUp,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface NavSidebarProps {
  className?: string
}

const navItems = [
  { label: 'Scan', href: '/scanner', icon: BarChart2 },
  { label: 'Watchlist', href: '/watchlist', icon: Star },
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { label: 'Earnings', href: '/earnings', icon: Calendar },
  { label: 'Chat', href: '/chat', icon: MessageSquare },
]

export function NavSidebar({ className }: NavSidebarProps) {
  const pathname = usePathname()
  const { user } = useCurrentUser()

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
      <div className="px-3 py-3 border-b border-[var(--border)]">
        <div className="relative">
          <input
            type="search"
            placeholder="Search tickers..."
            className={cn(
              'w-full rounded-md px-3 py-2 text-sm',
              'bg-[var(--bg)] border border-[var(--border)]',
              'text-[var(--text)] placeholder:text-[var(--text-muted)]',
              'focus:outline-none focus:ring-1 focus:ring-[var(--accent)]',
              'transition-colors'
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = (e.target as HTMLInputElement).value.trim()
                if (value) {
                  window.location.href = `/stock/${value.toUpperCase()}`
                }
              }
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium',
                'transition-colors duration-150',
                isActive
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-l-2 border-[var(--accent)] rounded-l-none'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-[var(--accent)]')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-[var(--border)] space-y-3">
        {/* Tier badge */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              user?.tier === 'pro'
                ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                : 'bg-[var(--border)] text-[var(--text-muted)]'
            )}
          >
            {user?.tier === 'pro' ? '⚡ Pro' : '🔒 Free'}
          </span>
          <ThemeToggle />
        </div>

        {/* User info */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--border)]">
            <User className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--text)]">
              {user?.name ?? 'Guest'}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {user?.email ?? 'Not signed in'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
