'use client'

import { useState, useEffect } from 'react'
import { useStripeROI } from '@/lib/useStripe'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function ROIEngine() {
  const { data, loading, error } = useStripeROI()

  const [mrr, setMrr] = useState('0')
  const [churnRate, setChurnRate] = useState('0')
  const [failedPayments, setFailedPayments] = useState('0')
  const [billingErrors, setBillingErrors] = useState('0')
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (data && !seeded) {
      setMrr(String(data.mrr || 0))
      setChurnRate(String(data.churnRate || 0))
      setFailedPayments(String(data.failedPaymentRate || 0))
      setBillingErrors(String(data.billingErrorRate || 0))
      setSeeded(true)
    }
  }, [data, seeded])

  const mrrNum = parseFloat(mrr) || 0
  const churnLoss = mrrNum * (parseFloat(churnRate) / 100)
  const paymentLoss = mrrNum * (parseFloat(failedPayments) / 100)
  const billingLoss = mrrNum * (parseFloat(billingErrors) / 100)
  const totalLoss = churnLoss + paymentLoss + billingLoss
  const recoveryRate = data?.recoveryRate || 68
  const projectedRecovery = totalLoss * (recoveryRate / 100)
  const annualImpact = projectedRecovery * 12
  const platformCost = 449 // Growth plan — $449/mo
  const roi = projectedRecovery > 0 ? ((projectedRecovery - platformCost) / platformCost * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '10px', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>&#9888;</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', marginBottom: '2px' }}>Unable to load ROI data</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{error} -- You can still use the calculator manually below.</div>
          </div>
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Active Subscriptions', value: String(data.activeSubscriptions), color: '#10b981', icon: '✅' },
            { label: 'Failed Charges (30d)', value: String(data.failedChargesCount), color: '#ef4444', icon: '❌' },
            { label: 'Canceled This Month', value: String(data.canceledThisMonth), color: '#f59e0b', icon: '📉' },
            { label: 'Total Recovered', value: fmt(data.totalRecovered), color: '#3b82f6', icon: '💰' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
                <span style={{ fontSize: '18px' }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.1))',
        border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>Your RevGuard ROI</span>
          {loading ? <span className="badge-yellow">Loading Stripe data...</span> : <span className="badge-green">Live Stripe Data</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Monthly Revenue Recovered</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#10b981' }}>{fmt(projectedRecovery)}</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Annual Revenue Protected</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#3b82f6' }}>{fmt(annualImpact)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Platform ROI</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#8b5cf6' }}>{roi > 0 ? `${roi.toFixed(0)}x` : '—'}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>ROI Calculator</div>
            {data && (
              <button className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => { setMrr(String(data.mrr||0)); setChurnRate(String(data.churnRate||0)); setFailedPayments(String(data.failedPaymentRate||0)); setBillingErrors(String(data.billingErrorRate||0)) }}>
                ↺ Reset to Stripe Data
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Monthly Recurring Revenue (MRR)', value: mrr, set: setMrr, prefix: '$', hint: data ? `Stripe: ${fmt(data.mrr)}` : '' },
              { label: 'Monthly Churn Rate (%)', value: churnRate, set: setChurnRate, suffix: '%', hint: data ? `Stripe: ${data.churnRate}%` : '' },
              { label: 'Failed Payment Rate (%)', value: failedPayments, set: setFailedPayments, suffix: '%', hint: data ? `Stripe: ${data.failedPaymentRate}%` : '' },
              { label: 'Billing Error Rate (%)', value: billingErrors, set: setBillingErrors, suffix: '%', hint: data ? `Stripe: ${data.billingErrorRate}%` : '' },
            ].map((field, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{field.label}</label>
                  {field.hint && <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>{field.hint}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {field.prefix && <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{field.prefix}</span>}
                  <input type="number" value={field.value} onChange={e => field.set(e.target.value)} style={{ width: '100%' }} />
                  {field.suffix && <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{field.suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '20px' }}>Revenue Loss Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Churn Revenue Loss', amount: churnLoss, color: '#ef4444', pct: totalLoss > 0 ? churnLoss/totalLoss*100 : 0, icon: '📉', stripe: data ? fmt(data.churnedMRR) : null },
              { label: 'Failed Payment Loss', amount: paymentLoss, color: '#f59e0b', pct: totalLoss > 0 ? paymentLoss/totalLoss*100 : 0, icon: '💳', stripe: data ? fmt(data.failedRevenue) : null },
              { label: 'Billing Error Loss', amount: billingLoss, color: '#8b5cf6', pct: totalLoss > 0 ? billingLoss/totalLoss*100 : 0, icon: '🧾', stripe: data ? fmt(data.billingErrorRevenue) : null },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{item.icon}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: item.color }}>{fmt(item.amount)}</span>
                    {item.stripe && <div style={{ fontSize: '10px', color: '#10b981' }}>Stripe: {item.stripe}</div>}
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${isNaN(item.pct) ? 0 : item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Monthly Loss</span>
              <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '18px' }}>{fmt(totalLoss)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#10b981' }}>RevGuard Recovers</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{recoveryRate.toFixed(0)}% recovery rate</div>
              </div>
              <span style={{ fontWeight: 800, color: '#10b981', fontSize: '18px', alignSelf: 'center' }}>{fmt(projectedRecovery)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <span style={{ fontSize: '24px' }}>📊</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>ROI Engine — Powered by Live Stripe Data</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Calculator pre-filled from your actual MRR, churn rate, failed payments, and billing errors · Adjust to model scenarios
          </div>
        </div>
        <span className="badge-green" style={{ marginLeft: 'auto' }}>Live</span>
      </div>
    </div>
  )
}
