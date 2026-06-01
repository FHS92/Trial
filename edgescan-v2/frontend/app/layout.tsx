import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import { NavSidebar } from '@/components/nav/NavSidebar'
import { BottomNav } from '@/components/nav/BottomNav'
import { Footer } from '@/components/ui/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'EdgeScan — S&P 500 Stock Scanner',
  description: 'AI-powered stock scanner with fundamental and technical scoring for S&P 500 stocks.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider session={session}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <div className="flex h-screen overflow-hidden">
              {/* Desktop: sidebar */}
              <NavSidebar className="hidden md:flex" />
              {/* Main content */}
              <main className="flex-1 overflow-y-auto pb-16 md:pb-0 flex flex-col">
                <div className="flex-1">
                  {children}
                </div>
                <Footer />
              </main>
              {/* Mobile: bottom tabs */}
              <BottomNav className="md:hidden" />
            </div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
