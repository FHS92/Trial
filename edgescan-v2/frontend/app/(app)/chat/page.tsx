import { MessageSquare, Sparkles, Lock } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'

export const metadata = { title: 'AI Chat — EdgeScan' }

const EXAMPLE_PROMPTS = [
  'Why is NVDA scoring 87 this week?',
  'Find me cheap tech stocks with strong earnings growth',
  'Compare AAPL vs MSFT on fundamentals',
  'What sectors are looking strongest right now?',
]

export default async function ChatPage() {
  const currentUser = await getCurrentUser()
  const isPro = currentUser?.tier === 'pro'

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-gradient">AI Chat</h1>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-glow)' }}
          >
            <Sparkles className="h-2.5 w-2.5" />
            Coming Soon
          </span>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Ask EdgeScan AI about any stock or market question
        </p>
      </div>

      {/* Main coming-soon card */}
      <div
        className="gradient-border rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-md)] mb-5"
        style={{ background: 'var(--surface-elevated)' }}
      >
        <div className="relative p-10 flex flex-col items-center text-center">
          {/* Background glow */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, #10b981, transparent)' }}
            aria-hidden="true"
          />

          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl mb-5 shadow-[var(--shadow-sm)]"
            style={{ background: 'var(--pro-gradient)' }}
          >
            <MessageSquare className="h-8 w-8 text-white" />
          </div>

          <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight mb-2">
            AI Chat is in development
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed mb-6">
            Soon you&apos;ll be able to ask EdgeScan AI anything — powered by real scanner data, scores, and theses for all 500 stocks.
          </p>

          {!isPro && (
            <Link
              href="/upgrade"
              className="pro-button inline-flex items-center gap-2 rounded-[var(--radius)] px-5 py-2.5 text-sm font-bold text-white shadow-md"
            >
              <Sparkles className="h-4 w-4 text-yellow-300" />
              Get early access with Pro
            </Link>
          )}
        </div>
      </div>

      {/* Example prompts preview */}
      <div>
        <p className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-3 px-1">
          Questions you&apos;ll be able to ask
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <div
              key={prompt}
              className="flex items-start gap-2.5 rounded-[var(--radius)] border border-[var(--border)] px-4 py-3"
              style={{ background: 'var(--surface)' }}
            >
              {isPro
                ? <Lock className="h-3.5 w-3.5 text-[var(--text-subtle)] mt-0.5 shrink-0" />
                : <Sparkles className="h-3.5 w-3.5 text-[var(--text-subtle)] mt-0.5 shrink-0" />
              }
              <span className="text-sm text-[var(--text-muted)] italic">&ldquo;{prompt}&rdquo;</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
