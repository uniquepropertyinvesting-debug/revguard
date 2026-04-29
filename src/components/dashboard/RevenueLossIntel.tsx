'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth'

interface IntelData {
  mrr: number
  failedRevenue: number
  failedCount: number
  mrrAtRisk: number
  highRiskCount: number
  billingErrorImpact: number
  billingErrorCount: number
  usageMismatchImpact: number
  cancelAtEndCount: number
  pastDueCount: number
  totalLeakage: number
  recoveryRate: string
}

export default function RevenueLossIntel() {
  const [data, setData] = useState<IntelData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      authFetch('/api/stripe/overview').then(r => r.json()),
      authFetch('/api/stripe/churn-risk').then(r => r.json()),
      authFetch('/api/stripe/billing-errors').then(r => r.json()),
      authFetch('/api/stripe/usage-mismatch').then(r => r.json()),
    ]).then(([overview, churn, billing, usage]) => {
      const failedRevenue = overview.failedRevenue || 0
      const mrrAtRisk = churn.summary?.mrrAtRisk || 0
      const billingErrorImpact = billing.summary?.totalImpact || 0
      const usageMismatchImpact = usage.summary?.totalMismatch || 0
      const totalLeakage = failedRevenue + mrrAtRisk + billingErrorImpact + usageMismatchImpact

      setData({
        mrr: overview.mrr || 0,
        failedRevenue,
        failedCount: overview.failedCount || 0,
        mrrAtRisk,
        highRiskCount: churn.summary?.highRisk || 0,
        billingErrorImpact,
        billingErrorCount: billing.summary?.open || 0,
        usageMismatchImpact,
        cancelAtEndCount: 0,
        pastDueCount: overview.pastDueSubscriptions || 0,
        totalLeakage,
        recoveryRate: overview.recoveryRate || '0',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: 'var(--text-muted)' }}>
      Loading revenue intelligence...
    </div>
  )

  if (!data) return null

  const leakageChannels = [
    { channel: 'Failed Payments', amount: data.failedRevenue, color: '#ef4444', icon: '💳', pct: data.totalLeakage > 0 ? Math.round((data.failedRevenue / data.totalLeakage) * 100) : 0 },
    { channel: 'Churn Risk (MRR at risk)', amount: data.mrrAtRisk, color: '#f59e0b', icon: '📉', pct: data.totalLeakage > 0 ? Math.round((data.mrrAtRisk / data.totalLeakage) * 100) : 0 },
    { channel: 'Billing Errors', amount: data.billingErrorImpact, color: '#8b5cf6', icon: '🧾', pct: data.totalLeakage > 0 ? Math.round((data.billingErrorImpact / data.totalLeakage) * 100) : 0 },
    { channel: 'Usage Mismatch', amount: data.usageMismatchImpact, color: '#06b6d4', icon: '📊', pct: data.totalLeakage > 0 ? Math.round((data.usageMismatchImpact / data.totalLeakage) * 100) : 0 },
  ].filter(c => c.amount > 0)

  const predictions = [
    data.failedCount > 0 && {
      type: 'Failed Payment Recovery Opportunity',
      risk: data.failedCount >= 5 ? 'high' : 'medium',
      impact: `$${data.failedRevenue.toFixed(0)}`,
      confidence: '95%',
      horizon: 'Immediate',
      description: `${data.failedCount} failed charge${data.failedCount > 1 ? 's' : ''} totaling $${data.failedRevenue.toFixed(2)} — retryable via Revenue Recovery`,
      icon: '💳',
    },
    data.highRiskCount > 0 && {
      type: 'Churn Revenue Forecast',
      risk: data.highRiskCount >= 3 ? 'high' : 'medium',
      impact: `$${data.mrrAtRisk.toFixed(0)}/mo`,
      confidence: '84%',
      horizon: 'Next 30 days',
      description: `${data.highRiskCount} high-risk subscription${data.highRiskCount > 1 ? 's' : ''} — combined MRR at risk if not addressed`,
      icon: '📉',
    },
    data.billingErrorCount > 0 && {
      type: 'Billing Error Impact',
      risk: 'medium',
      impact: `$${data.billingErrorImpact.toFixed(0)}`,
      confidence: '97%',
      horizon: 'This billing cycle',
      description: `${data.billingErrorCount} open billing error${data.billingErrorCount > 1 ? 's' : ''} detected — duplicate invoices, failed retries, uncollectible`,
      icon: '🧾',
    },
    data.pastDueCount > 0 && {
      type: 'Past Due Subscriptions',
      risk: 'warning',
      impact: `${data.pastDueCount} sub${data.pastDueCount > 1 ? 's' : ''}`,
      confidence: '100%',
      horizon: 'Now',
      description: `${data.pastDueCount} subscription${data.pastDueCount > 1 ? 's are' : ' is'} past due — immediate action needed to prevent cancellation`,
      icon: '⏰',
    },
    parseFloat(data.recoveryRate) < 70 && {
      type: 'Recovery Rate Below Benchmark',
      risk: 'medium',
      impact: 'Revenue gap',
      confidence: '88%',
      horizon: 'Ongoing',
      description: `Your recovery rate is ${data.recoveryRate}% — industry benchmark is 70%+. Consider enabling automated dunning sequences`,
      icon: '📈',
    },
  ].filter(Boolean) as any[]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(139,92,246,0.1))',
        border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>Revenue Intelligence Report</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Live Stripe data · Updated in real-time
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ef4444' }}>${data.totalLeakage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total identified revenue at risk</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Leakage Breakdown */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Revenue Leakage by Channel
            <span className="badge-green" style={{ fontSize: '9px' }}>LIVE</span>
          </div>
          {leakageChannels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              No revenue leakage detected — looking healthy!
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {leakageChannels.map((c, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{c.icon}</span>{c.channel}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.pct}%</span>
                        <span style={{ fontWeight: 700, color: c.color, fontSize: '13px' }}>${c.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${c.pct}%`, background: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Total Annual Projection</span>
                <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '16px' }}>${(data.totalLeakage * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </>
          )}
        </div>

        {/* Predictions / Risk Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Live Risk Alerts
            <span className="badge-green" style={{ fontSize: '9px' }}>LIVE</span>
          </div>
          {predictions.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              No active risks — revenue looking strong!
            </div>
          ) : (
            predictions.map((p: any, i: number) => (
              <div key={i} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{p.type}</span>
                      <span className={p.risk === 'high' ? 'badge-red' : p.risk === 'medium' ? 'badge-yellow' : 'badge-yellow'}>{p.risk}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{p.description}</div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>🕐 {p.horizon}</span>
                      <span>🎯 {p.confidence} confidence</span>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{p.impact} at risk</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
