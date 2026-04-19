'use client'

import { useState } from 'react'

const SHIELDS = [
  {
    id: 1,
    icon: '💳',
    name: 'Failed Payment Recovery',
    color: '#ef4444',
    colorBg: 'rgba(239,68,68,0.1)',
    colorBorder: 'rgba(239,68,68,0.2)',
    tagline: 'Turn declined cards into recovered revenue',
    description: 'Automatically detects every failed charge the moment it happens. Triggers smart retry logic with intelligent timing — not random retries that burn customer goodwill. Shows you exactly why each payment failed (card expired, insufficient funds, bank block) so you can take targeted action.',
    metric: 'Avg 63% recovery rate on retried payments',
    tiers: ['starter', 'growth', 'scale'],
  },
  {
    id: 2,
    icon: '📬',
    name: 'Automated Dunning',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.1)',
    colorBorder: 'rgba(245,158,11,0.2)',
    tagline: '3-step email sequences that recover revenue on autopilot',
    description: 'When a payment fails, RevGuard automatically enrolls the customer in a professionally designed 3-step dunning sequence: Day 1 notification, Day 3 reminder, Day 7 final notice. Emails are sent from your domain via Resend with urgency escalation built in. Zero manual work required.',
    metric: 'Up to 47% of failed invoices recovered before Day 7',
    tiers: ['starter', 'growth', 'scale'],
  },
  {
    id: 3,
    icon: '⚠️',
    name: 'Churn Intelligence',
    color: '#8b5cf6',
    colorBg: 'rgba(139,92,246,0.1)',
    colorBorder: 'rgba(139,92,246,0.2)',
    tagline: 'Know who\'s leaving before they cancel',
    description: 'Scores every active subscription with a real-time churn risk score (0–99) based on payment history, subscription age, cancellation signals, and usage patterns. High-risk accounts surface immediately so you can intervene before the subscription cancels — not after.',
    metric: 'Identify at-risk MRR up to 30 days before cancellation',
    tiers: ['starter', 'growth', 'scale'],
  },
  {
    id: 4,
    icon: '🛡️',
    name: 'Churn Intervention',
    color: '#06b6d4',
    colorBg: 'rgba(6,182,212,0.1)',
    colorBorder: 'rgba(6,182,212,0.2)',
    tagline: 'Act on churn risk before revenue walks out the door',
    description: 'Once churn risk is detected, Churn Intervention gives you the playbook: which customers to contact, what to say, and which accounts to prioritize by MRR impact. Cancel-at-period-end subscribers are flagged immediately with a direct intervention path.',
    metric: 'Retain 20–35% of at-risk accounts with proactive outreach',
    tiers: ['growth', 'scale'],
  },
  {
    id: 5,
    icon: '🧾',
    name: 'Billing Error Detection',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.1)',
    colorBorder: 'rgba(16,185,129,0.2)',
    tagline: 'Catch billing mistakes before they become refunds or writeoffs',
    description: 'Scans every invoice for duplicate charges, uncollectible writeoffs, voided invoices, and multi-attempt failures. Surfaces the exact revenue impact in dollars so you know what\'s worth chasing. Catches errors that slip through Stripe\'s dashboard because you\'re not checking at scale.',
    metric: 'Average $800–$4,000 in billing error impact recovered per account',
    tiers: ['growth', 'scale'],
  },
  {
    id: 6,
    icon: '📊',
    name: 'Usage Mismatch & Revenue Leakage',
    color: '#3b82f6',
    colorBg: 'rgba(59,130,246,0.1)',
    colorBorder: 'rgba(59,130,246,0.2)',
    tagline: 'Find the revenue you\'re leaving on the table every month',
    description: 'Compares what customers are contracted to pay against what they\'re actually being billed. Catches undercharges on metered plans, seat count discrepancies, and billing gaps that silently drain revenue. Every mismatch is quantified with an exact dollar impact.',
    metric: 'Most accounts find 2–8% of MRR in undetected leakage',
    tiers: ['scale'],
  },
]

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 199,
    mrr: '$75K MRR',
    mrrLimit: 'Up to $75K MRR',
    color: '#3b82f6',
    colorBg: 'rgba(59,130,246,0.08)',
    colorBorder: 'rgba(59,130,246,0.2)',
    highlight: false,
    badge: null,
    shields: 3,
    shieldNames: ['Failed Payment Recovery', 'Automated Dunning', 'Churn Intelligence'],
    features: [
      'Failed Payment Recovery',
      'Automated Dunning (3-step)',
      'Churn Risk Scoring',
      'Real-time Stripe dashboard',
      'Email alerts',
      '5,000 customers',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 449,
    mrr: '$300K MRR',
    mrrLimit: 'Up to $300K MRR',
    color: '#8b5cf6',
    colorBg: 'rgba(139,92,246,0.08)',
    colorBorder: 'rgba(139,92,246,0.3)',
    highlight: true,
    badge: 'MOST POPULAR',
    shields: 5,
    shieldNames: ['All Starter shields', 'Churn Intervention', 'Billing Error Detection'],
    features: [
      'Everything in Starter',
      'Churn Intervention playbooks',
      'Billing Error Detection',
      'Revenue Loss Intelligence',
      'ROI Engine & analytics',
      'Unlimited customers',
      'Priority email support',
      'Slack alerts',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 999,
    mrr: '$1M MRR',
    mrrLimit: 'Up to $1M MRR',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.08)',
    colorBorder: 'rgba(16,185,129,0.2)',
    highlight: false,
    badge: null,
    shields: 6,
    shieldNames: ['All 6 Revenue Shields'],
    features: [
      'Everything in Growth',
      'Usage Mismatch Detection',
      'Revenue Leakage Analysis',
      'AI Revenue Assistant',
      'Custom dunning templates',
      'Multi-team access',
      'Dedicated Slack channel',
      'SLA guarantee',
    ],
  },
]

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0 })
}

export default function Pricing() {
  const [activeShield, setActiveShield] = useState<number | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  const annualDiscount = 0.17 // 2 months free

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '16px', padding: '32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.1em', marginBottom: '10px' }}>
          REVGUARD PRICING
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '10px' }}>
          6 Revenue Shields. One Platform.
        </div>
        <div style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 20px', lineHeight: 1.7 }}>
          Every plan recovers more revenue than it costs. If RevGuard doesn't pay for itself in 30 days, we'll refund you.
        </div>

        {/* Billing toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--bg-primary)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
          {(['monthly', 'annual'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                padding: '7px 20px', borderRadius: '7px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: billing === b ? (b === 'annual' ? '#8b5cf6' : 'var(--bg-card)') : 'transparent',
                color: billing === b ? (b === 'annual' ? 'white' : 'var(--text-primary)') : 'var(--text-muted)',
              }}
            >
              {b === 'monthly' ? 'Monthly' : 'Annual — Save 17%'}
            </button>
          ))}
        </div>
      </div>

      {/* Tier Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {TIERS.map(tier => {
          const price = billing === 'annual' ? Math.round(tier.price * (1 - annualDiscount)) : tier.price
          return (
            <div
              key={tier.id}
              style={{
                borderRadius: '16px', overflow: 'hidden',
                border: `2px solid ${tier.highlight ? tier.colorBorder : 'var(--border)'}`,
                background: tier.highlight ? tier.colorBg : 'var(--bg-card)',
                position: 'relative',
                transform: tier.highlight ? 'scale(1.02)' : 'none',
              }}
            >
              {tier.badge && (
                <div style={{
                  background: tier.color, color: 'white',
                  fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em',
                  padding: '5px 0', textAlign: 'center',
                }}>
                  {tier.badge}
                </div>
              )}

              <div style={{ padding: '24px' }}>
                {/* Tier name + price */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {tier.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    {tier.mrrLimit}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '42px', fontWeight: 900, color: tier.color, lineHeight: 1 }}>
                      {fmt(price)}
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>/mo</span>
                  </div>
                  {billing === 'annual' && (
                    <div style={{ fontSize: '11px', color: tier.color, marginTop: '4px', fontWeight: 600 }}>
                      {fmt(tier.price - price)}/mo savings · {fmt((tier.price - price) * 12)}/yr
                    </div>
                  )}
                </div>

                {/* Shield count badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: `${tier.color}15`, border: `1px solid ${tier.color}30`,
                  borderRadius: '8px', padding: '6px 12px', marginBottom: '20px',
                }}>
                  <span style={{ fontSize: '14px' }}>🛡️</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: tier.color }}>
                    {tier.shields} Revenue Shield{tier.shields !== 1 ? 's' : ''} Active
                  </span>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {tier.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: tier.color, fontSize: '13px', marginTop: '1px', flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  className={tier.highlight ? 'btn-primary' : 'btn-secondary'}
                  style={{
                    width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700,
                    background: tier.highlight ? tier.color : undefined,
                    borderColor: tier.highlight ? tier.color : undefined,
                  }}
                >
                  Get Started — {tier.name}
                </button>

                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                  30-day money-back guarantee
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 6 Revenue Shields breakdown */}
      <div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            The 6 Revenue Shields — Explained
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Click any shield to see exactly what it does and the revenue it protects
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {SHIELDS.map(shield => (
            <div key={shield.id}>
              <button
                onClick={() => setActiveShield(activeShield === shield.id ? null : shield.id)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: activeShield === shield.id ? shield.colorBg : 'var(--bg-card)',
                  border: `1px solid ${activeShield === shield.id ? shield.colorBorder : 'var(--border)'}`,
                  borderRadius: activeShield === shield.id ? '12px 12px 0 0' : '12px',
                  padding: '16px', transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                    background: shield.colorBg, border: `1px solid ${shield.colorBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                  }}>
                    {shield.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        background: shield.color, color: 'white',
                        borderRadius: '50%', width: '16px', height: '16px',
                        fontSize: '9px', fontWeight: 800, flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>{shield.id}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{shield.name}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{activeShield === shield.id ? '▲' : '▼'}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '42px' }}>
                  {shield.tagline}
                </div>
              </button>

              {activeShield === shield.id && (
                <div style={{
                  background: shield.colorBg,
                  border: `1px solid ${shield.colorBorder}`, borderTop: 'none',
                  borderRadius: '0 0 12px 12px', padding: '16px 20px',
                }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '12px' }}>
                    {shield.description}
                  </p>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: `${shield.color}15`, borderRadius: '8px', padding: '10px 14px',
                  }}>
                    <span style={{ fontSize: '14px' }}>📊</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: shield.color }}>{shield.metric}</span>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Available on:{' '}
                    {shield.tiers.map(t => (
                      <span key={t} style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: '4px', padding: '2px 6px', marginLeft: '4px',
                        fontWeight: 600, textTransform: 'capitalize',
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ROI proof bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
      }}>
        {[
          { label: 'Avg ROI in first 30 days', value: '8.4x', color: '#10b981' },
          { label: 'Failed payments recovered', value: '63%', color: '#3b82f6' },
          { label: 'Dunning recovery rate', value: '47%', color: '#f59e0b' },
          { label: 'Money-back guarantee', value: '30 days', color: '#8b5cf6' },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', fontWeight: 900, color: stat.color, marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Enterprise CTA */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.08))',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '12px', padding: '24px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Enterprise — $1M+ MRR
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Custom pricing · All 6 shields · Dedicated support · SLA · Custom integrations · On-premise options
          </div>
        </div>
        <button className="btn-primary" style={{ padding: '12px 28px', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap' }}>
          Contact Sales
        </button>
      </div>

    </div>
  )
}
