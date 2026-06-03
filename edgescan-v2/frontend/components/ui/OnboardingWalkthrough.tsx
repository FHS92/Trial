'use client'

import { useState, useEffect } from 'react'
import { X, TrendingUp, BarChart2, Star, ArrowRight } from 'lucide-react'

const STEPS = [
  {
    icon: TrendingUp,
    title: 'See 500 S&P stocks ranked',
    body: 'Every S&P 500 stock scored 0–100 by our AI — combining fundamentals, technicals, and momentum in one number.',
    cta: 'Next',
  },
  {
    icon: BarChart2,
    title: 'Drill in for the full picture',
    body: 'Tap any stock for the AI investment thesis, score breakdown, price chart, and all technical signals.',
    cta: 'Next',
  },
  {
    icon: Star,
    title: 'Track your top picks',
    body: 'Add stocks to your watchlist to monitor them. Upgrade to Pro for unlimited picks and full AI analysis.',
    cta: 'Get Started',
  },
]

const STORAGE_KEY = 'edgescan_onboarded_v1'

export function OnboardingWalkthrough() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  function advance() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Step dots */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 20 : 6,
                  backgroundColor: i <= step ? 'var(--accent)' : 'var(--border)',
                }}
              />
            ))}
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 mb-4">
          <Icon className="h-6 w-6 text-[var(--accent)]" />
        </div>

        {/* Content */}
        <h2 className="text-lg font-bold text-[var(--text)] mb-2">{current.title}</h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">{current.body}</p>

        {/* Action */}
        <button
          onClick={advance}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {current.cta}
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="text-center text-xs text-[var(--text-muted)] mt-3">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  )
}
