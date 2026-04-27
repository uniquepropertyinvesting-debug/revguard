'use client'

import { useState } from 'react'
import { useStripeChurnRisk } from '@/lib/useStripe'
import { exportCsv } from '@/lib/exportCsv'

const scoreColor = (score: number) => {
  if (score >= 75) return '#ef4444'
  if (score >= 50) return '#f59e0b'
  return '#10b981'
}

const scoreLabel = (score: number) => {
  if (score >= 75) return 'High Risk'
  if (score >= 50) return 'Medium Risk'
  return 'Low Risk'
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function ChurnRisk() {
  const { data, loading, error } = useStripeChurnRisk()
  const [sortBy, setSortBy] = useState<'score' | 'mrr'>('score')
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [page, setPage] = useState(0)
  const pageSize = 10

  const risks: any[] = data?.risks || []
  const summary = data?.summary || { total: 0, highRisk: 0, mediumRisk: 0, mrrAtRisk: 0 }

  const filtered = risks.filter(r => {
    if (filter === 'high') return r.score >= 75
    if (filter === 'medium') return r.score >= 50 && r.score < 75
    if (filter === 'low') return r.score < 50
    return true
  })

  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'score' ? b.score - a.score : b.mrr - a.mrr
  )
  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'MRR At Risk', value: loading ? '...' : fmt(summary.mrrAtRisk), color: '#ef4444', icon: '💸' },
          { label: 'High Risk Accounts', value: loading ? '...' : String(summary.highRisk), color: '#f59e0b', icon: '⚠️' },
          { label: 'Medium Risk Accounts', value: loading ? '...' : String(summary.mediumRisk), color: '#8b5cf6', icon: '📊' },
          { label: 'Total Monitored', value: loading ? '...' : String(summary.total), color: '#10b981', icon: '✅' },
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
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
          <button onClick={() => setSortBy('score')} className={sortBy === 'score' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '13px', padding: '7px 14px' }}>
            Sort by Risk
          </button>
          <button onClick={() => setSortBy('mrr')} className={sortBy === 'mrr' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '13px', padding: '7px 14px' }}>
            Sort by MRR
          </button>
          <button className="btn-primary" disabled={!data || summary.highRisk === 0} title={summary.highRisk === 0 ? 'No high-risk accounts' : 'Navigate to Churn Intervention for action plans'}>Auto-Intervene High Risk</button>
          <button
            className="btn-secondary"
            disabled={loading || risks.length === 0}
            style={{ fontSize: '13px', padding: '7px 14px' }}
            onClick={() => exportCsv('churn-risk', ['customerName', 'customerEmail', 'score', 'mrr', 'status', 'daysActive', 'signals'], sorted.map(r => ({ ...r, signals: r.signals.join('; ') })))}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Account Cards */}
      {error ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
          Stripe error: {error}
        </div>
      ) : loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading churn risk data from Stripe...
        </div>
      ) : sorted.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#10b981', fontSize: '16px', fontWeight: 600 }}>
          ✅ No churn risks detected — all subscriptions are healthy!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {paginated.map((acct, i) => (
            <div key={i} className="card" style={{ padding: '16px 20px' }}>
              <div className="responsive-flex" style={{ alignItems: 'center' }}>

                {/* Risk Score Gauge */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    border: `4px solid ${scoreColor(acct.score)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column'
                  }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: scoreColor(acct.score) }}>{acct.score}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Risk Score</div>
                </div>

                {/* Customer Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                      {acct.customerName}
                    </span>
                    <span className={acct.score >= 75 ? 'badge-red' : acct.score >= 50 ? 'badge-yellow' : 'badge-green'}>
                      {scoreLabel(acct.score)}
                    </span>
                    {acct.status === 'past_due' && <span className="badge-red">Past Due</span>}
                    {acct.cancelAtPeriodEnd && <span className="badge-yellow">Canceling</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', wordBreak: 'break-word' }}>
                    {acct.customerEmail} · {acct.daysActive} days active · Renews {new Date(acct.currentPeriodEnd).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {acct.signals.map((sig: string, j: number) => (
                      <span key={j} style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.2)'
                      }}>{sig}</span>
                    ))}
                  </div>
                </div>

                {/* MRR + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>{fmt(acct.mrr)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MRR</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}>Intervene Now</button>
                    <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>View in Stripe</button>
                  </div>
                </div>
              </div>

              {/* Risk Progress Bar */}
              <div style={{ marginTop: '12px' }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${acct.score}%`, background: scoreColor(acct.score) }} />
                </div>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stripe badge */}
      <div style={{
        background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '10px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚡</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Stripe Churn Intelligence — Live</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Scoring based on payment status, subscription age, and cancellation signals
            </div>
          </div>
        </div>
        <span className="badge-green">Connected</span>
      </div>
    </div>
  )
}
