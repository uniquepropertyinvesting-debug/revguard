'use client'

import { useState } from 'react'
import { useStripeBillingErrors } from '@/lib/useStripe'

const typeColors: Record<string, string> = {
  'Duplicate': 'badge-red',
  'Uncollectible': 'badge-red',
  'Voided Invoice': 'badge-yellow',
  'Past Due Invoice': 'badge-yellow',
  'Undercharge': 'badge-yellow',
  'Overcharge': 'badge-red',
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BillingErrors() {
  const { data, loading, error } = useStripeBillingErrors()
  const [filter, setFilter] = useState('all')

  const errors: any[] = data?.errors || []
  const summary = data?.summary || { total: 0, open: 0, totalImpact: 0, resolved: 0 }

  const filtered = filter === 'all'
    ? errors
    : filter === 'open'
      ? errors.filter(e => e.status !== 'paid' && e.status !== 'void')
      : filter === 'resolved'
        ? errors.filter(e => e.status === 'paid')
        : errors

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Open Errors', value: loading ? '...' : String(summary.open), color: '#ef4444', icon: '🚨' },
          { label: 'Total Impact', value: loading ? '...' : fmt(summary.totalImpact), color: '#f59e0b', icon: '💸' },
          { label: 'Resolved', value: loading ? '...' : String(summary.resolved), color: '#10b981', icon: '✅' },
          { label: 'Total Detected', value: loading ? '...' : String(summary.total), color: '#3b82f6', icon: '🤖' },
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

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'open', 'resolved'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: filter === f ? 'rgba(59,130,246,0.2)' : 'var(--bg-card)',
              color: filter === f ? '#3b82f6' : 'var(--text-secondary)',
              border: filter === f ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border)',
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn-primary" disabled={loading || !!error} title="Refreshes billing error data">Run Billing Audit</button>
      </div>

      {/* Error Cards */}
      {error ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
          Stripe error: {error}
        </div>
      ) : loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Scanning Stripe invoices for billing errors...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#10b981', fontSize: '16px', fontWeight: 600 }}>
          ✅ No billing errors detected — all invoices look clean!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((err: any) => (
            <div key={err.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                      {err.customerName}
                    </span>
                    <span className={typeColors[err.type] || 'badge-blue'}>{err.type}</span>
                    <span className="badge-purple">Stripe</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {err.description}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {err.customerEmail && <span>{err.customerEmail} · </span>}
                    Invoice {err.id.slice(0, 16)}... · {new Date(err.created).toLocaleDateString()}
                    {err.attemptCount > 1 && <span> · {err.attemptCount} attempts</span>}
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: err.type === 'Undercharge' ? '#f59e0b' : '#ef4444' }}>
                    {fmt(err.amount)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{err.currency}</div>
                  <span className={
                    err.status === 'paid' ? 'badge-green' :
                    err.status === 'open' ? 'badge-yellow' :
                    err.status === 'void' ? 'badge-blue' : 'badge-red'
                  }>
                    {err.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '100px' }}>
                  {err.status !== 'paid' && err.status !== 'void' && (
                    <>
                      {err.hostedUrl ? (
                        <a href={err.hostedUrl} target="_blank" rel="noopener noreferrer"
                          className="btn-primary"
                          style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none', textAlign: 'center' }}>
                          Fix Now ↗
                        </a>
                      ) : (
                        <button className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}>Fix Now</button>
                      )}
                      <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>Review</button>
                    </>
                  )}
                  {(err.status === 'paid' || err.status === 'void') && (
                    <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>View Log</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Banner */}
      <div style={{
        background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '10px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <span style={{ fontSize: '24px' }}>🤖</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>Stripe Invoice Anomaly Detection — Live</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Scanning for duplicates, uncollectibles, voids, past-due invoices, and discount anomalies
          </div>
        </div>
        <span className="badge-green" style={{ marginLeft: 'auto' }}>Connected</span>
      </div>
    </div>
  )
}
