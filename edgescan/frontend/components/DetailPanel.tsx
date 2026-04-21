'use client'

import { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import ScoreRing from './ScoreRing'
import MetricsGrid from './MetricsGrid'
import SignalRow from './SignalRow'
import PriceChart from './PriceChart'
import { loadWatchlist, toggleWatchlist } from '@/app/watchlist/WatchlistClient'
import { api } from '@/lib/api'
import type { StockResult, OHLCVBar, SignalDisplay, ScoreHistoryPoint, NewsItem } from '@/lib/types'

interface Props {
  stock: StockResult
  history: OHLCVBar[]
}

function buildSignals(stock: StockResult): SignalDisplay[] {
  const s = stock.signals ?? {}
  const displays: SignalDisplay[] = []

  // RSI
  const rsi = s.rsi ?? 50
  displays.push({
    label: 'RSI (14)',
    value: rsi.toFixed(1),
    status: rsi >= 40 && rsi <= 60 ? 'green' : rsi >= 30 && rsi <= 70 ? 'amber' : 'red',
  })

  // MACD
  const macd = s.macd_status ?? 'below_signal'
  displays.push({
    label: 'MACD',
    value: macd === 'bullish_crossover' ? 'Bullish crossover' : macd === 'above_signal' ? 'Above signal' : 'Below signal',
    status: macd === 'bullish_crossover' ? 'green' : macd === 'above_signal' ? 'amber' : 'red',
  })

  // vs 200MA
  const pct200 = s.pct_above_200ma ?? 0
  displays.push({
    label: 'vs 200-day MA',
    value: `${pct200 >= 0 ? '+' : ''}${pct200.toFixed(1)}%`,
    status: pct200 > 0 && pct200 <= 10 ? 'green' : pct200 > 10 && pct200 <= 20 ? 'amber' : 'red',
  })

  // Volume
  const vol = s.volume_status ?? 'neutral'
  displays.push({
    label: 'Volume trend',
    value: vol.charAt(0).toUpperCase() + vol.slice(1),
    status: vol === 'bullish' ? 'green' : vol === 'neutral' ? 'amber' : 'red',
  })

  // 52W position
  const from52 = s.from_52w_high ?? 0
  displays.push({
    label: '52-week position',
    value: `${from52.toFixed(1)}% from high`,
    status: Math.abs(from52) >= 15 && Math.abs(from52) <= 35 ? 'green' : Math.abs(from52) < 15 ? 'amber' : 'red',
  })

  return displays
}

export default function DetailPanel({ stock, history }: Props) {
  const signals = useMemo(() => buildSignals(stock), [stock])
  const upside = stock.upside_pct ?? 0
  const upsideColor = upside >= 0 ? '#22d47e' : '#f75f5f'
  const [watched, setWatched] = useState(false)
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryPoint[]>([])
  const [news, setNews] = useState<NewsItem[]>([])

  useEffect(() => { setWatched(loadWatchlist().includes(stock.ticker)) }, [stock.ticker])
  useEffect(() => {
    api.scoreHistory(stock.ticker).then(d => setScoreHistory(d.history)).catch(() => {})
    api.stockNews(stock.ticker).then(d => setNews(d.news)).catch(() => {})
  }, [stock.ticker])

  function handleWatch() { const added = toggleWatchlist(stock.ticker); setWatched(added) }

  function fmtDate(iso: string) {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return iso }
  }

  const scoreColor =
    stock.score >= 80 ? '#22d47e' :
    stock.score >= 60 ? '#f5a623' :
    '#f75f5f'

  const priceChange = history.length >= 2
    ? ((history[history.length - 1].close - history[history.length - 2].close) / history[history.length - 2].close * 100)
    : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: '#e2e8f8' }}>{stock.ticker}
            <button
              onClick={handleWatch}
              className="ml-2 text-sm font-normal px-2 py-0.5 rounded-pill transition-colors"
              style={{ background: watched ? 'rgba(34,212,126,0.12)' : 'rgba(255,255,255,0.06)', color: watched ? '#22d47e' : '#6b7a99', border: `1px solid ${watched ? 'rgba(34,212,126,0.3)' : 'rgba(255,255,255,0.1)'}` }}
            >
              {watched ? '★ Watching' : '☆ Watch'}
            </button>
          </h1>
            {stock.sector && (
              <span
                className="text-xs px-2 py-1 rounded-pill"
                style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}
              >
                {stock.sector}
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: '#6b7a99' }}>{stock.name}</p>
          {stock.current_price != null && (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-semibold" style={{ color: '#e2e8f8' }}>
                ${stock.current_price.toFixed(2)}
              </span>
              {priceChange != null && (
                <span className="text-sm font-medium" style={{ color: priceChange >= 0 ? '#22d47e' : '#f75f5f' }}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
        <ScoreRing score={stock.score} size={64} strokeWidth={5} />
      </div>

      {/* Price target banner */}
      {stock.price_target_2m != null && (
        <div
          className="rounded-card p-4 flex items-center justify-between gap-4"
          style={{ background: 'rgba(34,212,126,0.08)', border: '1px solid rgba(34,212,126,0.2)' }}
        >
          <div>
            <p className="text-xs" style={{ color: '#6b7a99' }}>2-Month Price Target</p>
            <p className="text-2xl font-bold" style={{ color: '#22d47e' }}>
              ${stock.price_target_2m.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#6b7a99' }}>Upside</p>
            <p className="text-xl font-bold" style={{ color: upsideColor }}>
              {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#6b7a99' }}>Composite Score</p>
            <p className="text-xl font-bold" style={{ color: scoreColor }}>{stock.score}/100</p>
          </div>
        </div>
      )}

      {/* Score breakdown pills */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-cell p-3 text-center" style={{ background: '#161c2e' }}>
          <p className="text-xs" style={{ color: '#6b7a99' }}>Fundamental</p>
          <p className="text-lg font-bold" style={{ color: '#4f8ef7' }}>{stock.fundamental_score}<span className="text-xs text-muted">/60</span></p>
        </div>
        <div className="flex-1 rounded-cell p-3 text-center" style={{ background: '#161c2e' }}>
          <p className="text-xs" style={{ color: '#6b7a99' }}>Technical</p>
          <p className="text-lg font-bold" style={{ color: '#4f8ef7' }}>{stock.technical_score}<span className="text-xs text-muted">/40</span></p>
        </div>
        {stock.earnings_date && (
          <div className="flex-1 rounded-cell p-3 text-center" style={{ background: '#161c2e' }}>
            <p className="text-xs" style={{ color: '#6b7a99' }}>Earnings</p>
            <p className="text-sm font-semibold" style={{ color: '#f5a623' }}>{stock.earnings_date}</p>
          </div>
        )}
      </div>

      {/* Price chart */}
      <div
        className="rounded-card p-4"
        style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <PriceChart allHistory={history} />
      </div>

      {/* Metrics grid */}
      {stock.metrics && Object.keys(stock.metrics).length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6b7a99' }}>
            Key Metrics
          </h2>
          <MetricsGrid metrics={stock.metrics} />
        </div>
      )}

      {/* AI thesis */}
      {stock.thesis && (
        <div
          className="rounded-card p-4"
          style={{ background: '#161c2e', border: '1px solid rgba(79,142,247,0.15)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4f8ef7' }}>
              Why Now
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}>
              AI
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#e2e8f8' }}>{stock.thesis}</p>
        </div>
      )}

      {/* Technical signals */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6b7a99' }}>
          Technical Signals
        </h2>
        <div
          className="rounded-card px-4"
          style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {signals.map(sig => (
            <SignalRow key={sig.label} signal={sig} />
          ))}
        </div>
      </div>

      {/* Score history */}
      {scoreHistory.length >= 2 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6b7a99' }}>
            Score History
          </h2>
          <div className="rounded-card p-4" style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={scoreHistory} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#6b7a99', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7a99', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#131720', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                  labelStyle={{ color: '#6b7a99', fontSize: 11 }}
                  itemStyle={{ color: '#4f8ef7', fontSize: 12 }}
                  formatter={(v: number) => [v, 'Score']}
                />
                <ReferenceLine y={70} stroke="rgba(34,212,126,0.2)" strokeDasharray="3 3" />
                <ReferenceLine y={50} stroke="rgba(247,95,95,0.2)" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="score" stroke="#4f8ef7" strokeWidth={2} dot={{ r: 3, fill: '#4f8ef7' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* News */}
      {news.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6b7a99' }}>
            Latest News
          </h2>
          <div className="space-y-2">
            {news.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-card p-3 transition-colors hover:bg-white/[0.03]"
                style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-sm font-medium leading-snug" style={{ color: '#e2e8f8' }}>{item.title}</p>
                <p className="text-xs mt-1" style={{ color: '#6b7a99' }}>{item.publisher}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
