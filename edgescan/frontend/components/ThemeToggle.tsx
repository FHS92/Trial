'use client'

import { useState, useEffect } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function ThemeToggle() {
  const [light, setLight] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('edgescan_theme') === 'light') {
      document.documentElement.classList.add('light')
      setLight(true)
    }
  }, [])

  async function toggle() {
    const next = !light
    setLight(next)
    if (next) {
      document.documentElement.classList.add('light')
      localStorage.setItem('edgescan_theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      localStorage.setItem('edgescan_theme', 'dark')
    }

    const token = sessionStorage.getItem('edgescan_profile_token')
    const profileId = sessionStorage.getItem('edgescan_profile_id')
    if (token && profileId) {
      fetch(`${BASE}/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ themePref: next ? 'light' : 'dark' }),
      }).catch(() => {})
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-colors hover:brightness-110"
      style={{ background: 'var(--color-border)', color: '#8492aa', border: 'none', cursor: 'pointer' }}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {light ? (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M18.364 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
        </svg>
      )}
      <span className="text-[10px] font-medium leading-tight text-center">
        {light ? 'Dark mode' : 'Light mode'}
      </span>
    </button>
  )
}
