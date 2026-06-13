import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export function Footer() {
  return (
    <footer
      className="border-t border-[var(--border)] px-4 py-6 mt-auto"
      style={{ background: 'var(--surface)' }}
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Logo row */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-[4px]"
            style={{ background: 'var(--pro-gradient)' }}
          >
            <TrendingUp className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-bold text-[var(--text-muted)] tracking-tight">EdgeScan</span>
        </div>

        <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
          <span className="font-semibold text-[var(--text-muted)]">Not investment advice.</span>{' '}
          EdgeScan scores, price targets, and AI-generated theses are algorithmic estimates for
          informational purposes only. They do not constitute personalised investment advice or a
          recommendation to buy or sell any security. Past performance is no guarantee of future
          results. Always consult a qualified financial adviser before making investment decisions.
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-subtle)]">
          <Link href="/methodology" className="hover:text-[var(--text-muted)] transition-colors">
            Methodology
          </Link>
          <Link href="/legal" className="hover:text-[var(--text-muted)] transition-colors">
            Legal &amp; Privacy
          </Link>
          <Link href="/legal#terms" className="hover:text-[var(--text-muted)] transition-colors">
            Terms
          </Link>
          <Link href="/legal#disclaimer" className="hover:text-[var(--text-muted)] transition-colors">
            Disclaimer
          </Link>
          <span className="ml-auto">© {new Date().getFullYear()} EdgeScan</span>
        </div>
      </div>
    </footer>
  )
}
