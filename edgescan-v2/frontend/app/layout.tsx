import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { NavSidebar } from '@/components/nav/NavSidebar'
import { BottomNav } from '@/components/nav/BottomNav'
import './globals.css'

export const metadata: Metadata = {
  title: 'EdgeScan — S&P 500 Stock Scanner',
  description: 'AI-powered stock scanner with fundamental and technical scoring for S&P 500 stocks.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex h-screen overflow-hidden">
            {/* Desktop: sidebar */}
            <NavSidebar className="hidden md:flex" />
            {/* Main content */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
              {children}
            </main>
            {/* Mobile: bottom tabs */}
            <BottomNav className="md:hidden" />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
