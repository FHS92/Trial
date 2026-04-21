import type { Metadata } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'EdgeScan — S&P 500 Stock Scanner',
  description: 'Composite fundamental + technical scoring for all 500 S&P 500 stocks.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Extra bottom padding so content clears the fixed nav bar */}
        <div style={{ paddingBottom: '4.5rem' }}>{children}</div>
        <BottomNav />
      </body>
    </html>
  )
}
