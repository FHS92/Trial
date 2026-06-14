import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EdgeScan — S&P 500 Stock Scanner',
  description: 'AI-powered stock scanner with fundamental and technical scoring for S&P 500 stocks.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // viewport-fit=cover lets the app paint into the safe-area insets (notch / home indicator)
  viewportFit: 'cover',
  themeColor: '#09090c',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <SessionProvider session={session}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
