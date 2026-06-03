'use client'

import { useEffect, useRef, useState } from 'react'

type Variant = 'fade-up' | 'fade-in' | 'scale-up' | 'slide-left' | 'slide-right'

interface ScrollRevealProps {
  children: React.ReactNode
  variant?: Variant
  delay?: number
  className?: string
  once?: boolean
}

const VARIANT_CLASS: Record<Variant, string> = {
  'fade-up': 'sr-fade-up',
  'fade-in': 'sr-fade-in',
  'scale-up': 'sr-scale-up',
  'slide-left': 'sr-slide-left',
  'slide-right': 'sr-slide-right',
}

export function ScrollReveal({
  children,
  variant = 'fade-up',
  delay = 0,
  className = '',
  once = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once])

  return (
    <div
      ref={ref}
      className={`sr-base ${VARIANT_CLASS[variant]} ${visible ? 'sr-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
