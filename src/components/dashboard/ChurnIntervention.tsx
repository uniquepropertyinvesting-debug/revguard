'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth'

interface ChurnAccount {
  id: string
  customerName: string
  customerEmail: string
  mrr: number
  score: number
  signals: string[]
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string
}

interface Playbook {
  name: string
  trigger: string
  steps: number
  success: string
  active: boolean
}

const PLAYBOOKS: Playbook[] = [
  { name: 'High Risk Outreach', trigger: 'Score > 75', steps: 4, success: '71%', active: true },
  { name: 'Feature Adoption', trigger: 'Low feature usage', steps: 6, success: '64%', active: true },
  { name: 'Renewal Defense', trigger: '30d before renewal', steps: 8, success: '83%', active: true },
  { name: 'Payment Failure CSM', trigger: '2+ failed payments', steps: 3, success: '89%', active: true },
  { name: 'Downgrade Prevention', trigger: 'Downgrade request', steps: 5, success: '52%', active: false },
]

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export default function ChurnIntervention() {
  const [tab, setTab] = useState<'active' | 'playbooks'>('active')
  const [accounts, setAccounts] = useState<ChurnAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/stripe/churn-risk')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.risks)) {
          // Only show accounts that actually need intervention (score >= 50 OR cancel at period end)
          setAccounts(d.risks.filter((r: ChurnAccount) => r.score >= 50 || r.cancelAtPeriodEnd || r.status === 'past_due'))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const mrrDefended = accounts.reduce((sum, a) => sum + a.mrr, 0)
  const highRisk = accounts.filter(a => a.score >= 75)

  const getActionSteps = (account: ChurnAccount) => {
    const steps = []
    if (account.status === 'past_due') {
      steps.push({ type: 'Alert', label: 'Payment past due — retry needed', status: 'pending', time: 'Immediate' })
      steps.push({ type: 'Email', label: 'Send payment failure notice', status: 'pending', time: 'Today' })
    }
    if (account.cancelAtPeriodEnd) {
      steps.push({ type: 'CSM', label: 'Cancel flag detected — outreach needed', status: 'pending', time: 'Immediate' })
      steps.push({ type: 'Offer', label: 'Prepare retention offer', status: 'pending', time: `${daysUntil(account.currentPeriodEnd)}d until cancel` })
    }
    if (account.score >= 75) {
      steps.push({ type: 'Email', label: 'Executive outreach email', status: 'pending', time: 'Today' })
      steps.push({ type: 'Call', label: 'Schedule EBR / check-in call', status: 'pending', time: 'This week' })
    } else if (account.score >= 50) {
      steps.push({ type: 'Email', label: 'Health check email', status: 'pending', time: 'Today' })
      steps.push({ type: 'Training', label: 'Feature adoption review', status: 'pending', time: 'This week' })
    }
    if (steps.length === 0) {
      steps.push({ type: 'Monitor', label: 'Monitoring for further signals', status: 'in_progress', time: 'Ongoing' })
    }
    return steps
  }

  const statusStyle = (status: string) => {
    if (status === 'done') return { color: '#10b981', icon: '✓' }
    if (status === 'in_progress') return { color: '#3b82f6', icon: '↻' }
    return { color: '#f59e0b', icon: '○' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Accounts Needing Action', value: loading ? '...' : accounts.length.toString(), color: '#3b82f6', icon: '🛡️' },
          { label: 'MRR at Risk', value: loading ? '...' : `$${mrrDefended.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#ef4444', icon: '💰' },
          { label: 'High Risk (Score ≥75)', value: loading ? '...' : highRisk.length.toString(), color: '#f59e0b', icon: '⚠️' },
          { label: 'Playbooks Active', value: PLAYBOOKS.filter(p => p.active).length.toString(), color: '#10b981', icon: '📋' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
              <span style={{ fontSize: '22px' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)' }}>
        {(['active', 'playbooks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 600,
            color: tab === t ? '#3b82f6' : 'var(--text-secondary)',
            borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-1px'
          }}>
            {t === 'active' ? `Active Interventions${!loading ? ` (${accounts.length})` : ''}` : 'Intervention Playbooks'}
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading churn risk data...</div>
          )}
          {!loading && accounts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>No interventions needed right now</div>
              <div style={{ fontSize: '12px' }}>All subscriptions look healthy — we'll alert you when accounts need attention</div>
            </div>
          )}
          {!loading && accounts.map((account, i) => {
            const steps = getActionSteps(account)
            return (
              <div key={i} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{account.customerName}</span>
                    <span style={{
                      fontSize: '13px', fontWeight: 700, padding: '2px 10px', borderRadius: '12px',
                      background: account.score >= 75 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: account.score >= 75 ? '#ef4444' : '#f59e0b',
                      border: `1px solid ${account.score >= 75 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                    }}>Score: {account.score}</span>
                    <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 700 }}>${account.mrr.toFixed(0)}/mo MRR</span>
                    {account.status === 'past_due' && <span className="badge-red" style={{ fontSize: '10px' }}>PAST DUE</span>}
                    {account.cancelAtPeriodEnd && <span className="badge-yellow" style={{ fontSize: '10px' }}>CANCELING</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {account.signals.slice(0, 2).join(' · ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {steps.map((step, j) => {
                    const style = statusStyle(step.status)
                    return (
                      <div key={j} style={{
                        flex: '1 1 140px', padding: '10px', borderRadius: '8px',
                        background: step.status === 'done' ? 'rgba(16,185,129,0.05)' : step.status === 'in_progress' ? 'rgba(59,130,246,0.05)' : 'rgba(245,158,11,0.05)',
                        border: `1px solid ${step.status === 'done' ? 'rgba(16,185,129,0.2)' : step.status === 'in_progress' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ color: style.color, fontSize: '14px', fontWeight: 700 }}>{style.icon}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: style.color, textTransform: 'uppercase' }}>{step.type}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '2px' }}>{step.label}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{step.time}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'playbooks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {PLAYBOOKS.map((pb, i) => (
            <div key={i} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{pb.name}</span>
                  <span className={pb.active ? 'badge-green' : 'badge-yellow'}>{pb.active ? 'Active' : 'Paused'}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trigger: {pb.trigger} · {pb.steps} steps</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{pb.success}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Success Rate</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>Edit</button>
                <button className={pb.active ? 'btn-danger' : 'btn-primary'} style={{ fontSize: '12px', padding: '6px 12px' }}>
                  {pb.active ? 'Pause' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
          <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>+ Create Playbook</button>
        </div>
      )}
    </div>
  )
}
