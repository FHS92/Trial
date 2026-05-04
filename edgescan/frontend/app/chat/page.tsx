'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import UniverseBadge from '@/components/UniverseBadge'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const COLORS = {
  bg: 'var(--color-bg)',
  blue: '#4f8ef7',
  text: 'var(--color-text)',
  muted: 'var(--color-text-2)',
  card: 'var(--color-card)',
  userBubbleBg: 'rgba(79,142,247,0.15)',
  userBubbleBorder: 'rgba(79,142,247,0.3)',
  aiBubbleBg: 'var(--color-card)',
  aiBubbleBorder: 'var(--color-border)',
  inputBg: 'var(--color-card-alt)',
  inputBorder: 'rgba(79,142,247,0.25)',
  headerBorder: 'var(--color-border)',
}

const SUGGESTED_QUESTIONS = [
  'Why does NVDA score so high?',
  'What are the current top picks?',
  'Explain the scoring methodology',
  'Which sectors are strongest right now?',
]

interface Message {
  role: 'user' | 'ai'
  text: string
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 2px' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: COLORS.muted,
            display: 'inline-block',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 20,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: COLORS.muted,
          marginBottom: 5,
          marginLeft: isUser ? 0 : 2,
          marginRight: isUser ? 2 : 0,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {isUser ? 'You' : 'EdgeScan AI'}
      </span>
      <div
        style={{
          maxWidth: '78%',
          padding: '12px 16px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          backgroundColor: isUser ? COLORS.userBubbleBg : COLORS.aiBubbleBg,
          border: `1px solid ${isUser ? COLORS.userBubbleBorder : COLORS.aiBubbleBorder}`,
          color: COLORS.text,
          fontSize: 14,
          lineHeight: 1.65,
          whiteSpace: isUser ? 'normal' : 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {msg.text}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(question: string) {
    const trimmed = question.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const body: { question: string; ticker?: string } = { question: trimmed }
      if (ticker.trim()) body.ticker = ticker.trim().toUpperCase()

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Server error ${res.status}`)
      }

      const data = await res.json()
      const aiMsg: Message = { role: 'ai', text: data.answer ?? 'No response received.' }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      const errMsg: Message = {
        role: 'ai',
        text: `Error: ${err instanceof Error ? err.message : 'Could not reach server'}`,
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function handleChipClick(question: string) {
    setInput(question)
    textareaRef.current?.focus()
  }

  const showWelcome = messages.length === 0 && !loading

  return (
    <div
      style={{
        backgroundColor: COLORS.bg,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: COLORS.text,
      }}
    >
      {/* Sticky Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: COLORS.bg,
          borderBottom: `1px solid ${COLORS.headerBorder}`,
          padding: '18px 24px 16px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: COLORS.text,
                  letterSpacing: '-0.02em',
                }}
              >
                AI Chat
              </h1>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: 13,
                  color: COLORS.muted,
                }}
              >
                Ask questions about any stock&apos;s score or the market
              </p>
            </div>

            {/* Ticker filter + universe badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UniverseBadge />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Filter by ticker e.g. NVDA"
                maxLength={10}
                style={{
                  backgroundColor: COLORS.inputBg,
                  border: `1px solid ${COLORS.inputBorder}`,
                  borderRadius: 8,
                  color: COLORS.text,
                  fontSize: 13,
                  padding: '7px 12px',
                  outline: 'none',
                  width: 200,
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = COLORS.blue
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = COLORS.inputBorder
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px 24px 220px',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
          {/* Welcome state */}
          {showWelcome && (
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(79,142,247,0.12)',
                  border: `1px solid rgba(79,142,247,0.25)`,
                  marginBottom: 16,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                    fill="rgba(79,142,247,0.3)"
                  />
                  <path
                    d="M8 12h8M12 8v8"
                    stroke={COLORS.blue}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p
                style={{
                  color: COLORS.muted,
                  fontSize: 15,
                  maxWidth: 440,
                  margin: '0 auto 28px',
                  lineHeight: 1.6,
                }}
              >
                Ask me anything about EdgeScan scores, why a stock scores high or low, sector trends,
                or strategy questions.
              </p>

              {/* Suggested question chips */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  justifyContent: 'center',
                }}
              >
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleChipClick(q)}
                    style={{
                      backgroundColor: COLORS.card,
                      border: `1px solid rgba(79,142,247,0.2)`,
                      borderRadius: 20,
                      color: COLORS.text,
                      fontSize: 13,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(79,142,247,0.12)'
                      e.currentTarget.style.borderColor = 'rgba(79,142,247,0.5)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = COLORS.card
                      e.currentTarget.style.borderColor = 'rgba(79,142,247,0.2)'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {/* Loading indicator */}
          {loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: COLORS.muted,
                  marginBottom: 5,
                  marginLeft: 2,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                EdgeScan AI
              </span>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px 16px 16px 4px',
                  backgroundColor: COLORS.aiBubbleBg,
                  border: `1px solid ${COLORS.aiBubbleBorder}`,
                }}
              >
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input row — sits above the BottomNav */}
      <div
        style={{
          position: 'fixed',
          bottom: '4.5rem',
          left: 0,
          right: 0,
          backgroundColor: COLORS.bg,
          borderTop: `1px solid ${COLORS.headerBorder}`,
          padding: '12px 24px 14px',
          zIndex: 30,
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
          {/* Chips shown above input when no messages yet */}
          {messages.length === 0 && !loading && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 12,
              }}
            >
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleChipClick(q)}
                  style={{
                    backgroundColor: 'transparent',
                    border: `1px solid var(--color-border-2)`,
                    borderRadius: 6,
                    color: COLORS.muted,
                    fontSize: 12,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(79,142,247,0.4)'
                    e.currentTarget.style.color = COLORS.text
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-2)'
                    e.currentTarget.style.color = COLORS.muted
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
              rows={1}
              style={{
                flex: 1,
                backgroundColor: COLORS.inputBg,
                border: `1px solid ${COLORS.inputBorder}`,
                borderRadius: 12,
                color: COLORS.text,
                fontSize: 14,
                padding: '12px 16px',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.5,
                maxHeight: 140,
                overflowY: 'auto',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.blue
                e.currentTarget.style.boxShadow = `0 0 0 3px rgba(79,142,247,0.12)`
                e.currentTarget.rows = 3
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = COLORS.inputBorder
                e.currentTarget.style.boxShadow = 'none'
                if (!input) e.currentTarget.rows = 1
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                backgroundColor: loading || !input.trim() ? 'rgba(79,142,247,0.3)' : COLORS.blue,
                border: 'none',
                borderRadius: 12,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                padding: '12px 22px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s, opacity 0.15s',
                whiteSpace: 'nowrap',
                height: 46,
                alignSelf: 'flex-end',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!loading && input.trim()) {
                  e.currentTarget.style.backgroundColor = '#6ba3f9'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && input.trim()) {
                  e.currentTarget.style.backgroundColor = COLORS.blue
                }
              }}
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
