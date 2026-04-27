'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/auth'

interface AiExplainButtonProps {
  topic: string
  label?: string
  style?: React.CSSProperties
}

export default function AiExplainButton({ topic, label = 'Explain', style }: AiExplainButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (open && explanation) { setOpen(false); return }
    setOpen(true)
    if (explanation) return

    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'explain', topic }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setExplanation(data.content)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI unavailable')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button
        onClick={handleClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
          background: open ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
          color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: '12px' }}>&#9733;</span> {label}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '6px',
          width: '340px', zIndex: 50,
          background: 'var(--bg-card)', border: '1px solid var(--border-light)',
          borderRadius: '10px', padding: '14px 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI Explanation
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: '2px' }}
            >
              x
            </button>
          </div>
          {loading && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
              Analyzing your Stripe data...
            </div>
          )}
          {error && (
            <div style={{ fontSize: '12px', color: '#ef4444', padding: '4px 0' }}>{error}</div>
          )}
          {explanation && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {explanation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
