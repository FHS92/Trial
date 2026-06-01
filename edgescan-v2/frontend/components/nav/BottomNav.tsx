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
        'flex items-stretch h-16',
        'bg-[var(--surface)] border-t border-[var(--border)]',
        className
      )}
    >
      {navItems.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1',
              'text-xs font-medium transition-colors duration-150',
              isActive
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
