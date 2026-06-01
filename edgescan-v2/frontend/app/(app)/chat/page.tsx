import { MessageSquare } from 'lucide-react'

export default function ChatPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Chat</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Ask EdgeScan AI about any stock or market question
      </p>

      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed border-[var(--border)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--border)] mb-4">
          <MessageSquare className="h-7 w-7 text-[var(--text-muted)]" />
        </div>
        <p className="text-base font-medium text-[var(--text)] mb-2">
          AI Chat coming soon
        </p>
        <p className="text-sm text-[var(--text-muted)] max-w-xs">
          Chat with an AI that knows every stock in the scanner. Ask &ldquo;Why is AAPL scoring 82?&rdquo; or &ldquo;Find me cheap tech stocks with strong earnings growth.&rdquo;
        </p>
      </div>
    </div>
  )
}
