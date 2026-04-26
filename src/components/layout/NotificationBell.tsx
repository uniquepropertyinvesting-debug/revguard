'use client'

import { useState, useEffect, useRef } from 'react'
import { authFetch } from '@/lib/auth'

interface Alert {
  id: string
  type: string
  severity: string
  title: string
  message: string
  read: boolean
  created_at: string
}

const severityColor: Record<string, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',
}

const severityIcon: Record<string, string> = {
  critical: '🚨',
  warning: '⚠️',
  success: '✅',
  info: 'ℹ️',
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchAlerts = () => {
    authFetch('/api/alerts?limit=20')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.alerts)) setAlerts(d.alerts) })
      .catch(() => {})
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = alerts.filter(a => !a.read).length

  const markAllRead = () => {
    authFetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) })
      .then(() => { setAlerts(a => a.map(x => ({ ...x, read: true }))); })
      .catch(() => {})
  }

  const markRead = (id: string) => {
    authFetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alertId: id }) })
      .then(() => setAlerts(a => a.map(x => x.id === id ? { ...x, read: true } : x)))
      .catch(() => {})
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: open ? 'rgba(59,130,246,0.15)' : 'none',
          border: open ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
          borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)',
          fontSize: '18px', padding: '6px 8px', transition: 'all 0.15s',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#ef4444', color: 'white', borderRadius: '50%',
            width: 16, height: 16, fontSize: '9px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
          width: 380, background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Alerts</span>
              {unread > 0 && (
                <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '1px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          {/* Alert list */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                No alerts — revenue looking healthy!
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => !alert.read && markRead(alert.id)}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    background: alert.read ? 'transparent' : 'rgba(59,130,246,0.04)',
                    cursor: alert.read ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!alert.read) (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = alert.read ? 'transparent' : 'rgba(59,130,246,0.04)' }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{severityIcon[alert.severity] || '🔔'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: severityColor[alert.severity] || 'var(--text-primary)' }}>{alert.title}</span>
                        {!alert.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {alert.message}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.7 }}>
                        {timeAgo(alert.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Alerts auto-refresh every 30s · Click to mark as read
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
