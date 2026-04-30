'use client'

import { useEffect, useRef, useState } from 'react'
import { authFetch } from '@/lib/auth'

interface Message {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string
}

interface ConversationSummary {
  id: string
  title: string
  status: string
  updated_at: string
}

const QUICK_PROMPTS = [
  'How do I connect my Stripe account?',
  'How does automated dunning work?',
  'How is churn risk calculated?',
  'How do I set up email alerts?',
  'How do I export my data (GDPR)?',
  'What plans do you offer?',
]

const WELCOME: Message = {
  role: 'assistant',
  content: "Hi! I'm RevGuard Support. Ask me anything about how the product works — Stripe setup, dunning, alerts, billing, or your account. If I can't help, you can escalate to a human.",
}

export default function SupportAgent() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEscalate, setShowEscalate] = useState(false)
  const [escalateNote, setEscalateNote] = useState('')
  const [escalateSubject, setEscalateSubject] = useState('')
  const [escalateBusy, setEscalateBusy] = useState(false)
  const [escalateDone, setEscalateDone] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch('/api/support-conversations')
        const data = await res.json()
        if (Array.isArray(data.conversations)) setConversations(data.conversations)
      } catch {}
    }
    load()
  }, [])

  const startNew = () => {
    setActiveId(null)
    setMessages([WELCOME])
    setInput('')
    setError(null)
    setEscalateDone(null)
  }

  const openConversation = async (id: string) => {
    setActiveId(id)
    setLoading(true)
    setError(null)
    setEscalateDone(null)
    try {
      const res = await authFetch(`/api/support-conversations/${id}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const loaded: Message[] = (data.messages || []).map((m: Message) => ({
        id: m.id, role: m.role, content: m.content, created_at: m.created_at,
      }))
      setMessages(loaded.length ? loaded : [WELCOME])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (text?: string) => {
    const userMsg = (text ?? input).trim()
    if (!userMsg || loading) return

    const optimistic: Message = { role: 'user', content: userMsg }
    setMessages(prev => [...prev, optimistic])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await authFetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeId, message: userMsg }),
      })
      const data = await res.json()
      if (data.error && !data.assistant) throw new Error(data.error)

      if (data.conversationId && data.conversationId !== activeId) {
        setActiveId(data.conversationId)
        const refreshed = await authFetch('/api/support-conversations').then(r => r.json()).catch(() => null)
        if (refreshed?.conversations) setConversations(refreshed.conversations)
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.assistant }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Support chat unavailable')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I had trouble connecting. Please try again, or escalate to a human if it persists.",
      }])
    } finally {
      setLoading(false)
    }
  }

  const escalate = async () => {
    setEscalateBusy(true)
    setError(null)
    try {
      const subject = escalateSubject.trim() || 'Support request'
      const res = await authFetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeId, subject, note: escalateNote }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEscalateDone(data.ticket?.id ? `Ticket created (#${data.ticket.id.slice(0, 8)}). Our team will reach out by email.` : 'Ticket created. Our team will reach out by email.')
      setShowEscalate(false)
      setEscalateNote('')
      setEscalateSubject('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to escalate')
    } finally {
      setEscalateBusy(false)
    }
  }

  const renderContent = (text: string) =>
    text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g)
      return (
        <div key={i} style={{ marginBottom: line === '' ? '8px' : '2px' }}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
          )}
        </div>
      )
    })

  return (
    <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 160px)' }}>
      {/* Conversation history */}
      <div style={{
        width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden'
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={startNew}
            className="btn-primary"
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
          >+ New conversation</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', padding: '6px 8px' }}>
            HISTORY
          </div>
          {conversations.length === 0 && (
            <div style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              No past conversations yet.
            </div>
          )}
          {conversations.map(c => {
            const active = c.id === activeId
            return (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '8px',
                  background: active ? 'var(--bg-card-hover)' : 'transparent',
                  border: '1px solid', borderColor: active ? '#3b82f6' : 'transparent',
                  marginBottom: '4px', cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget.style.background = 'var(--bg-card)') }}
                onMouseLeave={e => { if (!active) (e.currentTarget.style.background = 'transparent') }}
              >
                <div style={{
                  fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>{c.title}</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {new Date(c.updated_at).toLocaleDateString()}
                  </span>
                  {c.status === 'escalated' && (
                    <span style={{
                      fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px',
                      background: 'rgba(245,158,11,0.15)', color: '#f59e0b'
                    }}>ESCALATED</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(16,185,129,0.08))',
          border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px'
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white', fontWeight: 700
          }}>?</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>RevGuard Support Agent</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Product help, account questions, and how-to guides
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => { setShowEscalate(true); setError(null); setEscalateDone(null) }}
              style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', cursor: 'pointer'
              }}
            >Talk to a human</button>
          </div>
        </div>

        {/* Quick prompts (only on a fresh chat) */}
        {!activeId && messages.length <= 1 && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
              POPULAR QUESTIONS
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {QUICK_PROMPTS.map((q, i) => (
                <button
                  key={i}
                  disabled={loading}
                  onClick={() => sendMessage(q)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', fontSize: '12px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s', opacity: loading ? 0.5 : 1
                  }}
                  onMouseEnter={e => { if (!loading) { (e.currentTarget.style.borderColor = '#3b82f6'); (e.currentTarget.style.color = '#3b82f6') } }}
                  onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.color = 'var(--text-secondary)') }}
                >{q}</button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            {error}
          </div>
        )}
        {escalateDone && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
            {escalateDone}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
          {messages.map((msg, i) => (
            <div key={msg.id || i} style={{ display: 'flex', gap: '10px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role !== 'user' && (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white'
                }}>?</div>
              )}
              <div style={{
                maxWidth: '75%', padding: '12px 16px', borderRadius: '12px',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' : 'var(--bg-card)',
                border: msg.role !== 'user' ? '1px solid var(--border)' : 'none',
                color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                fontSize: '14px', lineHeight: '1.6',
              }}>
                {msg.role !== 'user' ? renderContent(msg.content) : msg.content}
              </div>
              {msg.role === 'user' && (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)'
                }}>U</div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'white', fontWeight: 700
              }}>?</div>
              <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#3b82f6',
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
            placeholder="Ask a product question..."
            style={{ flex: 1, padding: '12px 16px', borderRadius: '10px' }}
            disabled={loading}
          />
          <button
            className="btn-primary"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{ padding: '12px 20px' }}
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Escalate modal */}
      {showEscalate && (
        <div
          onClick={() => !escalateBusy && setShowEscalate(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 520, background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden'
            }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>Escalate to a human</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Our team will reach out by email. We&apos;ll include the recent transcript automatically.
              </div>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Subject</label>
                <input
                  value={escalateSubject}
                  onChange={e => setEscalateSubject(e.target.value)}
                  placeholder="Brief subject"
                  maxLength={200}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Add anything else (optional)</label>
                <textarea
                  value={escalateNote}
                  onChange={e => setEscalateNote(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="Context, screenshots links, urgency..."
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', marginTop: '4px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                    fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.5, resize: 'vertical'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowEscalate(false)}
                disabled={escalateBusy}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                  background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer'
                }}
              >Cancel</button>
              <button
                className="btn-primary"
                onClick={escalate}
                disabled={escalateBusy}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >{escalateBusy ? 'Sending...' : 'Send to support team'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
