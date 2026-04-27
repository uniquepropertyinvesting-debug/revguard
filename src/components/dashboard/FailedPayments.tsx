'use client'

import { useState } from 'react'
import { useStripeFailedPayments, useStripeOverview } from '@/lib/useStripe'

export default function FailedPayments() {
  const { data: failedPayments, loading, error } = useStripeFailedPayments()
  const { data: overview } = useStripeOverview()
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState('all')

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const getRisk = (amount: number, failureCode: string) => {
    if (amount >= 1000 || failureCode === 'card_declined') return 'critical'
    if (amount >= 500) return 'high'
    if (amount >= 100) return 'medium'
    return 'low'
  }

  const enriched = failedPayments.map(p => ({ ...p, risk: getRisk(p.amount, p.failureCode) }))
  const filtered = filter === 'all' ? enriched : enriched.filter(p => p.risk === filter)
  const totalAtRisk = failedPayments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total At Risk', value: loading ? '...' : `$${totalAtRisk.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: '#ef4444', icon: '💸' },
          { label: 'Failed Payments', value: loading ? '...' : String(failedPayments.length), color: '#f59e0b', icon: '❌' },
          { label: 'Recovery Rate', value: loading ? '...' : `${overview?.recoveryRate ?? 0}%`, color: '#10b981', icon: '🔄' },
          { label: 'Total Customers', value: loading ? '...' : String(overview?.totalCustomers ?? 0), color: '#3b82f6', icon: '👥' },
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

      {/* Filters + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'critical', 'high', 'medium', 'low'].map(f => (
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
        <div style={{ display: 'flex', gap: '8px' }}>
          {selected.length > 0 && (
            <>
              <button className="btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                ↻ Retry Selected ({selected.length})
              </button>
              <button className="btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                📧 Send Recovery Email
              </button>
            </>
          )}
          <button className="btn-primary" disabled={loading || failedPayments.length === 0}>Smart Retry All</button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
            Stripe error: {error}
          </div>
        ) : loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading Stripe data...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#10b981', fontSize: '16px', fontWeight: 600 }}>
            ✅ No failed payments found — your revenue is protected!
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" onChange={e => setSelected(e.target.checked ? filtered.map(p => p.id) : [])} />
                </th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Failure Reason</th>
                <th>Date</th>
                <th>Method</th>
                <th>Risk</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.customerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.customerEmail}</div>
                  </td>
                  <td style={{ color: '#ef4444', fontWeight: 700, fontSize: '15px' }}>
                    ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>{p.failureMessage}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(p.created).toLocaleDateString()}
                  </td>
                  <td>
                    <span className="badge-purple">{p.paymentMethod}</span>
                  </td>
                  <td>
                    <span className={p.risk === 'critical' ? 'badge-red' : p.risk === 'high' ? 'badge-yellow' : p.risk === 'medium' ? 'badge-blue' : 'badge-green'}>
                      {p.risk}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer', fontWeight: 600 }}>
                        Retry
                      </button>
                      <button style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer', fontWeight: 600 }}>
                        Email
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stripe Status */}
      <div style={{
        background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '10px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚡</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Stripe Connected — Live Data</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {failedPayments.length} failed payments detected · Smart retry ready
            </div>
          </div>
        </div>
        <button className="btn-secondary" style={{ fontSize: '13px' }}>Configure</button>
      </div>
    </div>
  )
}
