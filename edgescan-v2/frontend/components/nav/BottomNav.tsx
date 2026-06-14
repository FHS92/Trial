'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  Star,
  Briefcase,
  Calendar,
  UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  className?: string
}

const navItems = [
  { label: 'Scan', href: '/scanner', icon: BarChart2 },
  { label: 'Watchlist', href: '/watchlist', icon: Star },
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { label: 'Earnings', href: '/earnings', icon: Calendar },
  { label: 'Account', href: '/account', icon: UserCircle },
]

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'border-t border-[var(--border)]',
        'backdrop-blur-md',
        className
      )}
      // Extend the bar into the home-indicator safe area so it never floats above the OS gesture bar
      style={{ background: 'rgba(17,17,24,0.88)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-16">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 relative',
                'text-xs font-medium transition-colors duration-150',
                'min-w-0', // allow labels to shrink instead of overflowing on narrow phones
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              )}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate max-w-full">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
