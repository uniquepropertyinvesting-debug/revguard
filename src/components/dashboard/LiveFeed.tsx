'use client'

import { useState, useEffect } from 'react'
import { useRealtimeFeed, type FeedEvent } from '@/hooks/useRealtimeFeed'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { authFetch } from '@/lib/auth'

const TABLE_ICON: Record<string, string> = {
  alerts: '🔔',
  recovery_actions: '🔄',
  webhook_events: '📡',
  dunning_sequences: '📬',
  n8n_workflow_runs: '🤖',
}

const SEVERITY_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b' },
  success: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', color: '#10b981' },
  info: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', color: '#3b82f6' },
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface RecentActivity {
  id: string
  table: string
  event_type: string
  severity: string
  title: string
  message: string
  timestamp: string
}

export default function LiveFeed() {
  const { user } = useAuth()
  const { events: realtimeEvents, connected, clearEvents } = useRealtimeFeed(user?.id || null)
  const [historicalEvents, setHistoricalEvents] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const [alertsRes, recoveryRes, webhooksRes] = await Promise.all([
          authFetch('/api/db/alerts').then(r => r.ok ? r.json() : { alerts: [] }),
          authFetch('/api/db/recovery-log').then(r => r.ok ? r.json() : { actions: [] }),
          authFetch('/api/data-protection').then(r => r.ok ? r.json() : { auditLog: [] }),
        ])

        const items: RecentActivity[] = []

        for (const a of (alertsRes.alerts || []).slice(0, 20)) {
          items.push({
            id: a.id,
            table: 'alerts',
            event_type: a.type,
            severity: a.severity,
            title: a.title,
            message: a.message,
            timestamp: a.created_at,
          })
        }

        for (const r of (recoveryRes.actions || []).slice(0, 15)) {
          items.push({
            id: r.id,
            table: 'recovery_actions',
            event_type: r.action,
            severity: r.status === 'success' ? 'success' : 'warning',
            title: `Recovery: ${r.action}`,
            message: r.result || `${r.action} on invoice ${r.invoice_id}`,
            timestamp: r.created_at,
          })
        }

        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setHistoricalEvents(items.slice(0, 30))
      } catch {}
      setLoading(false)
    }
    fetchRecent()
  }, [])

  const allEvents: RecentActivity[] = [
    ...(!paused ? realtimeEvents : []),
    ...historicalEvents,
  ]

  const deduped = allEvents.filter((e, i) => allEvents.findIndex(x => x.id === e.id) === i)
  const filtered = filter === 'all'
    ? deduped
    : deduped.filter(e => e.table === filter)

  const tables = ['all', 'alerts', 'recovery_actions', 'webhook_events', 'dunning_sequences', 'n8n_workflow_runs']
  const tableLabels: Record<string, string> = {
    all: 'All Events',
    alerts: 'Alerts',
    recovery_actions: 'Recoveries',
    webhook_events: 'Webhooks',
    dunning_sequences: 'Dunning',
    n8n_workflow_runs: 'n8n Runs',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(6,182,212,0.08))',
        border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>📡</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800 }}>Live Event Feed</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Real-time Supabase stream -- all revenue events, recoveries, and automations
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="pulse-dot" style={{ background: connected ? '#10b981' : '#ef4444' }} />
            <span style={{ fontSize: '12px', color: connected ? '#10b981' : '#ef4444', fontWeight: 600 }}>
              {connected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          <button
            className={paused ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '12px', padding: '6px 14px' }}
            onClick={() => setPaused(!paused)}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
            onClick={() => { clearEvents(); setHistoricalEvents([]) }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total Events', value: deduped.length, color: '#3b82f6', icon: '📊' },
          { label: 'Alerts', value: deduped.filter(e => e.table === 'alerts').length, color: '#f59e0b', icon: '🔔' },
          { label: 'Recoveries', value: deduped.filter(e => e.table === 'recovery_actions').length, color: '#10b981', icon: '🔄' },
          { label: 'Webhooks', value: deduped.filter(e => e.table === 'webhook_events').length, color: '#06b6d4', icon: '📡' },
          { label: 'n8n Runs', value: deduped.filter(e => e.table === 'n8n_workflow_runs').length, color: '#8b5cf6', icon: '🤖' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
              <span style={{ fontSize: '18px' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {tables.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            background: filter === t ? 'rgba(59,130,246,0.2)' : 'var(--bg-card)',
            color: filter === t ? '#3b82f6' : 'var(--text-secondary)',
            border: filter === t ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border)',
          }}>
            {TABLE_ICON[t] || ''} {tableLabels[t]}
          </button>
        ))}
      </div>

      {/* Event stream */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading event history...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📡</div>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>No events yet</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Events will appear here in real-time as your Stripe account generates activity.
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            {filtered.map((event, i) => {
              const style = SEVERITY_STYLE[event.severity] || SEVERITY_STYLE.info
              return (
                <div key={event.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '14px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  background: i === 0 && !paused && realtimeEvents.some(e => e.id === event.id)
                    ? 'rgba(59,130,246,0.04)' : 'transparent',
                  transition: 'background 0.5s',
                }}>
                  <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>
                    {TABLE_ICON[event.table] || '📋'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {event.title}
                      </span>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                        background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                      }}>
                        {event.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.message}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, textAlign: 'right' }}>
                    {timeAgo(event.timestamp)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
