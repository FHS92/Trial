import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-6 mt-auto">
      <div className="max-w-3xl mx-auto space-y-3">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <span className="font-semibold text-[var(--text-muted)]">Not investment advice.</span>{' '}
          EdgeScan scores, price targets, and AI-generated theses are algorithmic estimates for
          informational purposes only. They do not constitute personalised investment advice or a
          recommendation to buy or sell any security. Past performance is no guarantee of future
          results. Always consult a qualified financial adviser before making investment decisions.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <Link href="/methodology" className="hover:text-[var(--text)] transition-colors">
            Methodology
          </Link>
          <Link href="/legal" className="hover:text-[var(--text)] transition-colors">
            Legal &amp; Privacy
          </Link>
          <Link href="/legal#terms" className="hover:text-[var(--text)] transition-colors">
            Terms of Service
          </Link>
          <Link href="/legal#disclaimer" className="hover:text-[var(--text)] transition-colors">
            Disclaimer
          </Link>
          <span className="ml-auto">© {new Date().getFullYear()} EdgeScan</span>
        </div>
      </div>
    </footer>
  )
}
