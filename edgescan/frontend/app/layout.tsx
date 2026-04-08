import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EdgeScan — S&P 500 Stock Scanner',
  description: 'Composite fundamental + technical scoring for all 500 S&P 500 stocks.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
