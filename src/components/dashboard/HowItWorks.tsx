'use client'

const STEPS = [
  {
    step: '01',
    icon: '🔗',
    title: 'Connect Your Stripe Account',
    desc: 'Go to Integrations in the sidebar and enter your Stripe API key. RevGuard will instantly connect to your account and start pulling in your live payment and subscription data.',
    color: '#3b82f6',
  },
  {
    step: '02',
    icon: '⚡',
    title: 'Check Your Command Center',
    desc: 'Your Command Center is the home base. It shows your total MRR, failed payments, churn risk alerts, and revenue recovered — all in real time. Start here every time you log in.',
    color: '#8b5cf6',
  },
  {
    step: '03',
    icon: '💳',
    title: 'Review Failed Payments',
    desc: 'Click "Failed Payments" in the sidebar to see every declined charge. Click "Retry" on any payment to attempt recovery. RevGuard shows you exactly why each payment failed so you know what action to take.',
    color: '#ef4444',
  },
  {
    step: '04',
    icon: '📬',
    title: 'Turn On Automated Dunning',
    desc: 'Go to "Automated Dunning" and set up your email recovery sequence. When a payment fails, RevGuard automatically emails your customer on Day 1, Day 3, and Day 7 to recover the payment — no manual work needed.',
    color: '#f59e0b',
  },
  {
    step: '05',
    icon: '⚠️',
    title: 'Monitor Churn Risk',
    desc: 'Click "Churn Risk" to see which customers are at risk of canceling. Each customer gets a risk score from 0–99. High-risk customers are flagged at the top so you can reach out before they leave.',
    color: '#8b5cf6',
  },
  {
    step: '06',
    icon: '🛡️',
    title: 'Take Action on At-Risk Customers',
    desc: 'Go to "Churn Intervention" to see your action playbook. RevGuard tells you exactly which customers to contact, what to say, and which accounts to prioritize based on their MRR value.',
    color: '#06b6d4',
  },
  {
    step: '07',
    icon: '🧾',
    title: 'Fix Billing Errors',
    desc: 'Click "Billing Errors" to find duplicate charges, uncollected invoices, and billing mistakes. Each error shows the exact dollar amount affected so you know what to fix first.',
    color: '#10b981',
  },
  {
    step: '08',
    icon: '📧',
    title: 'Set Up Your Alerts',
    desc: 'Go to "Alert Settings" and enter your email address. RevGuard will send you instant notifications whenever a payment fails, a customer churns, or a billing error is detected.',
    color: '#3b82f6',
  },
  {
    step: '09',
    icon: '📈',
    title: 'Track Your ROI',
    desc: 'Click "ROI Engine" to see exactly how much revenue RevGuard is recovering for you each month. Your actual Stripe data is used to calculate your monthly recovery and annual impact.',
    color: '#10b981',
  },
]

export default function HowItWorks() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '14px', padding: '28px 32px',
      }}>
        <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>
          How to Use RevGuard
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '600px' }}>
          Follow these steps to get the most out of your RevGuard platform. Each section in the sidebar is a tool that works together to protect and recover your revenue.
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {STEPS.map((s) => (
          <div key={s.step} className="card" style={{ padding: '20px 24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* Step number */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
              background: `${s.color}18`, border: `1px solid ${s.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 800, color: s.color, letterSpacing: '0.05em',
            }}>
              {s.step}
            </div>
            {/* Icon */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
              background: `${s.color}18`, border: `1px solid ${s.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            }}>
              {s.icon}
            </div>
            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {s.title}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                {s.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer tip */}
      <div style={{
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <span style={{ fontSize: '20px' }}>💡</span>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Tip:</strong> Start with Steps 1–4 on your first day. Once Stripe is connected and dunning is active, RevGuard works automatically in the background recovering revenue for you 24/7.
        </div>
      </div>

    </div>
  )
}
