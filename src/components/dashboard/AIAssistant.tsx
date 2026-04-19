'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const suggestions = [
  'Which accounts are most at risk of churning right now?',
  'Summarize my failed payments from the last 7 days',
  'What is my current revenue recovery rate?',
  'Which billing errors are costing me the most?',
  'What should I prioritize to protect my MRR?',
  'How do I improve my recovery rate?',
]

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm RevGuard AI — I have live access to your Stripe data right now. Ask me about failed payments, churn risk, billing errors, or what to prioritize to protect your revenue." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (err: any) {
      setError(err.message || 'AI unavailable')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I had trouble connecting. Please try again in a moment.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g)
      return (
        <div key={i} style={{ marginBottom: line === '' ? '8px' : '2px' }}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
          )}
        </div>
      )
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 160px)' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))',
        border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px'
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
        }}>🤖</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>RevGuard AI Assistant</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Powered by NxCode AI · Live Stripe data connected
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className="pulse-dot" style={{ background: '#10b981' }} />
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Live Data</span>
        </div>
      </div>

      {/* Suggestions */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>QUICK INSIGHTS</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} disabled={loading} style={{
              padding: '6px 12px', borderRadius: '20px', fontSize: '12px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', opacity: loading ? 0.5 : 1
            }}
              onMouseEnter={e => { if (!loading) { (e.target as HTMLElement).style.borderColor = '#8b5cf6'; (e.target as HTMLElement).style.color = '#8b5cf6' } }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)' }}
            >{s}</button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Chat */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
              }}>🤖</div>
            )}
            <div style={{
              maxWidth: '75%', padding: '12px 16px', borderRadius: '12px',
              background: msg.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'var(--bg-card)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6',
            }}>
              {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700
              }}>U</div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
            }}>🤖</div>
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6',
                    animation: `pulse 1.2s ease ${j * 0.2}s infinite`
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about your revenue data, churn risk, failed payments..."
          style={{ flex: 1, padding: '12px 16px', borderRadius: '10px' }}
          disabled={loading}
        />
        <button
          className="btn-primary"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{ padding: '12px 20px' }}
        >
          {loading ? '...' : 'Send →'}
        </button>
      </div>
    </div>
  )
}
