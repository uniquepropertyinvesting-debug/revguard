'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth'

interface N8nStats {
  total: number
  success: number
  failed: number
  running: number
  avgDuration: number
  last24h: number
}

interface WorkflowRun {
  id: string
  workflow_id: string
  workflow_name: string
  trigger_type: string
  status: string
  event_type: string | null
  input_data: Record<string, unknown>
  output_data: Record<string, unknown>
  error_message: string | null
  duration_ms: number | null
  started_at: string
  completed_at: string | null
  created_at: string
}

const WORKFLOW_TEMPLATES = [
  {
    name: 'Failed Payment Auto-Retry',
    trigger: 'payment_intent.payment_failed',
    description: 'When a payment fails, wait 4 hours then auto-retry via Stripe. If retry fails, enroll in dunning sequence.',
    steps: ['Webhook trigger', 'Wait 4h', 'Stripe retry', 'Check result', 'Enroll dunning if failed'],
    icon: '💳',
    color: '#ef4444',
  },
  {
    name: 'Churn Risk Slack Alert',
    trigger: 'customer.subscription.updated (past_due)',
    description: 'When a subscription goes past due, post to Slack with customer details and suggested actions.',
    steps: ['Webhook trigger', 'Fetch customer data', 'Calculate risk score', 'Post to Slack'],
    icon: '⚠️',
    color: '#f59e0b',
  },
  {
    name: 'Invoice Recovery Sequence',
    trigger: 'invoice.payment_failed',
    description: 'Multi-step email sequence: Day 1 gentle reminder, Day 3 warning, Day 7 final notice with payment link.',
    steps: ['Webhook trigger', 'Day 1 email', 'Wait 2d', 'Day 3 email', 'Wait 4d', 'Day 7 email'],
    icon: '📬',
    color: '#3b82f6',
  },
  {
    name: 'Daily Revenue Report',
    trigger: 'Schedule: Every day at 8am',
    description: 'Pulls MRR, failed charges, and recovery stats from Stripe. Sends a daily digest email to your team.',
    steps: ['Cron trigger', 'Fetch Stripe metrics', 'Calculate deltas', 'Generate report', 'Send email'],
    icon: '📊',
    color: '#10b981',
  },
  {
    name: 'Dispute Auto-Responder',
    trigger: 'charge.dispute.created',
    description: 'When a chargeback is created, gather transaction evidence and submit an initial response within 1 hour.',
    steps: ['Webhook trigger', 'Fetch charge details', 'Compile evidence', 'Submit to Stripe'],
    icon: '🛡️',
    color: '#06b6d4',
  },
  {
    name: 'New Customer Onboarding',
    trigger: 'customer.subscription.created',
    description: 'Welcome email, CRM record creation, Slack notification to CSM, and schedule a 7-day check-in.',
    steps: ['Webhook trigger', 'Send welcome email', 'Create CRM record', 'Notify CSM', 'Schedule follow-up'],
    icon: '🎉',
    color: '#10b981',
  },
]

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmtDuration(ms: number | null) {
  if (!ms) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const STATUS_STYLE: Record<string, { bg: string; border: string; color: string; label: string }> = {
  success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#10b981', label: 'Success' },
  failed: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', label: 'Failed' },
  running: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', color: '#3b82f6', label: 'Running' },
  timeout: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b', label: 'Timeout' },
}

export default function N8nAutomation() {
  const [tab, setTab] = useState<'overview' | 'runs' | 'templates'>('overview')
  const [n8nData, setN8nData] = useState<{
    connected: boolean
    instanceUrl: string | null
    hasApiKey: boolean
    hasWebhookSecret: boolean
    lastHeartbeat: string | null
    stats: N8nStats
    runs: WorkflowRun[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Connection form
  const [instanceUrl, setInstanceUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    authFetch('/api/db/n8n-connect')
      .then(r => { if (!r.ok) throw new Error(`Failed (${r.status})`); return r.json() })
      .then(d => {
        if (d.error) { setError(d.error); return }
        setN8nData(d)
        if (d.instanceUrl) setInstanceUrl(d.instanceUrl)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!instanceUrl.trim()) { setSaveMsg('Instance URL is required'); return }
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await authFetch('/api/db/n8n-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceUrl: instanceUrl.trim(), apiKey: apiKey.trim() || undefined, webhookSecret: webhookSecret.trim() || undefined }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: `Failed (${res.status})` }))
        setSaveMsg(d.error || 'Save failed')
        return
      }
      setSaveMsg('')
      setApiKey('')
      setWebhookSecret('')
      window.location.reload()
    } catch {
      setSaveMsg('Network error')
    } finally {
      setSaving(false)
    }
  }

  const stats = n8nData?.stats || { total: 0, success: 0, failed: 0, running: 0, avgDuration: 0, last24h: 0 }
  const runs = n8nData?.runs || []
  const webhookUrl = typeof window !== 'undefined'
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/n8n-webhook`
    : ''

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: 'var(--text-muted)' }}>
      Loading n8n automation data...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.08))',
        border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🤖</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800 }}>n8n Automation Hub</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              24/7 monitoring and recovery workflows powered by n8n
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {n8nData?.connected ? (
            <>
              <div className="pulse-dot" style={{ background: '#10b981' }} />
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Connected</span>
              {n8nData.lastHeartbeat && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Heartbeat {timeAgo(n8nData.lastHeartbeat)}
                </span>
              )}
            </>
          ) : (
            <>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>Not Connected</span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '10px', padding: '14px 20px', fontSize: '13px', color: '#ef4444'
        }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total Runs', value: stats.total, color: '#3b82f6', icon: '🔢' },
          { label: 'Successful', value: stats.success, color: '#10b981', icon: '✅' },
          { label: 'Failed', value: stats.failed, color: '#ef4444', icon: '❌' },
          { label: 'Running', value: stats.running, color: '#f59e0b', icon: '⏳' },
          { label: 'Last 24h', value: stats.last24h, color: '#06b6d4', icon: '📅' },
          { label: 'Avg Duration', value: fmtDuration(stats.avgDuration), color: '#8b5cf6', icon: '⚡' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
              <span style={{ fontSize: '16px' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {(['overview', 'runs', 'templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 600,
            color: tab === t ? '#3b82f6' : 'var(--text-secondary)',
            borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-1px',
          }}>
            {t === 'overview' ? 'Connection Setup' : t === 'runs' ? `Workflow Runs (${runs.length})` : 'Workflow Templates'}
          </button>
        ))}
      </div>

      {/* Connection Setup */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Connect n8n Instance
              {n8nData?.connected && <span className="badge-green" style={{ fontSize: '10px' }}>Connected</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  N8N INSTANCE URL <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="url"
                  value={instanceUrl}
                  onChange={e => setInstanceUrl(e.target.value)}
                  placeholder="https://your-n8n.example.com"
                  style={{ width: '100%', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  N8N API KEY <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={n8nData?.hasApiKey ? '•••••••••• (saved)' : 'n8n_api_...'}
                  style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  WEBHOOK SECRET <span style={{ color: 'var(--text-muted)' }}>(recommended)</span>
                </label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={e => setWebhookSecret(e.target.value)}
                  placeholder={n8nData?.hasWebhookSecret ? '•••••••••• (saved)' : 'A shared secret for verification'}
                  style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              {saveMsg && (
                <div style={{ fontSize: '12px', color: '#ef4444', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
                  {saveMsg}
                </div>
              )}

              <button className="btn-primary" onClick={handleSave} disabled={saving || !instanceUrl.trim()} style={{ alignSelf: 'flex-start' }}>
                {saving ? 'Saving...' : 'Save Connection'}
              </button>
            </div>
          </div>

          {/* Webhook URL info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>Webhook Endpoint for n8n</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Add this URL as an HTTP Request node in your n8n workflows to send run data back to RevGuard.
              </div>
              <div style={{
                background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#3b82f6',
                wordBreak: 'break-all',
              }}>
                {webhookUrl}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                POST your workflow results here. Include <code style={{ background: 'rgba(59,130,246,0.1)', padding: '1px 4px', borderRadius: '3px' }}>user_id</code> and <code style={{ background: 'rgba(59,130,246,0.1)', padding: '1px 4px', borderRadius: '3px' }}>workflow_id</code> in the body.
              </div>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>Quick Start</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { step: '1', text: 'Set up a self-hosted n8n instance or use n8n Cloud' },
                  { step: '2', text: 'Connect n8n to your Stripe account via the Stripe node' },
                  { step: '3', text: 'Use workflow templates below as starting points' },
                  { step: '4', text: 'Add an HTTP Request node pointing to the webhook URL above' },
                  { step: '5', text: 'Workflow runs will appear here and in the Live Feed' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                      color: '#10b981', fontSize: '11px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{s.step}</div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Runs */}
      {tab === 'runs' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {runs.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🤖</div>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>No workflow runs yet</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Set up n8n workflows and point them to the webhook URL. Runs will appear here automatically.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Trigger</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => {
                  const s = STATUS_STYLE[run.status] || STATUS_STYLE.running
                  return (
                    <tr key={run.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{run.workflow_name || run.workflow_id}</td>
                      <td style={{ fontSize: '12px' }}>{run.trigger_type}</td>
                      <td style={{ fontSize: '12px' }}>{run.event_type || '--'}</td>
                      <td>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                          background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                        }}>{s.label}</span>
                      </td>
                      <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{fmtDuration(run.duration_ms)}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{timeAgo(run.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Templates */}
      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {WORKFLOW_TEMPLATES.map((tpl, i) => (
            <div key={i} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                  background: `${tpl.color}15`, border: `1px solid ${tpl.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                }}>{tpl.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{tpl.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trigger: {tpl.trigger}</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                {tpl.description}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {tpl.steps.map((step, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                      fontSize: '9px', width: 16, height: 16, borderRadius: '50%',
                      background: `${tpl.color}20`, color: tpl.color, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{j + 1}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{step}</span>
                    {j < tpl.steps.length - 1 && <span style={{ color: 'var(--border)', fontSize: '10px' }}>-</span>}
                  </div>
                ))}
              </div>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }} disabled>
                Use Template (requires n8n)
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
