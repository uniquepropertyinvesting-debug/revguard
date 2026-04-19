'use client'

import { useState } from 'react'

const shields = [
  {
    number: '01',
    icon: '💳',
    name: 'Failed Payment Recovery',
    tagline: 'Recover revenue that Stripe gives up on',
    desc: 'AI-powered smart retry logic recovers 68% of failed payments automatically with perfect timing and personalized outreach.',
    impact: 'Avg $1,200/mo recovered',
    impactColor: '#10b981',
    competitors: ['Stripe (basic retry only)', 'Chargebee (manual)'],
    onlyRevGuard: true,
  },
  {
    number: '02',
    icon: '⚠️',
    name: 'Churn Prediction & Intervention',
    tagline: 'Stop cancellations before they happen',
    desc: 'ML-scored churn risk with automated playbooks. Catch at-risk accounts 30 days before they cancel — and auto-intervene.',
    impact: 'Avg $8,400 ARR saved',
    impactColor: '#f59e0b',
    competitors: ['Churnkey (payment only)', 'Baremetrics (reporting only)'],
    onlyRevGuard: true,
  },
  {
    number: '03',
    icon: '🧾',
    name: 'Billing Error Detection',
    tagline: 'Catch errors before they cause refunds',
    desc: 'Auto-scans every invoice for overcharges, duplicates, tax errors, and plan mismatches across your entire customer base.',
    impact: 'Avg $3,200 in errors caught',
    impactColor: '#ef4444',
    competitors: ['No dedicated tool exists', 'Manual audits only'],
    onlyRevGuard: true,
  },
  {
    number: '04',
    icon: '📊',
    name: 'Usage Mismatch Alerts',
    tagline: 'Never leave upsell money on the table',
    desc: 'Identify accounts consuming beyond their plan tier — instantly surface upgrade conversations and prevent silent overages.',
    impact: 'Avg $2,800 in new MRR',
    impactColor: '#3b82f6',
    competitors: ['ProfitWell (metrics only)', 'Metronome (billing only)'],
    onlyRevGuard: true,
  },
  {
    number: '05',
    icon: '🤖',
    name: 'AI Revenue Intelligence',
    tagline: 'Your 24/7 revenue analyst',
    desc: 'Ask any revenue question and get instant, data-driven answers backed by your real Stripe data. Priority recommendations always ready.',
    impact: '10+ hours/week saved',
    impactColor: '#8b5cf6',
    competitors: ['No competitor offers this', 'Manual analysis required'],
    onlyRevGuard: true,
  },
  {
    number: '06',
    icon: '🔔',
    name: 'Real-Time Alert Engine',
    tagline: 'Zero-lag revenue monitoring',
    desc: 'Instant email + webhook alerts for every failed payment, churn signal, billing error, and usage spike — before you lose the revenue.',
    impact: 'Sub-60 second response',
    impactColor: '#06b6d4',
    competitors: ['Generic monitoring tools', 'No revenue context'],
    onlyRevGuard: true,
  },
]

const competitorTable = [
  { feature: 'Failed Payment Recovery', revguard: true, churnkey: true, baremetrics: false, profitwell: false, recover: true },
  { feature: 'Churn Prediction & Playbooks', revguard: true, churnkey: false, baremetrics: false, profitwell: false, recover: false },
  { feature: 'Billing Error Detection', revguard: true, churnkey: false, baremetrics: false, profitwell: false, recover: false },
  { feature: 'Usage Mismatch Alerts', revguard: true, churnkey: false, baremetrics: true, profitwell: true, recover: false },
  { feature: 'AI Revenue Assistant', revguard: true, churnkey: false, baremetrics: false, profitwell: false, recover: false },
  { feature: 'Real-Time Alert Engine', revguard: true, churnkey: true, baremetrics: false, profitwell: false, recover: false },
  { feature: 'All 6 shields in one platform', revguard: true, churnkey: false, baremetrics: false, profitwell: false, recover: false },
]

const features = [
  { icon: '💳', title: 'Failed Payment Recovery', desc: 'AI-powered smart retry recovers 68% of failed payments automatically. Never lose a payment to a declined card again.' },
  { icon: '⚠️', title: 'Churn Prediction', desc: 'Detect at-risk customers 30 days before they leave and auto-intervene with personalized win-back campaigns.' },
  { icon: '🧾', title: 'Billing Error Detection', desc: 'Catch overcharges, duplicates and tax errors across all your billing tools before they damage customer trust.' },
  { icon: '📊', title: 'Usage Mismatch Alerts', desc: 'Identify accounts using beyond their plan — capture revenue leakage and upsell opportunities instantly.' },
  { icon: '🤖', title: 'AI Revenue Assistant', desc: 'Ask any revenue question and get instant, data-driven answers backed by your real Stripe data.' },
  { icon: '🔗', title: 'One-Click Integrations', desc: 'Stripe, PayPal, QuickBooks, Salesforce, HubSpot and Snowflake connected in seconds.' },
]

const stats = [
  { value: '$2.4M+', label: 'Revenue Recovered' },
  { value: '68%', label: 'Avg Recovery Rate' },
  { value: '847', label: 'SaaS Companies Protected' },
  { value: '4.2min', label: 'Avg Response Time' },
]

const testimonials = [
  { quote: "RevGuard recovered $48,000 in failed payments in our first month. It paid for itself 96x over.", name: 'Sarah Chen', role: 'CFO, Nexus Corp', avatar: 'SC' },
  { quote: "The churn prediction caught 12 at-risk accounts we had no idea about. Saved over $180K ARR.", name: 'Marcus Johnson', role: 'VP Revenue, TechFlow', avatar: 'MJ' },
  { quote: "We had $34K in billing errors we never knew about. RevGuard found them in 24 hours.", name: 'Priya Patel', role: 'Head of Finance, DataSync', avatar: 'PP' },
]

const plans = [
  {
    name: 'Starter',
    price: '$199',
    period: '/mo',
    recoveryFee: null,
    desc: 'Perfect for early-stage SaaS',
    color: '#3b82f6',
    features: [
      'Up to $75K MRR monitored',
      'Failed payment recovery',
      'Automated dunning (3-step)',
      'Churn risk scoring',
      'Stripe integration',
      'Email support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Growth',
    price: '$449',
    period: '/mo',
    recoveryFee: '+ 2% of recovered revenue',
    desc: 'For growing SaaS companies',
    color: '#8b5cf6',
    features: [
      'Up to $300K MRR monitored',
      'Everything in Starter',
      'Churn intervention playbooks',
      'Billing error detection',
      'Usage mismatch alerts',
      'ROI Engine & analytics',
      'Priority email + chat support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Scale',
    price: '$999',
    period: '/mo',
    recoveryFee: '+ 3% of recovered revenue',
    desc: 'For high-volume revenue teams',
    color: '#10b981',
    features: [
      'Unlimited MRR monitored',
      'Everything in Pro',
      'Custom AI workflows',
      'Multi-workspace support',
      'Dedicated success manager',
      'SLA guarantee (99.9% uptime)',
      'SSO & advanced security',
      'Unlimited events',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

const howItWorks = [
  { step: '01', title: 'Connect Stripe', desc: 'Paste your Stripe API key. RevGuard instantly syncs your customers, subscriptions, and payment history.', icon: '🔌' },
  { step: '02', title: 'Get Instant Alerts', desc: 'Within seconds, see all failed payments, at-risk customers, billing errors, and revenue leakage.', icon: '🔔' },
  { step: '03', title: 'Recover Revenue', desc: 'One click to retry failed payments, trigger churn interventions, or fix billing errors automatically.', icon: '💰' },
]

// ROI calculator defaults
const ROI_DEFAULTS = { mrr: 50000 }
const ROI_FACTORS = {
  paymentRecovery: 0.024,    // 2.4% of MRR recovered from failed payments
  churnPrevention: 0.056,    // 5.6% of MRR ARR saved from churn (monthly equiv)
  billingErrors: 0.018,      // 1.8% of MRR in billing error refunds avoided
  usageMismatch: 0.022,      // 2.2% of MRR in upsell unlocked
  timeSaved: 8,              // hours/week × $150/hr
}

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [billingAnnual, setBillingAnnual] = useState(false)
  const [roiMrr, setRoiMrr] = useState(ROI_DEFAULTS.mrr)

  const handleLogin = async () => {
    setLoading(true)
    try {
      // @ts-ignore
      await window.Nxcode?.auth?.login()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // ROI calculations
  const paymentRecovery = Math.round(roiMrr * ROI_FACTORS.paymentRecovery)
  const churnPrevention = Math.round(roiMrr * ROI_FACTORS.churnPrevention)
  const billingErrors = Math.round(roiMrr * ROI_FACTORS.billingErrors)
  const usageMismatch = Math.round(roiMrr * ROI_FACTORS.usageMismatch)
  const timeSavedValue = Math.round(ROI_FACTORS.timeSaved * 150 * 4.3) // weekly hours × $/hr × weeks/mo
  const totalMonthly = paymentRecovery + churnPrevention + billingErrors + usageMismatch + timeSavedValue
  const totalAnnual = totalMonthly * 12
  const platformCost = 299
  const roiMultiple = Math.round(totalMonthly / platformCost)

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 48px', borderBottom: '1px solid var(--border)',
        background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
          }}>🛡️</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>RevGuard</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>6 REVENUE SHIELDS</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {['Shields', 'ROI Calculator', 'Pricing'].map(link => (
            <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`}
              style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none' }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text-primary)'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-secondary)'}
            >{link}</a>
          ))}
          <button className="btn-secondary" onClick={handleLogin} disabled={loading} style={{ padding: '8px 16px', fontSize: '13px' }}>
            Sign In
          </button>
          <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{ padding: '8px 20px' }}>
            {loading ? 'Signing in...' : 'Get Started Free'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 24px 60px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', marginBottom: '28px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>Trusted by 847 SaaS companies worldwide</span>
        </div>

        <h1 style={{ fontSize: '56px', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em' }}>
          6 Revenue Shields.<br />
          <span className="gradient-text">Zero Revenue Lost.</span>
        </h1>

        <p style={{ fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '680px', margin: '0 auto 16px' }}>
          While competitors fix one revenue problem, RevGuard deploys all 6 shields simultaneously — recovering failed payments, stopping churn, catching billing errors, finding upsells, and more.
        </p>
        <p style={{ fontSize: '16px', color: '#10b981', fontWeight: 600, marginBottom: '40px' }}>
          Average client recovers <strong>$17,400/mo</strong> in previously lost revenue.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            className="btn-primary"
            onClick={handleLogin}
            disabled={loading}
            style={{ fontSize: '16px', padding: '14px 36px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            {loading ? <>⏳ Signing you in...</> : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </>
            )}
          </button>
          <button
            className="btn-secondary"
            onClick={handleLogin}
            disabled={loading}
            style={{ fontSize: '16px', padding: '14px 36px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            Continue with GitHub
          </button>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          No credit card required · Setup in under 2 minutes · Free 14-day trial
        </div>
      </section>

      {/* Stats Bar */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)', padding: '20px 0', marginBottom: '80px'
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            textAlign: 'center', padding: '0 48px',
            borderRight: i < stats.length - 1 ? '1px solid var(--border)' : 'none'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 900 }} className="gradient-text">{s.value}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 6 Revenue Shields Section */}
      <section id="shields" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px' }}>🛡️</span>
            <span style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 700, letterSpacing: '0.08em' }}>THE 6 REVENUE SHIELDS</span>
          </div>
          <h2 style={{ fontSize: '40px', fontWeight: 900, marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Competitors solve 1 problem.<br />
            <span className="gradient-text">RevGuard solves all 6.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '17px', maxWidth: '640px', margin: '0 auto' }}>
            Every revenue leakage point in your SaaS business is covered — simultaneously, automatically, and intelligently.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '60px' }}>
          {shields.map((shield, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.2s'
            }}>
              {/* Shield number watermark */}
              <div style={{
                position: 'absolute', right: '-8px', top: '-8px',
                fontSize: '72px', fontWeight: 900, color: 'rgba(255,255,255,0.03)',
                lineHeight: 1, userSelect: 'none'
              }}>{shield.number}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '12px',
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0
                }}>{shield.icon}</div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em' }}>SHIELD {shield.number}</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>{shield.name}</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 600, marginBottom: '8px', fontStyle: 'italic' }}>"{shield.tagline}"</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '16px' }}>{shield.desc}</div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '8px',
                background: `${shield.impactColor}15`,
                border: `1px solid ${shield.impactColor}30`,
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '14px' }}>💰</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: shield.impactColor }}>{shield.impact}</span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>COMPETITORS ONLY OFFER:</div>
              {shield.competitors.map((c, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ color: '#ef4444', fontSize: '12px' }}>✗</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{c}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '12px' }}>✓</span>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>RevGuard: Full {shield.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Competitor comparison table */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Why buy 5 tools when RevGuard does it all?</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Companies using point solutions spend $1,200+/mo and still miss critical revenue leakages.</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)' }}>
                  <th style={{ padding: '14px 28px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Feature / Shield</th>
                  {[
                    { name: 'RevGuard', highlight: true, price: '$199/mo' },
                    { name: 'Churnkey', highlight: false, price: '$400/mo' },
                    { name: 'Baremetrics', highlight: false, price: '$129/mo' },
                    { name: 'ProfitWell', highlight: false, price: '$200/mo' },
                    { name: 'Recover', highlight: false, price: '$300/mo' },
                  ].map((col, i) => (
                    <th key={i} style={{
                      padding: '14px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)',
                      background: col.highlight ? 'rgba(139,92,246,0.1)' : undefined,
                      borderLeft: col.highlight ? '1px solid rgba(139,92,246,0.3)' : undefined,
                      borderRight: col.highlight ? '1px solid rgba(139,92,246,0.3)' : undefined,
                    }}>
                      <div style={{ fontWeight: 800, color: col.highlight ? '#8b5cf6' : 'var(--text-primary)', fontSize: '14px' }}>{col.name}</div>
                      <div style={{ fontSize: '11px', color: col.highlight ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>{col.price}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {competitorTable.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 28px', color: 'var(--text-secondary)', fontWeight: 500 }}>{row.feature}</td>
                    {[row.revguard, row.churnkey, row.baremetrics, row.profitwell, row.recover].map((has, j) => (
                      <td key={j} style={{
                        padding: '12px 20px', textAlign: 'center',
                        background: j === 0 ? 'rgba(139,92,246,0.05)' : undefined,
                        borderLeft: j === 0 ? '1px solid rgba(139,92,246,0.2)' : undefined,
                        borderRight: j === 0 ? '1px solid rgba(139,92,246,0.2)' : undefined,
                      }}>
                        {has
                          ? <span style={{ color: '#10b981', fontSize: '16px', fontWeight: 700 }}>✓</span>
                          : <span style={{ color: '#ef4444', fontSize: '16px' }}>✗</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ background: 'var(--bg-card)' }}>
                  <td style={{ padding: '14px 28px', fontWeight: 800, color: 'var(--text-primary)' }}>Shields Covered</td>
                  {[
                    { count: '6 / 6', color: '#10b981', highlight: true },
                    { count: '2 / 6', color: '#ef4444', highlight: false },
                    { count: '2 / 6', color: '#ef4444', highlight: false },
                    { count: '2 / 6', color: '#ef4444', highlight: false },
                    { count: '2 / 6', color: '#ef4444', highlight: false },
                  ].map((col, i) => (
                    <td key={i} style={{
                      padding: '14px 20px', textAlign: 'center',
                      background: col.highlight ? 'rgba(139,92,246,0.1)' : undefined,
                      borderLeft: col.highlight ? '1px solid rgba(139,92,246,0.3)' : undefined,
                      borderRight: col.highlight ? '1px solid rgba(139,92,246,0.3)' : undefined,
                    }}>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: col.color }}>{col.count}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section id="roi-calculator" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '80px 24px', marginBottom: '80px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, letterSpacing: '0.08em' }}>LIVE ROI CALCULATOR</span>
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px' }}>See exactly what RevGuard recovers for you</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Drag the slider to your MRR — see the combined impact of all 6 shields.</p>
          </div>

          <div className="card" style={{ padding: '36px' }}>
            {/* MRR Slider */}
            <div style={{ marginBottom: '36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Your Monthly Recurring Revenue (MRR)</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#8b5cf6' }}>${roiMrr.toLocaleString()}/mo</div>
              </div>
              <input
                type="range"
                min={5000}
                max={500000}
                step={5000}
                value={roiMrr}
                onChange={e => setRoiMrr(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer', height: '6px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                <span>$5K</span><span>$100K</span><span>$200K</span><span>$300K</span><span>$400K</span><span>$500K</span>
              </div>
            </div>

            {/* Per-shield breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {[
                { shield: 'Shield 1 — Failed Payment Recovery', icon: '💳', value: paymentRecovery, color: '#10b981', pct: '2.4% of MRR recovered' },
                { shield: 'Shield 2 — Churn Prevention', icon: '⚠️', value: churnPrevention, color: '#f59e0b', pct: '5.6% of MRR retained' },
                { shield: 'Shield 3 — Billing Error Avoidance', icon: '🧾', value: billingErrors, color: '#ef4444', pct: '1.8% of MRR in errors caught' },
                { shield: 'Shield 4 — Usage Mismatch Upsell', icon: '📊', value: usageMismatch, color: '#3b82f6', pct: '2.2% of MRR in new upgrades' },
                { shield: 'Shield 5+6 — AI + Alerts (time saved)', icon: '🤖', value: timeSavedValue, color: '#8b5cf6', pct: '8 hrs/week × $150/hr' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px', flexShrink: 0, width: '24px' }}>{row.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.shield}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: row.color }}>${row.value.toLocaleString()}/mo</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '2px', background: row.color,
                        width: `${Math.min(100, (row.value / totalMonthly) * 100)}%`,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{row.pct}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total summary */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
              padding: '24px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.05))',
              border: '1px solid rgba(139,92,246,0.3)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '6px' }}>MONTHLY IMPACT</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981' }}>${totalMonthly.toLocaleString()}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>recovered/protected per month</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(139,92,246,0.2)', borderRight: '1px solid rgba(139,92,246,0.2)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '6px' }}>ANNUAL IMPACT</div>
                <div style={{ fontSize: '32px', fontWeight: 900 }} className="gradient-text">${totalAnnual.toLocaleString()}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>protected per year</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '6px' }}>PLATFORM ROI</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#8b5cf6' }}>{roiMultiple}x</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>return on $299/mo plan</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                className="btn-primary"
                onClick={handleLogin}
                disabled={loading}
                style={{ fontSize: '15px', padding: '14px 40px', borderRadius: '10px' }}
              >
                {loading ? '...' : `Start Recovering $${totalMonthly.toLocaleString()}/mo — Free Trial`}
              </button>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
                No credit card · Setup in 2 minutes · See real results today
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px', textAlign: 'center' }}>
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px' }}>Your entire revenue health at a glance</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Real-time alerts, AI insights, and one-click recovery tools — all connected to your Stripe account.</p>
        </div>
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px',
          padding: '24px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['#ef4444', '#f59e0b', '#10b981'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'left' }}>
              app.revguard.io/dashboard
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'MRR', value: '$1,596', change: '+12%', color: '#10b981' },
              { label: 'Failed Payments', value: '$2,147', change: '4 charges', color: '#ef4444' },
              { label: 'At-Risk MRR', value: '$499', change: '1 customer', color: '#f59e0b' },
              { label: 'Recovered (30d)', value: '$1,460', change: '68% rate', color: '#3b82f6' },
            ].map((m, i) => (
              <div key={i} className="card" style={{ padding: '16px', textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{m.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{m.change}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#ef4444' }}>●</span> Failed Payments
                <span className="badge-red" style={{ marginLeft: 'auto', fontSize: '10px' }}>4 pending</span>
              </div>
              {['John Smith — $450 expired card', 'TechFlow Co — $299 insufficient funds', 'StartupCo — $899 fraud blocked', 'GrowthCo — $499 declined'].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{r}</span>
                  <span style={{ fontSize: '11px', color: '#3b82f6', cursor: 'pointer' }}>Retry →</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#10b981' }}>●</span> ROI Summary
                <span className="badge-green" style={{ marginLeft: 'auto', fontSize: '10px' }}>Live</span>
              </div>
              {[
                { label: 'Monthly Recovery', value: '$1,460', color: '#10b981' },
                { label: 'Annual Impact', value: '$17,520', color: '#3b82f6' },
                { label: 'Platform ROI', value: '192x', color: '#8b5cf6' },
                { label: 'Recovery Rate', value: '68%', color: '#f59e0b' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '80px 24px', marginBottom: '80px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px' }}>Up and running in 2 minutes</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>No engineers required. Connect Stripe and you're live.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
            {howItWorks.map((step, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                {i < howItWorks.length - 1 && (
                  <div style={{
                    position: 'absolute', top: '24px', left: 'calc(50% + 40px)', right: 'calc(-50% + 40px)',
                    height: '1px', background: 'linear-gradient(90deg, var(--border-light), transparent)',
                  }} />
                )}
                <div style={{
                  width: 56, height: 56, borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
                  border: '1px solid rgba(59,130,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', margin: '0 auto 16px'
                }}>{step.icon}</div>
                <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px' }}>STEP {step.step}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>{step.title}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800 }}>Everything you need to protect revenue</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '16px' }}>One platform. Six revenue shields. Zero revenue lost.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {features.map((f, i) => (
            <div key={i} className="card" style={{ padding: '28px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '12px',
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', marginBottom: '16px'
              }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>{f.title}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '60px 24px', marginBottom: '80px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center', marginBottom: '40px' }}>Trusted by revenue teams worldwide</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {testimonials.map((t, i) => (
              <div key={i} className="card" style={{ padding: '28px' }}>
                <div style={{ fontSize: '20px', marginBottom: '12px', color: '#f59e0b', letterSpacing: '2px' }}>★★★★★</div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '20px', fontStyle: 'italic' }}>"{t.quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, flexShrink: 0
                  }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px' }}>We win when you win</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '560px', margin: '0 auto 8px' }}>
            Flat monthly fee + a small success fee on revenue we actually recover for you. Zero recovery = zero extra charge.
          </p>
          <p style={{ color: '#10b981', fontSize: '14px', fontWeight: 600, marginBottom: '28px' }}>
            Our success fee aligns us completely with your revenue growth.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '6px' }}>
            <button
              onClick={() => setBillingAnnual(false)}
              style={{
                padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: !billingAnnual ? 'var(--bg-card)' : 'transparent',
                color: !billingAnnual ? 'var(--text-primary)' : 'var(--text-muted)',
                border: !billingAnnual ? '1px solid var(--border-light)' : '1px solid transparent',
              }}
            >Monthly</button>
            <button
              onClick={() => setBillingAnnual(true)}
              style={{
                padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: billingAnnual ? 'var(--bg-card)' : 'transparent',
                color: billingAnnual ? 'var(--text-primary)' : 'var(--text-muted)',
                border: billingAnnual ? '1px solid var(--border-light)' : '1px solid transparent',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              Annual
              <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 6px', borderRadius: '10px' }}>Save 20%</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
          {plans.map((plan, i) => {
            const monthlyPrice = parseInt(plan.price.replace('$', ''))
            const displayPrice = billingAnnual ? `$${Math.floor(monthlyPrice * 0.8)}` : plan.price
            return (
              <div key={i} style={{
                background: plan.popular ? 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.05))' : 'var(--bg-card)',
                border: plan.popular ? '2px solid rgba(139,92,246,0.5)' : '1px solid var(--border)',
                borderRadius: '16px', padding: '28px', position: 'relative',
              }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: 'white',
                    fontSize: '11px', fontWeight: 700, padding: '4px 16px', borderRadius: '20px',
                    letterSpacing: '0.05em', whiteSpace: 'nowrap'
                  }}>MOST POPULAR</div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: plan.color }} />
                    <span style={{ fontSize: '16px', fontWeight: 800 }}>{plan.name}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>{plan.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '40px', fontWeight: 900, color: plan.color }}>{displayPrice}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/mo{billingAnnual ? ' billed annually' : ''}</span>
                  </div>
                  {plan.recoveryFee && (
                    <div style={{
                      marginTop: '8px', padding: '6px 10px', borderRadius: '8px',
                      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                      fontSize: '12px', fontWeight: 600, color: '#10b981',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                      <span>💰</span>
                      <span>{plan.recoveryFee}</span>
                    </div>
                  )}
                  {!plan.recoveryFee && (
                    <div style={{
                      marginTop: '8px', padding: '6px 10px', borderRadius: '8px',
                      background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                      fontSize: '12px', color: 'var(--text-muted)'
                    }}>
                      Flat fee only — no success fee
                    </div>
                  )}
                </div>

                <button
                  className={plan.popular ? 'btn-primary' : 'btn-secondary'}
                  onClick={handleLogin}
                  disabled={loading}
                  style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700, marginBottom: '24px', borderRadius: '10px' }}
                >
                  {loading ? '...' : plan.cta}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: plan.color, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Success fee explainer */}
        <div style={{
          marginTop: '32px', padding: '20px 28px', borderRadius: '12px',
          background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'flex-start', gap: '16px'
        }}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>💡</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>How the success fee works</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              On Growth and Scale, all recovery features are included in your flat monthly fee — no percentage taken on recovered revenue.
              If we don't recover anything extra, you pay only the flat fee. This aligns our incentives perfectly: <strong>we only win when you win.</strong>
            </div>
          </div>
        </div>

        {/* Money back guarantee */}
        <div style={{
          marginTop: '40px', textAlign: 'center', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '32px', flexWrap: 'wrap'
        }}>
          {[
            { icon: '🔒', text: '14-day free trial, no credit card' },
            { icon: '↩️', text: '30-day money-back guarantee' },
            { icon: '⚡', text: 'Setup in under 2 minutes' },
            { icon: '🔗', text: 'Cancel anytime, keep your data' },
          ].map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>{g.icon}</span>
              <span>{g.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        textAlign: 'center', padding: '60px 24px 80px',
        background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.05))'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '24px'
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Live Stripe Connection · Real Data</span>
        </div>
        <h2 style={{ fontSize: '48px', fontWeight: 900, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          All 6 shields. One platform.<br />
          <span className="gradient-text">Starting today.</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '40px' }}>
          Join 847 SaaS companies. Deploy all 6 revenue shields in under 2 minutes.
        </p>
        <button
          className="btn-primary"
          onClick={handleLogin}
          disabled={loading}
          style={{ fontSize: '18px', padding: '16px 48px', borderRadius: '14px' }}
        >
          {loading ? '⏳ Signing in...' : '🛡️ Activate All 6 Shields — Free Trial'}
        </button>
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
          No credit card · 14-day free trial · Cancel anytime
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1100px', margin: '0 auto', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 32, height: 32, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
            }}>🛡️</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>RevGuard</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>6 Revenue Shields Platform</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {['Features', 'Pricing', 'Privacy', 'Terms', 'Security'].map(l => (
              <a key={l} href="#" style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text-primary)'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-muted)'}
              >{l}</a>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            © 2025 RevGuard. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
