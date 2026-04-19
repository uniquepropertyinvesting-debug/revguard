'use client'

import { useState, useEffect } from 'react'

const CHECKLIST_KEY = 'revguard_checklist_v1'

const steps = [
  {
    id: 'view_command_center',
    label: 'Visit the Command Center',
    desc: 'See your live revenue health overview',
    section: 'command-center',
    points: 10,
  },
  {
    id: 'connect_integration',
    label: 'Connect an integration',
    desc: 'Link Stripe, QuickBooks, or another tool',
    section: 'integrations',
    points: 20,
  },
  {
    id: 'view_failed_payments',
    label: 'Review failed payments',
    desc: 'See what revenue is at risk right now',
    section: 'failed-payments',
    points: 10,
  },
  {
    id: 'retry_payment',
    label: 'Retry a failed payment',
    desc: 'Use Smart Retry or send a recovery email',
    section: 'failed-payments',
    points: 30,
  },
  {
    id: 'view_churn',
    label: 'Check your churn risk accounts',
    desc: 'See who might cancel and why',
    section: 'churn-risk',
    points: 10,
  },
  {
    id: 'ask_ai',
    label: 'Ask the AI Revenue Assistant',
    desc: 'Get instant revenue intelligence',
    section: 'ai-assistant',
    points: 20,
  },
]

interface Props {
  onNavigate: (section: string) => void
  onClose: () => void
}

export default function GettingStartedChecklist({ onNavigate, onClose }: Props) {
  const [completed, setCompleted] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(CHECKLIST_KEY)
    if (saved) setCompleted(JSON.parse(saved))
  }, [])

  const toggle = (id: string) => {
    const next = completed.includes(id) ? completed.filter(x => x !== id) : [...completed, id]
    setCompleted(next)
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next))
  }

  const totalPoints = steps.filter(s => completed.includes(s.id)).reduce((sum, s) => sum + s.points, 0)
  const maxPoints = steps.reduce((sum, s) => sum + s.points, 0)
  const pct = Math.round((totalPoints / maxPoints) * 100)
  const allDone = completed.length === steps.length

  if (allDone) return null

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
      width: collapsed ? 'auto' : '320px',
      background: 'var(--bg-card)', border: '1px solid var(--border-light)',
      borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '14px 16px', cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))',
          borderBottom: collapsed ? 'none' : '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}
      >
        <span style={{ fontSize: '18px' }}>🚀</span>
        {!collapsed && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Getting Started</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{completed.length}/{steps.length} complete · {pct}%</div>
          </div>
        )}
        {collapsed && (
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6' }}>{pct}%</div>
        )}
        <button onClick={e => { e.stopPropagation(); onClose() }} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '2px'
        }}>✕</button>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{collapsed ? '▲' : '▼'}</span>
      </div>

      {!collapsed && (
        <>
          {/* Progress bar */}
          <div style={{ padding: '10px 16px 0' }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
            </div>
          </div>

          {/* Steps */}
          <div style={{ padding: '8px 12px 12px' }}>
            {steps.map(step => {
              const done = completed.includes(step.id)
              return (
                <div key={step.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px', borderRadius: '8px', cursor: 'pointer',
                  opacity: done ? 0.6 : 1, transition: 'all 0.15s',
                  marginBottom: '2px'
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {/* Checkbox */}
                  <div
                    onClick={() => toggle(step.id)}
                    style={{
                      width: 20, height: 20, borderRadius: '6px', flexShrink: 0,
                      border: `2px solid ${done ? '#10b981' : 'var(--border-light)'}`,
                      background: done ? '#10b981' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s', fontSize: '11px', color: 'white'
                    }}
                  >{done ? '✓' : ''}</div>

                  {/* Label */}
                  <div style={{ flex: 1 }} onClick={() => onNavigate(step.section)}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none' }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{step.desc}</div>
                  </div>

                  {/* Points */}
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 6px',
                    borderRadius: '10px', flexShrink: 0,
                    background: done ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.1)',
                    color: done ? '#10b981' : '#3b82f6'
                  }}>+{step.points}</span>
                </div>
              )
            })}
          </div>

          <div style={{ padding: '8px 16px 14px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Score: <strong style={{ color: '#3b82f6' }}>{totalPoints}</strong> / {maxPoints} points
            </div>
          </div>
        </>
      )}
    </div>
  )
}
