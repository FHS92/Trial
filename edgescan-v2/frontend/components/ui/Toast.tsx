'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  message: string
  variant?: ToastVariant
  duration?: number
}

interface ToastItemProps extends ToastMessage {
  onDismiss: (id: string) => void
}

function ToastItem({ id, message, variant = 'info', duration = 4000, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  const Icon = variant === 'success' ? CheckCircle : variant === 'error' ? AlertCircle : Info
  const iconColor =
    variant === 'success' ? 'text-[#22c55e]' : variant === 'error' ? 'text-[#ef4444]' : 'text-[var(--accent)]'

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-[var(--border)]',
        'bg-[var(--surface)] shadow-lg px-4 py-3',
        'animate-in slide-in-from-bottom-2 fade-in duration-300'
      )}
    >
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColor)} />
      <p className="flex-1 text-sm text-[var(--text)]">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// Simple hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (message: string, variant: ToastVariant = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, variant, duration }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return { toasts, addToast, dismissToast }
}
