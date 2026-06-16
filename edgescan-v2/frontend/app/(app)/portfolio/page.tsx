import { PortfolioClient } from '@/components/portfolio/PortfolioClient'

export const metadata = {
  title: 'Portfolio — EdgeScan',
  description: 'Track your S&P 500 positions, P&L, cost basis, and EdgeScan score drift.',
}

export default function PortfolioPage() {
  return <PortfolioClient />
}
