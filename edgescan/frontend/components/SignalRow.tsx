import type { SignalDisplay, SignalStatus } from '@/lib/types'

const DOT: Record<SignalStatus, string> = {
  green: '#22d47e',
  amber: '#f5a623',
  red:   '#f75f5f',
}

interface Props {
  signal: SignalDisplay
}

export function SignalDot({ status }: { status: SignalStatus }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: 8, height: 8, background: DOT[status] }}
    />
  )
}

export default function SignalRow({ signal }: Props) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center gap-2">
        <SignalDot status={signal.status} />
        <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>{signal.label}</span>
      </div>
      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{signal.value}</span>
    </div>
  )
}
