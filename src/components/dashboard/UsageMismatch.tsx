'use client'

import { useState } from 'react'
import { useStripeUsageMismatch } from '@/lib/useStripe'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const riskColors: Record<string, string> = {
  high: 'badge-red',
  medium: 'badge-yellow',
  low: 'badge-green',
}

const typeColors: Record<string, string> = {
  'Underutilization': 'badge-yellow',
  'High Seat Count': 'badge-red',
  'Billing Discrepancy': 'badge-red',
}

export default function UsageMismatch() {
  const { data, loading, error } = useStripeUsageMismatch()
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'impact' | 'risk'>('impact')

  const mismatches: any[] = data?.mismatches || []
  const summary = data?.summary || { total: 0, highRisk: 0, totalLeakage: 0, totalSubscriptions: 0 }

  const filtered = filter === 'all' ? mismatches : mismatches.filter(m => m.risk === filter)
  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'impact' ? b.revenueImpact - a.revenueImpact : (a.risk === 'high' ? -1 : 1)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Revenue Leakage', value: loading ? '...' : fmt(summary.totalLeakage), color: '#ef4444', icon: '🕳️' },
          { label: 'Mismatched Accounts', value: loading ? '...' : String(summary.total), color: '#f59e0b', icon: '📊' },
          { label: 'High Risk', value: loading ? '...' : String(summary.highRisk), color: '#ef4444', icon: '⚠️' },
          { label: 'Active Subscriptions', value: loading ? '...' : String(summary.totalSubscriptions), color: '#10b981', icon: '✅' },
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

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'high', 'medium', 'low'] as const).map(f => (
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
          <button onClick={() => setSortBy('impact')} className={sortBy === 'impact' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '13px', padding: '7px 14px' }}>
            Sort by Impact
          </button>
          <button onClick={() => setSortBy('risk')} className={sortBy === 'risk' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '13px', padding: '7px 14px' }}>
            Sort by Risk
          </button>
          <button className="btn-primary">⬆️ Auto-Upgrade All</button>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
          Stripe error: {error}
        </div>
      ) : loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Analyzing Stripe subscriptions for usage mismatches...
        </div>
      ) : sorted.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#10b981', fontSize: '16px', fontWeight: 600 }}>
          ✅ No usage mismatches detected — all subscriptions are correctly billed!
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Usage vs Billing Mismatches — Stripe Live</span>
            <span className="badge-red">{sorted.length} detected</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>Contracted</th>
                <th>Actual Usage</th>
                <th>Overage</th>
                <th>Revenue Impact</th>
                <th>Risk</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m: any, i: number) => (
                <tr key={i}>
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{m.customerName}</div>
                    {m.customerEmail && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.customerEmail}</div>}
                  </td>
                  <td>
                    <span className={typeColors[m.mismatchType] || 'badge-blue'}>{m.mismatchType}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{m.contracted}</td>
                  <td style={{ color: '#f59e0b', fontWeight: 600, fontSize: '12px' }}>{m.actual}</td>
                  <td style={{ color: '#ef4444', fontWeight: 600, fontSize: '12px' }}>{m.overage}</td>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>{fmt(m.revenueImpact)}</td>
                  <td>
                    <span className={riskColors[m.risk]}>{m.risk}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer', fontWeight: 600 }}>
                        Upgrade
                      </button>
                      <button style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer', fontWeight: 600 }}>
                        Contact
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Banner */}
      <div style={{
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <span style={{ fontSize: '24px' }}>📊</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>Stripe Usage Intelligence — Live</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Detecting underutilization, seat overages, and billing discrepancies across all active subscriptions
          </div>
        </div>
        <span className="badge-green" style={{ marginLeft: 'auto' }}>Connected</span>
      </div>
    </div>
  )
}
