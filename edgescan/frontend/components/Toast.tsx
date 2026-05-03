'use client'

import { useEffect, useState } from 'react'

interface Props {
  message: string
  onDone: () => void
}

export default function Toast({ message, onDone }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance on next tick so CSS transition fires
    const enter = requestAnimationFrame(() => setVisible(true))
    const exit = setTimeout(() => setVisible(false), 2000)
    return () => {
      cancelAnimationFrame(enter)
      clearTimeout(exit)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    // After setting visible=false, wait for fade-out then call onDone
  }, [visible])

  function handleTransitionEnd() {
    if (!visible) onDone()
  }

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      style={{
        position: 'fixed',
        bottom: '5.5rem',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 10}px)`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.22s ease, transform 0.22s ease',
        background: '#1e2540',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#e2e8f8',
        borderRadius: 10,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 500,
        zIndex: 9999,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      {message}
    </div>
  )
}
