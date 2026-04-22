'use client'

import { useState } from 'react'
import { useStripeRecovery } from '@/lib/useStripe'
import { authFetch, getAuthUserId } from '@/lib/auth'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const workflows = [
  { name: 'Smart Retry Engine', status: 'active', description: 'Automatically retries open invoices via Stripe API', triggers: 'On demand or scheduled', icon: '🔄' },
  { name: 'Dunning Email Sequence', status: 'active', description: '5-email automated sequence with personalized messaging', triggers: 'Day 1, 3, 7, 14, 21', icon: '📧' },
  { name: 'Card Update Campaign', status: 'active', description: 'Secure payment update links via Stripe hosted pages', triggers: 'Card expiry detected', icon: '💳' },
  { name: 'CSM Escalation', status: 'active', description: 'Auto-assign high-value accounts to Customer Success Managers', triggers: '>$5,000 MRR accounts', icon: '👤' },
  { name: 'Pause & Negotiate', status: 'paused', description: 'Offer temporary pause or plan adjustment to retain customer', triggers: 'High churn risk', icon: '⏸️' },
  { name: 'Win-Back Automation', status: 'active', description: 'Re-engage churned customers with targeted offers', triggers: '30 days post-churn', icon: '🎯' },
]

export default function RevenueRecovery() {
  const { data, loading, error } = useStripeRecovery()
  const [activeTab, setActiveTab] = useState<'workflows' | 'retry' | 'history'>('workflows')
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [retryResults, setRetryResults] = useState<Record<string, { success: boolean; message: string }>>({})

  const stats = data?.stats || { totalRecovered: 0, totalAtRisk: 0, successRate: '0', retryEligibleCount: 0, retryEligibleAmount: 0 }
  const retryEligible: any[] = data?.retryEligible || []
  const recoveries: any[] = data?.recoveries || []

  const handleRetry = async (invoiceId: string) => {
    setRetryingId(invoiceId)
    try {
      const res = await authFetch('/api/stripe/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, userId: getAuthUserId() }),
      })
      const result = await res.json()
      if (result.success) {
        setRetryResults(prev => ({ ...prev, [invoiceId]: { success: true, message: `✅ Recovered ${fmt(result.amount)}` } }))
      } else {
        setRetryResults(prev => ({ ...prev, [invoiceId]: { success: false, message: `❌ ${result.error}` } }))
      }
    } catch (e: any) {
      setRetryResults(prev => ({ ...prev, [invoiceId]: { success: false, message: `❌ ${e.message}` } }))
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Recovered', value: loading ? '...' : fmt(stats.totalRecovered), color: '#10b981', icon: '💰' },
          { label: 'Retry Eligible', value: loading ? '...' : String(stats.retryEligibleCount), color: '#3b82f6', icon: '🔄' },
          { label: 'Retry Value', value: loading ? '...' : fmt(stats.retryEligibleAmount), color: '#f59e0b', icon: '💸' },
          { label: 'Success Rate', value: loading ? '...' : `${stats.successRate}%`, color: '#8b5cf6', icon: '📈' },
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
        {(['workflows', 'retry', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 600,
            color: activeTab === tab ? '#3b82f6' : 'var(--text-secondary)',
            borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            {tab === 'retry' && stats.retryEligibleCount > 0 && (
              <span style={{ background: '#ef4444', color: 'white', borderRadius: '10px', fontSize: '10px', padding: '1px 6px', fontWeight: 700 }}>
                {stats.retryEligibleCount}
              </span>
            )}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {workflows.map((wf, i) => (
            <div key={i} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ fontSize: '28px', marginTop: '2px' }}>{wf.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{wf.name}</span>
                    <span className={wf.status === 'active' ? 'badge-green' : 'badge-yellow'}>{wf.status}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{wf.description}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trigger: {wf.triggers}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button className={wf.status === 'active' ? 'btn-secondary' : 'btn-primary'} style={{ fontSize: '12px', padding: '6px 12px' }}>
                    {wf.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>Configure</button>
                </div>
              </div>
            </div>
          ))}
          <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>+ Create New Workflow</button>
        </div>
      )}

      {/* Retry Tab — REAL Stripe retry */}
      {activeTab === 'retry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>Stripe error: {error}</div>
          ) : loading ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Stripe invoices...</div>
          ) : retryEligible.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#10b981', fontSize: '16px', fontWeight: 600 }}>
              ✅ No invoices eligible for retry — all payments are current!
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={() => retryEligible.forEach(inv => handleRetry(inv.id))}>
                  🔄 Retry All ({retryEligible.length})
                </button>
              </div>
              {retryEligible.map((inv: any) => (
                <div key={inv.id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{inv.customerName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {inv.customerEmail} · {inv.attempts} attempt{inv.attempts !== 1 ? 's' : ''} · Invoice {inv.id.slice(0, 14)}...
                      </div>
                      {inv.nextPaymentAttempt && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>
                          Next auto-retry: {new Date(inv.nextPaymentAttempt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '90px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444' }}>{fmt(inv.amount)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{inv.currency}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                      {retryResults[inv.id] ? (
                        <div style={{
                          fontSize: '12px', fontWeight: 600, padding: '6px 10px', borderRadius: '6px',
                          background: retryResults[inv.id].success ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                          color: retryResults[inv.id].success ? '#10b981' : '#ef4444',
                          border: `1px solid ${retryResults[inv.id].success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`,
                          textAlign: 'center'
                        }}>
                          {retryResults[inv.id].message}
                        </div>
                      ) : (
                        <>
                          <button
                            className="btn-primary"
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                            onClick={() => handleRetry(inv.id)}
                            disabled={retryingId === inv.id}
                          >
                            {retryingId === inv.id ? 'Retrying...' : '🔄 Retry Now'}
                          </button>
                          {inv.hostedUrl && (
                            <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer"
                              className="btn-secondary"
                              style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none', textAlign: 'center' }}>
                              View Invoice ↗
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading recovery history...</div>
          ) : recoveries.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No recovery history found yet — retried payments will appear here.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Amount Recovered</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recoveries.map((r: any, i: number) => (
                  <tr key={i}>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.customerName}</div>
                      {r.customerEmail && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.customerEmail}</div>}
                    </td>
                    <td style={{ color: '#10b981', fontWeight: 700 }}>{fmt(r.amount)}</td>
                    <td><span className="badge-blue">{r.method}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(r.recoveredAt).toLocaleDateString()}
                    </td>
                    <td><span className="badge-green">Recovered</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Banner */}
      <div style={{
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <span style={{ fontSize: '24px' }}>⚡</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>Stripe Recovery Engine — Live</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Real-time retry via Stripe API · Click "Retry Now" on the Retry tab to instantly attempt payment recovery
          </div>
        </div>
        <span className="badge-green" style={{ marginLeft: 'auto' }}>Connected</span>
      </div>
    </div>
  )
}
