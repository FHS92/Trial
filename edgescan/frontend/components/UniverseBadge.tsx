'use client'

export default function UniverseBadge() {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: 'rgba(79,142,247,0.12)',
        border: '1px solid rgba(79,142,247,0.25)',
        color: '#4f8ef7',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
      S&amp;P 500
    </div>
  )
}
