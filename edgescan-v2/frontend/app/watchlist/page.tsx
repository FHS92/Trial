import { WatchlistClient } from './WatchlistClient'

export const metadata = {
  title: 'Watchlist — EdgeScan',
  description: 'Track your favourite S&P 500 stocks and monitor their EdgeScan scores.',
}

export default function WatchlistPage() {
  return <WatchlistClient />
}
