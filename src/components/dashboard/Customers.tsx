'use client'

import { useState } from 'react'
import { useStripeCustomers } from '@/lib/useStripe'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const STATUS_STYLE: Record<string, { bg: string; border: string; color: string; label: string }> = {
  active:   { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  color: '#10b981', label: 'Active' },
  past_due: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  color: '#f59e0b', label: 'Past Due' },
  canceled: { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   color: '#ef4444', label: 'Canceled' },
  trialing: { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)',  color: '#3b82f6', label: 'Trialing' },
  none:     { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#64748b', label: 'No Sub' },
}

export default function Customers() {
  const { data: customers, loading, error } = useStripeCustomers()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'mrr' | 'name' | 'created'>('mrr')

  const filtered = customers
    .filter(c => {
      if (statusFilter !== 'all' && c.subscriptionStatus !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'mrr') return b.mrr - a.mrr
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return new Date(b.created).getTime() - new Date(a.created).getTime()
    })

  const totalMRR = customers.filter(c => c.subscriptionStatus === 'active').reduce((s, c) => s + c.mrr, 0)
  const activeCount = customers.filter(c => c.subscriptionStatus === 'active').length
  const pastDueCount = customers.filter(c => c.subscriptionStatus === 'past_due').length
  const atRiskMRR = customers.filter(c => c.subscriptionStatus === 'past_due').reduce((s, c) => s + c.mrr, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Customers', value: loading ? '...' : customers.length.toString(), color: '#3b82f6', icon: '👥' },
          { label: 'Active Subscriptions', value: loading ? '...' : activeCount.toString(), color: '#10b981', icon: '✅' },
          { label: 'Total MRR', value: loading ? '...' : fmt(totalMRR), color: '#8b5cf6', icon: '💰' },
          { label: 'Past Due MRR at Risk', value: loading ? '...' : fmt(atRiskMRR), color: '#f59e0b', icon: '⚠️', sub: `${pastDueCount} accounts` },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                {'sub' in s && s.sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub}</div>}
              </div>
              <span style={{ fontSize: '22px' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          style={{ flex: '1 1 220px', fontSize: '13px' }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'active', 'past_due', 'canceled', 'none'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                background: statusFilter === s ? 'rgba(59,130,246,0.15)' : 'var(--bg-card)',
                borderColor: statusFilter === s ? 'rgba(59,130,246,0.4)' : 'var(--border)',
                color: statusFilter === s ? '#3b82f6' : 'var(--text-muted)',
              }}
            >
              {s === 'all' ? 'All' : s === 'past_due' ? 'Past Due' : s === 'none' ? 'No Sub' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          style={{ fontSize: '12px', padding: '6px 10px' }}
        >
          <option value="mrr">Sort: MRR ↓</option>
          <option value="name">Sort: Name A–Z</option>
          <option value="created">Sort: Newest</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
            Stripe error: {error}
          </div>
        ) : loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading customers from Stripe...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>
              {search || statusFilter !== 'all' ? 'No customers match your filters' : 'No customers found in Stripe'}
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>MRR</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const ss = STATUS_STYLE[c.subscriptionStatus] || STATUS_STYLE.none
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.email}</div>
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 9px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                        background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color,
                        whiteSpace: 'nowrap'
                      }}>
                        {ss.label}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: c.mrr > 0 ? '#8b5cf6' : 'var(--text-muted)', fontSize: '13px' }}>
                        {c.mrr > 0 ? fmt(c.mrr) + '/mo' : '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(c.created).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <a
                          href={`https://dashboard.stripe.com/customers/${c.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 10px', textDecoration: 'none' }}
                        >
                          Stripe ↗
                        </a>
                        {c.subscriptionStatus === 'past_due' && (
                          <span className="badge-yellow" style={{ fontSize: '9px', alignSelf: 'center' }}>NEEDS ACTION</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
          Showing {filtered.length} of {customers.length} customers · Live Stripe data
        </div>
      )}
    </div>
  )
}
