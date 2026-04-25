'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PinModal from '@/components/PinModal'
import NewProfileModal from '@/components/NewProfileModal'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Profile {
  id: string
  name: string
  avatarColour: string
  hasPin: boolean
  createdAt: string | null
}

export default function ProfilePickerPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [pinProfile, setPinProfile] = useState<Profile | null>(null)
  const [showNew, setShowNew] = useState(false)

  async function fetchProfiles() {
    try {
      const res = await fetch(`${BASE}/api/profiles`, { cache: 'no-store' })
      if (res.ok) {
        const data: Profile[] = await res.json()
        setProfiles(data)
      }
    } catch {
      // backend may not be running locally
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  async function unlockProfile(profile: Profile) {
    if (profile.hasPin) {
      setPinProfile(profile)
      return
    }
    // No PIN — unlock directly
    try {
      const res = await fetch(`${BASE}/api/profiles/${profile.id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        sessionStorage.setItem('edgescan_profile_token', data.token)
        sessionStorage.setItem('edgescan_profile_name', profile.name)
        router.push('/scanner')
      }
    } catch {
      // ignore
    }
  }

  function handlePinSuccess(token: string, profileName: string) {
    sessionStorage.setItem('edgescan_profile_token', token)
    sessionStorage.setItem('edgescan_profile_name', profileName)
    setPinProfile(null)
    router.push('/scanner')
  }

  function handleNewProfileSuccess(token: string, profileName: string) {
    sessionStorage.setItem('edgescan_profile_token', token)
    sessionStorage.setItem('edgescan_profile_name', profileName)
    setShowNew(false)
    router.push('/scanner')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#080b12' }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-1 mb-3">
          <span className="text-3xl font-bold tracking-tight" style={{ color: '#4f8ef7' }}>Edge</span>
          <span className="text-3xl font-bold tracking-tight" style={{ color: '#e2e8f8' }}>Scan</span>
        </div>
        <p className="text-sm" style={{ color: '#6b7a99' }}>
          Select your profile to continue
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2" style={{ color: '#6b7a99' }}>
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span className="text-sm">Loading profiles…</span>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl w-full">
          {profiles.map(profile => (
            <button
              key={profile.id}
              onClick={() => unlockProfile(profile)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all hover:scale-[1.04] active:scale-[0.97]"
              style={{
                background: '#0f1521',
                border: '1px solid rgba(255,255,255,0.08)',
                width: '130px',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.border = `1px solid ${profile.avatarColour}55`
                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${profile.avatarColour}22`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              {/* Avatar circle */}
              <div
                className="relative flex items-center justify-center rounded-full text-xl font-bold"
                style={{
                  width: '56px',
                  height: '56px',
                  background: profile.avatarColour,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {profile.name.charAt(0).toUpperCase()}
                {profile.hasPin && (
                  <span
                    className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full"
                    style={{ width: '20px', height: '20px', background: '#1a2035', border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7a99" strokeWidth={2.5}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-center truncate w-full" style={{ color: '#e2e8f8' }}>
                {profile.name}
              </span>
            </button>
          ))}

          {/* New Profile card */}
          <button
            onClick={() => setShowNew(true)}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all hover:scale-[1.04] active:scale-[0.97]"
            style={{
              background: '#0f1521',
              border: '1px dashed rgba(255,255,255,0.15)',
              width: '130px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.border = '1px dashed rgba(79,142,247,0.5)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.border = '1px dashed rgba(255,255,255,0.15)'
            }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: '56px', height: '56px', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth={2}>
                <path strokeLinecap="round" d="M12 4v16M4 12h16" />
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: '#4f8ef7' }}>New Profile</span>
          </button>
        </div>
      )}

      {/* PIN Modal */}
      {pinProfile && (
        <PinModal
          profileId={pinProfile.id}
          profileName={pinProfile.name}
          onSuccess={(token) => handlePinSuccess(token, pinProfile.name)}
          onClose={() => setPinProfile(null)}
        />
      )}

      {/* New Profile Modal */}
      {showNew && (
        <NewProfileModal
          onSuccess={handleNewProfileSuccess}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  )
}
