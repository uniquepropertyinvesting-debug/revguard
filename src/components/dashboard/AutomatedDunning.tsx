'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth'

interface DunningSequence {
  id: string
  invoice_id: string
  customer_email: string
  customer_name: string
  amount: number
  currency: string
  status: string  // active | recovered | cancelled | exhausted
  step: number
  last_email_sent_at: number | null
  next_email_due_at: number | null
  created_at: number
}

interface DunningStats {
  total: number
  active: number
  recovered: number
  exhausted: number
  cancelled: number
  totalAmountInSequence: number
  totalAmountRecovered: number
  due: number
}

function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function timeUntil(ts: number) {
  const diff = ts - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'Due now'
  if (diff < 3600) return `in ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `in ${Math.floor(diff / 3600)}h`
  return `in ${Math.floor(diff / 86400)}d`
}

const STEP_LABELS = ['Not started', 'Day 1 sent', 'Day 3 sent', 'Day 7 sent']
const STEP_COLORS = ['#64748b', '#f59e0b', '#ef4444', '#dc2626']
const STEP_DAYS = [null, 1, 3, 7]

export default function AutomatedDunning() {
  const [sequences, setSequences] = useState<DunningSequence[]>([])
  const [stats, setStats] = useState<DunningStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [tab, setTab] = useState<'active' | 'all' | 'settings'>('active')
  const [runResult, setRunResult] = useState<{ processed: number; results: any[] } | null>(null)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [enrollInvoiceId, setEnrollInvoiceId] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  const load = () => {
    setLoading(true)
    authFetch('/api/dunning')
      .then(r => r.json())
      .then(d => {
        if (d.sequences) setSequences(d.sequences)
        if (d.stats) setStats(d.stats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const runDunning = async () => {
    setRunning(true)
    setRunResult(null)
    setActionMsg(null)
    try {
      const r = await authFetch('/api/dunning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run' }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setRunResult(d)
      setActionMsg({ type: 'success', text: d.message })
      load()
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message })
    } finally {
      setRunning(false)
    }
  }

  const syncFromStripe = async () => {
    setSyncing(true)
    setActionMsg(null)
    try {
      const r = await authFetch('/api/dunning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setActionMsg({ type: 'success', text: d.message })
      load()
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message })
    } finally {
      setSyncing(false)
    }
  }

  const cancelSequence = async (invoiceId: string) => {
    try {
      await authFetch('/api/dunning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', invoiceId }),
      })
      load()
    } catch {}
  }

  const enrollManual = async () => {
    if (!enrollInvoiceId.trim()) return
    setEnrolling(true)
    setActionMsg(null)
    try {
      const r = await authFetch('/api/dunning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enroll', invoiceId: enrollInvoiceId.trim() }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setActionMsg({ type: 'success', text: d.message })
      setEnrollInvoiceId('')
      load()
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message })
    } finally {
      setEnrolling(false)
    }
  }

  const activeSeqs = sequences.filter(s => s.status === 'active')
  const allSeqs = sequences
  const displaySeqs = tab === 'active' ? activeSeqs : allSeqs

  const statusStyle = (status: string) => {
    if (status === 'recovered') return { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#10b981', label: 'Recovered' }
    if (status === 'cancelled') return { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#64748b', label: 'Cancelled' }
    if (status === 'exhausted') return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', label: 'Exhausted' }
    return { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b', label: 'Active' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Active Sequences', value: loading ? '...' : (stats?.active || 0).toString(), color: '#f59e0b', icon: '📧', sub: `${stats?.due || 0} due now` },
          { label: 'Amount in Recovery', value: loading ? '...' : `$${(stats?.totalAmountInSequence || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#ef4444', icon: '💰', sub: 'being recovered' },
          { label: 'Revenue Recovered', value: loading ? '...' : `$${(stats?.totalAmountRecovered || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#10b981', icon: '✅', sub: 'via dunning' },
          { label: 'Recovery Rate', value: loading ? '...' : stats?.total ? `${Math.round(((stats.recovered) / stats.total) * 100)}%` : '—', color: '#3b82f6', icon: '📈', sub: `${stats?.recovered || 0} of ${stats?.total || 0} total` },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</div>
              <span style={{ fontSize: '20px' }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* How dunning works */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📬 3-Step Dunning Sequence
            <span className="badge-green" style={{ fontSize: '9px' }}>AUTOMATED</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              onClick={syncFromStripe}
              disabled={syncing}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              {syncing ? '⏳ Syncing...' : '🔄 Sync Failed Invoices'}
            </button>
            <button
              className="btn-primary"
              onClick={runDunning}
              disabled={running || (stats?.due === 0)}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              {running ? '⏳ Running...' : `▶ Run Now${stats?.due ? ` (${stats.due} due)` : ''}`}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { day: 'Day 1', icon: '📧', subject: 'Action Required: Your payment failed', urgency: 'Friendly notice', color: '#f59e0b', desc: 'Sent immediately when enrolled. Polite, helpful tone. Explains what happened and how to fix it.' },
            { day: 'Day 3', icon: '⚠️', subject: 'Reminder: Payment is still outstanding', urgency: 'Escalated reminder', color: '#ef4444', desc: 'Follow-up 3 days after Day 1 if not paid. More direct. Emphasizes service continuity.' },
            { day: 'Day 7', icon: '🚨', subject: 'Final Notice: Service suspension in 48hrs', urgency: 'Final warning', color: '#dc2626', desc: 'Final notice 4 days after Day 3. Urgent tone. 48-hour suspension warning. Creates urgency.' },
          ].map((step, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: `1px solid ${step.color}30`, borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>{step.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: step.color }}>{step.day}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{step.urgency}</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>"{step.subject}"</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
          background: actionMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${actionMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: actionMsg.type === 'success' ? '#10b981' : '#ef4444',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {actionMsg.type === 'success' ? '✅' : '❌'} {actionMsg.text}
          {runResult && runResult.results?.length > 0 && (
            <div style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
              {runResult.results.map((r, i) => (
                <span key={i} style={{ marginRight: '8px' }}>
                  {r.customerEmail}: Day {r.day} {r.emailSent ? '📧 sent' : '📝 logged'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs + sequence list */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'active', label: `Active (${activeSeqs.length})` },
          { key: 'all', label: `All Sequences (${sequences.length})` },
          { key: 'settings', label: 'Enroll Invoice' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 600,
            color: tab === t.key ? '#3b82f6' : 'var(--text-secondary)',
            borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-1px'
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Enroll tab */}
      {tab === 'settings' && (
        <div className="card" style={{ padding: '24px', maxWidth: '560px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>Manually Enroll an Invoice</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
            Enter a Stripe Invoice ID (starts with <code style={{ background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>in_</code>) to enroll it in the automated dunning sequence. The Day 1 email will be sent on the next run.
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              value={enrollInvoiceId}
              onChange={e => setEnrollInvoiceId(e.target.value)}
              placeholder="in_xxxxxxxxxxxxxxxx"
              style={{ flex: 1, fontSize: '13px' }}
              onKeyDown={e => e.key === 'Enter' && enrollManual()}
            />
            <button
              className="btn-primary"
              onClick={enrollManual}
              disabled={enrolling || !enrollInvoiceId.trim()}
              style={{ padding: '10px 20px', fontSize: '13px', whiteSpace: 'nowrap' }}
            >
              {enrolling ? '⏳...' : '+ Enroll'}
            </button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Tip: Use "Sync Failed Invoices" above to automatically enroll all open failed invoices from Stripe.
          </div>
        </div>
      )}

      {/* Sequence list */}
      {tab !== 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading dunning sequences...</div>
          )}
          {!loading && displaySeqs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                {tab === 'active' ? 'No active dunning sequences' : 'No dunning sequences yet'}
              </div>
              <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                Click "Sync Failed Invoices" to automatically enroll failed Stripe invoices.
              </div>
              <button className="btn-primary" onClick={syncFromStripe} disabled={syncing} style={{ fontSize: '13px' }}>
                {syncing ? '⏳ Syncing...' : '🔄 Sync from Stripe'}
              </button>
            </div>
          )}
          {!loading && displaySeqs.map((seq, i) => {
            const ss = statusStyle(seq.status)
            const stepColor = STEP_COLORS[seq.step] || '#64748b'
            const isDue = seq.status === 'active' && seq.step < 3 && (!seq.next_email_due_at || seq.next_email_due_at <= Math.floor(Date.now() / 1000))
            return (
              <div key={seq.id} style={{
                background: 'var(--bg-card)', border: `1px solid ${isDue ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                borderRadius: '12px', padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
              }}>

                {/* Customer info */}
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {seq.customer_name || seq.customer_email}
                  </div>
                  {seq.customer_name && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{seq.customer_email}</div>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Invoice: <code style={{ fontSize: '10px', color: '#3b82f6' }}>{seq.invoice_id}</code>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: ss.color }}>${seq.amount.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{seq.currency}</div>
                </div>

                {/* Step progress */}
                <div style={{ minWidth: '160px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    {[1, 2, 3].map(s => (
                      <div key={s} style={{
                        flex: 1, height: '6px', borderRadius: '3px',
                        background: seq.step >= s
                          ? STEP_COLORS[s]
                          : 'var(--border)',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: stepColor, fontWeight: 600 }}>
                    {STEP_LABELS[seq.step]}
                    {seq.step < 3 && seq.status === 'active' && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        {' — '}
                        {isDue
                          ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>Next email due now</span>
                          : seq.next_email_due_at
                            ? `next ${timeUntil(seq.next_email_due_at)}`
                            : 'pending'
                        }
                      </span>
                    )}
                  </div>
                  {seq.last_email_sent_at && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Last sent: {timeAgo(seq.last_email_sent_at)}</div>
                  )}
                </div>

                {/* Status badge */}
                <div style={{
                  padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color,
                  whiteSpace: 'nowrap'
                }}>
                  {isDue && <span style={{ marginRight: '4px' }}>⚡</span>}
                  {ss.label}
                </div>

                {/* Actions */}
                {seq.status === 'active' && (
                  <button
                    onClick={() => cancelSequence(seq.invoice_id)}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '5px 10px', whiteSpace: 'nowrap' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* How it works explainer */}
      {tab !== 'settings' && (
        <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '16px 20px' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💡</span> How Automated Dunning Works
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { step: '1', text: 'Sync failed invoices from Stripe or enroll manually' },
              { step: '2', text: 'RevGuard sends Day 1, Day 3, and Day 7 emails automatically' },
              { step: '3', text: 'Customer clicks CTA and updates payment method' },
              { step: '4', text: 'Invoice is recovered and sequence marked complete' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{s.step}</div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
