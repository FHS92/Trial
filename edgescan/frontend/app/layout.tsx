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
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('edgescan_theme')==='light')document.documentElement.classList.add('light')}catch(e){}` }} />
      </head>
      <body>
        <div style={{ paddingBottom: '4.5rem' }}>{children}</div>
        <BottomNav />
      </body>
    </html>
  )
}
