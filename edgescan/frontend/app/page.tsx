'use client'

import { useRouter } from 'next/navigation'
import { Universe, UNIVERSE_LABELS } from '@/hooks/useUniverse'

const UNIVERSES: {
  value: Universe
  label: string
  subtitle: string
  stats: { label: string; value: string }[]
  accent: string
  desc: string
}[] = [
  {
    value: 'sp500',
    label: 'S&P 500',
    subtitle: 'Large-cap U.S. leaders',
    accent: '#4f8ef7',
    desc: 'The 500 largest publicly traded U.S. companies by market cap. Represents ~80% of total U.S. market value.',
    stats: [
      { label: 'Companies', value: '504' },
      { label: 'Market cap', value: '~$44T' },
      { label: 'Avg score data', value: 'Deep' },
    ],
  },
  {
    value: 'russell',
    label: 'Russell 1000',
    subtitle: 'Large + mid-cap coverage',
    accent: '#a78bfa',
    desc: 'The top 1,000 U.S. companies by market cap. Adds ~500 mid-cap names beyond the S&P 500 for broader coverage.',
    stats: [
      { label: 'Companies', value: '1,000' },
      { label: 'Market cap', value: '~$47T' },
      { label: 'Avg score data', value: 'Broader' },
    ],
  },
]

export default function UniverseSelectPage() {
  const router = useRouter()

  function pick(u: Universe) {
    localStorage.setItem('edgescan_universe', u)
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
          Technical + Fundamental scoring · Jan 2020 model · Top picks monthly rotation
        </p>
      </div>

      <p className="text-base font-semibold mb-6" style={{ color: '#e2e8f8' }}>
        Select your universe to begin
      </p>

      {/* Universe cards */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        {UNIVERSES.map(u => (
          <button
            key={u.value}
            onClick={() => pick(u.value)}
            className="flex-1 text-left rounded-2xl p-6 transition-all hover:scale-[1.02] active:scale-[0.99]"
            style={{
              background: '#0f1521',
              border: `1px solid rgba(255,255,255,0.08)`,
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.border = `1px solid ${u.accent}55`
              ;(e.currentTarget as HTMLElement).style.background = `rgba(15,21,33,1)`
              ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 32px ${u.accent}22`
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.border = `1px solid rgba(255,255,255,0.08)`
              ;(e.currentTarget as HTMLElement).style.background = '#0f1521'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xl font-bold" style={{ color: u.accent }}>{u.label}</p>
                <p className="text-sm mt-0.5" style={{ color: '#6b7a99' }}>{u.subtitle}</p>
              </div>
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={u.accent} strokeWidth={2} className="mt-1 flex-shrink-0"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Description */}
            <p className="text-xs mb-4 leading-relaxed" style={{ color: '#8492aa' }}>{u.desc}</p>

            {/* Stats */}
            <div className="flex gap-4">
              {u.stats.map(s => (
                <div key={s.label}>
                  <p className="text-xs font-bold" style={{ color: '#e2e8f8' }}>{s.value}</p>
                  <p className="text-[10px]" style={{ color: '#6b7a99' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div
              className="mt-5 text-xs font-semibold px-3 py-1.5 rounded-lg text-center"
              style={{ background: `${u.accent}18`, color: u.accent, border: `1px solid ${u.accent}30` }}
            >
              Launch {UNIVERSE_LABELS[u.value]} →
            </div>
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs text-center" style={{ color: '#3a4259' }}>
        You can switch universes at any time from within the app
      </p>
    </div>
  )
}
