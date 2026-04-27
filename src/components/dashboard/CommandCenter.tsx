'use client'

import { useStripeOverview, useStripeFailedPayments } from '@/lib/useStripe'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function CommandCenter() {
  const { data: overview, loading: ovLoading, error: ovError } = useStripeOverview()
  const { data: failed, loading: failLoading, error: failError } = useStripeFailedPayments()
  const dataError = ovError || failError

  const kpiCards = [
    {
      label: 'Revenue At Risk', icon: '⚠️', color: '#ef4444',
      value: ovLoading ? '...' : fmt(overview?.failedRevenue ?? 0),
      change: `${overview?.failedCount ?? 0} failed`, sub: 'This month', trend: 'down'
    },
    {
      label: 'Total Revenue', icon: '✅', color: '#10b981',
      value: ovLoading ? '...' : fmt(overview?.totalRevenue ?? 0),
      change: `${overview?.succeededCount ?? 0} payments`, sub: 'Last 30 days', trend: 'up'
    },
    {
      label: 'Recovery Rate', icon: '📈', color: '#3b82f6',
      value: ovLoading ? '...' : `${overview?.recoveryRate ?? 0}%`,
      change: 'Success rate', sub: 'Last 30 days', trend: 'up'
    },
    {
      label: 'Total Customers', icon: '👥', color: '#f59e0b',
      value: ovLoading ? '...' : String(overview?.totalCustomers ?? 0),
      change: `${overview?.activeSubscriptions ?? 0} active`, sub: 'In Stripe', trend: 'neutral'
    },
    {
      label: 'Monthly Recurring Revenue', icon: '💰', color: '#8b5cf6',
      value: ovLoading ? '...' : fmt(overview?.mrr ?? 0),
      change: `${overview?.pastDueSubscriptions ?? 0} past due`, sub: 'MRR', trend: 'up'
    },
    {
      label: 'Past Due Subscriptions', icon: '🛡️', color: '#06b6d4',
      value: ovLoading ? '...' : String(overview?.pastDueSubscriptions ?? 0),
      change: `${overview?.canceledSubscriptions ?? 0} canceled`, sub: 'Needs attention', trend: 'neutral'
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {dataError && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '10px', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>&#9888;</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', marginBottom: '2px' }}>
              Unable to load Stripe data
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {dataError} -- Check that your Stripe key is connected in Integrations.
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '12px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Revenue Protection Active <span style={{ fontSize: '18px' }}>🛡️</span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Live Stripe data · {overview?.totalCustomers ?? '...'} accounts · Real-time monitoring
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
            {ovLoading ? '...' : fmt(overview?.totalRevenue ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Revenue Last 30 Days</div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {kpiCards.map((card, i) => (
          <div key={i} className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                  {card.value}
                </div>
              </div>
              <div style={{ fontSize: '24px' }}>{card.icon}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{card.sub}</span>
              <span className={card.trend === 'up' ? 'stat-change-up' : card.trend === 'down' ? 'stat-change-down' : ''}>
                {card.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Failed Payments from Stripe */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="pulse-dot" style={{ background: '#ef4444' }} />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Failed Payments</span>
            </div>
            <span className="badge-red">{failLoading ? '...' : `${failed.length} Failed`}</span>
          </div>
          <div>
            {failLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Stripe data...</div>
            ) : failed.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>
                ✅ No failed payments — great job!
              </div>
            ) : (
              failed.slice(0, 5).map((payment: any, i: number) => (
                <div key={i} style={{
                  padding: '12px 20px',
                  borderBottom: i < Math.min(failed.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: '#ef4444' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {payment.customerEmail}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {payment.failureMessage}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>${payment.amount}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{payment.currency}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subscription Health */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Subscription Health</span>
            <span className="badge-green">Live</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {ovLoading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <>
                {[
                  { label: 'Active Subscriptions', value: overview?.activeSubscriptions ?? 0, color: '#10b981' },
                  { label: 'Past Due', value: overview?.pastDueSubscriptions ?? 0, color: '#f59e0b' },
                  { label: 'Canceled', value: overview?.canceledSubscriptions ?? 0, color: '#ef4444' },
                ].map((item, i) => {
                  const total = (overview?.activeSubscriptions ?? 0) + (overview?.pastDueSubscriptions ?? 0) + (overview?.canceledSubscriptions ?? 0)
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: item.color }}>{item.value} ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '3px', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monthly Recurring Revenue</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>{fmt(overview?.mrr ?? 0)}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Chart — real Stripe data */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Revenue vs Failed Payments</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Stripe live data — last 6 months
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ color: 'var(--text-muted)' }}>Failed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ color: 'var(--text-muted)' }}>Succeeded</span>
            </div>
          </div>
        </div>
        {ovLoading ? (
          <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Loading chart data...
          </div>
        ) : (() => {
          const chart: { label: string; succeeded: number; failed: number }[] = overview?.monthlyChart || []
          const maxVal = Math.max(...chart.map(m => Math.max(m.succeeded, m.failed)), 1)
          return (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' }}>
              {chart.map((month, i) => {
                const succPct = Math.round((month.succeeded / maxVal) * 100)
                const failPct = Math.round((month.failed / maxVal) * 100)
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '100px' }}>
                      <div title={`Failed: $${month.failed.toFixed(0)}`} style={{ flex: 1, background: 'rgba(239,68,68,0.5)', height: `${Math.max(failPct, 2)}%`, borderRadius: '3px 3px 0 0', transition: 'height 0.5s' }} />
                      <div title={`Succeeded: $${month.succeeded.toFixed(0)}`} style={{ flex: 1, background: 'rgba(16,185,129,0.65)', height: `${Math.max(succPct, 2)}%`, borderRadius: '3px 3px 0 0', transition: 'height 0.5s' }} />
                    </div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{month.label}</span>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
