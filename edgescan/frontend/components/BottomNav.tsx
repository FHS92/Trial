'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const PRIMARY_NAV = [
  {
    href: '/scanner',
    label: 'Scanner',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/search',
    label: 'Search',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
      </svg>
    ),
  },
  {
    href: '/watchlist',
    label: 'Watchlist',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
  {
    href: '/portfolio',
    label: 'Portfolio',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2" />
      </svg>
    ),
  },
]

const MORE_NAV = [
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V3H8v8H2v10h20V11h-6zM8 21H4v-6h4v6zm6 0h-4v-8h4v8zm6 0h-4v-4h4v4z" />
      </svg>
    ),
  },
  {
    href: '/backtest',
    label: 'Backtest',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    href: '/earnings',
    label: 'Earnings',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/compare',
    label: 'Compare',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/heatmap',
    label: 'Heatmap',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    href: '/paper-trading',
    label: 'Paper Trading',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/chat',
    label: 'AI Chat',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: '/rebalance',
    label: 'Rebalance',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    href: '/weekly',
    label: 'Weekly',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [profileName, setProfileName] = useState<string | null>(null)

  useEffect(() => {
    setProfileName(sessionStorage.getItem('edgescan_profile_name'))
  }, [])

  function handleSwitchProfile() {
    sessionStorage.removeItem('edgescan_profile_token')
    sessionStorage.removeItem('edgescan_profile_name')
    setOpen(false)
    router.push('/')
  }

  const moreActive = MORE_NAV.some(n => pathname === n.href)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* More tray — slides up from above the nav bar */}
      <div
        className="fixed left-0 right-0 z-40 transition-all duration-300"
        style={{
          bottom: open ? '4.5rem' : '4.5rem',
          transform: open ? 'translateY(0)' : 'translateY(calc(100% + 4.5rem))',
          background: 'rgba(10,14,23,0.98)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 16px 8px',
        }}
      >
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4a556b' }}>More</span>
            {profileName && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}
              >
                {profileName}
              </span>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#6b7a99' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1">
          {MORE_NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-colors"
                style={{
                  background: active ? 'rgba(79,142,247,0.12)' : 'rgba(255,255,255,0.03)',
                  color: active ? '#4f8ef7' : '#8492aa',
                }}
              >
                <span style={{ color: active ? '#4f8ef7' : '#8492aa' }}>{icon}</span>
                <span className="text-[10px] font-medium leading-tight text-center">{label}</span>
              </Link>
            )
          })}
          {/* Switch Profile */}
          <button
            onClick={handleSwitchProfile}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-colors"
            style={{
              background: 'rgba(255,255,255,0.03)',
              color: '#8492aa',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: '#8492aa' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[10px] font-medium leading-tight text-center">Switch Profile</span>
          </button>
        </div>
      </div>

      {/* Main nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: 'rgba(8,11,18,0.97)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {PRIMARY_NAV.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors"
              style={{ color: active ? '#4f8ef7' : '#4a556b' }}
            >
              <span style={{ color: active ? '#4f8ef7' : '#4a556b' }}>{icon}</span>
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors"
          style={{ color: open || moreActive ? '#4f8ef7' : '#4a556b', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
            style={{ color: open || moreActive ? '#4f8ef7' : '#4a556b' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px] font-medium leading-tight">More</span>
        </button>
      </nav>
    </>
  )
}
