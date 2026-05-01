'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/auth'

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  balance: number
}

export interface OnboardingProfile {
  companyName: string
  companySize: string
  industry: string
  mrr: string
  churnRate: string
  stripeConnected: boolean
}

interface OnboardingFlowProps {
  user: User | null
  onComplete: (profile: OnboardingProfile) => void
}

const STEPS = ['Welcome', 'About you', 'Connect Stripe', 'Done']

export default function OnboardingFlow({ user, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [industry, setIndustry] = useState('')
  const [mrr, setMrr] = useState('')
  const [churnRate, setChurnRate] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [stripeKey, setStripeKey] = useState('')
  const [stripeKeyError, setStripeKeyError] = useState('')
  const [stripeConnected, setStripeConnected] = useState(false)

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))

  const connectStripe = async () => {
    const key = stripeKey.trim()
    if (!key.startsWith('sk_live_') && !key.startsWith('sk_test_')) {
      setStripeKeyError('Key must start with sk_live_ or sk_test_')
      return
    }
    setStripeKeyError('')
    setConnecting(true)
    try {
      const res = await authFetch('/api/db/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: key }),
      })
      const data = await res.json()
      if (data.error) {
        setStripeKeyError(data.error)
      } else {
        setStripeConnected(true)
        setStripeKey('')
        setTimeout(() => setStep(STEPS.length - 1), 600)
      }
    } catch {
      setStripeKeyError('Connection failed — please try again')
    } finally {
      setConnecting(false)
    }
  }

  const finish = () => {
    onComplete({ companyName, companySize, industry, mrr, churnRate, stripeConnected })
  }

  const displayName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 40, height: 40, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}>RG</div>
          <span style={{ fontSize: '20px', fontWeight: 800 }}>RevGuard</span>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i < step ? '#10b981' : i === step ? '#3b82f6' : 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: i <= step ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.3s'
                }}>
                  {i < step ? 'OK' : i + 1}
                </div>
                <span style={{ fontSize: '10px', color: i === step ? '#3b82f6' : 'var(--text-muted)', fontWeight: i === step ? 700 : 400, whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="progress-bar" style={{ height: '3px' }}>
            <div className="progress-fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }} />
          </div>
        </div>

        <div className="card slide-in" style={{ padding: '32px', minHeight: '340px', display: 'flex', flexDirection: 'column' }}>

          {step === 0 && (
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 800 }}>Welcome, {displayName}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '420px', lineHeight: 1.6 }}>
                Three quick steps and you'll be looking at your live revenue health. Total time:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>under two minutes</strong>.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { n: '1', label: 'Tell us about your business' },
                  { n: '2', label: 'Connect Stripe (or skip)' },
                  { n: '3', label: 'See your live data' },
                ].map(item => (
                  <div key={item.n} style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: '#3b82f6' }}>{item.n}.</strong> {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>About your business</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Helps us tailor protection to your revenue scale. All optional except company name.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>COMPANY NAME *</label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" style={{ width: '100%' }} autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>COMPANY SIZE</label>
                    <select value={companySize} onChange={e => setCompanySize(e.target.value)} style={{ width: '100%' }}>
                      <option value="">Select...</option>
                      <option value="1-10">1–10</option>
                      <option value="11-50">11–50</option>
                      <option value="51-200">51–200</option>
                      <option value="201-500">201–500</option>
                      <option value="500+">500+</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>INDUSTRY</label>
                    <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ width: '100%' }}>
                      <option value="">Select...</option>
                      <option value="saas">SaaS / Software</option>
                      <option value="fintech">FinTech</option>
                      <option value="ecommerce">E-Commerce</option>
                      <option value="marketplace">Marketplace</option>
                      <option value="healthtech">HealthTech</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>MONTHLY REVENUE (MRR)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }}>$</span>
                      <input value={mrr} onChange={e => setMrr(e.target.value)} placeholder="150,000" style={{ width: '100%', paddingLeft: '24px' }} type="number" />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>CHURN RATE (%)</label>
                    <input value={churnRate} onChange={e => setChurnRate(e.target.value)} placeholder="3.5" style={{ width: '100%' }} type="number" step="0.1" />
                  </div>
                </div>

                {mrr && parseFloat(mrr) > 0 && (
                  <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginBottom: '4px' }}>ESTIMATED ANNUAL PROTECTION</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                      ${Math.round(parseFloat(mrr) * 0.068 * 0.68 * 12).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Based on industry-average failed-payment recovery</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Connect Stripe</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                The fastest way to see real data — paste a restricted Stripe secret key and we'll start monitoring within seconds.
              </p>

              <div style={{
                padding: '18px', borderRadius: '12px', marginBottom: '14px',
                background: stripeConnected ? 'rgba(16,185,129,0.08)' : 'var(--bg-primary)',
                border: `1px solid ${stripeConnected ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
              }}>
                {stripeConnected ? (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px', color: '#10b981', fontWeight: 800 }}>✓</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981' }}>Stripe connected</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Loading your revenue data...</div>
                  </div>
                ) : (
                  <>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      STRIPE SECRET KEY
                    </label>
                    <input
                      value={stripeKey}
                      onChange={e => { setStripeKey(e.target.value); setStripeKeyError('') }}
                      placeholder="sk_live_... or sk_test_..."
                      type="password"
                      style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace', marginBottom: '8px' }}
                      onKeyDown={e => e.key === 'Enter' && connectStripe()}
                      autoFocus
                    />
                    {stripeKeyError && (
                      <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>{stripeKeyError}</div>
                    )}
                    <button
                      className="btn-primary"
                      onClick={connectStripe}
                      disabled={connecting || !stripeKey.trim()}
                      style={{ width: '100%', fontSize: '13px', padding: '10px' }}
                    >
                      {connecting ? 'Connecting...' : 'Connect Stripe'}
                    </button>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.5 }}>
                      Find your key at <strong>dashboard.stripe.com → Developers → API keys</strong>. We encrypt it at rest and never log raw values.
                    </div>
                  </>
                )}
              </div>

              {!stripeConnected && (
                <button
                  onClick={() => setStep(STEPS.length - 1)}
                  style={{
                    width: '100%', background: 'transparent', border: '1px dashed var(--border)',
                    color: 'var(--text-muted)', padding: '10px', borderRadius: '10px',
                    fontSize: '13px', cursor: 'pointer', fontWeight: 500
                  }}
                >
                  Skip for now — I'll connect Stripe from the dashboard
                </button>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: stripeConnected ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: 800,
                color: stripeConnected ? '#10b981' : '#3b82f6'
              }}>
                {stripeConnected ? '✓' : '→'}
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800 }}>
                {stripeConnected ? "You're protected" : "You're all set"}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '380px', lineHeight: 1.6 }}>
                {stripeConnected
                  ? <>RevGuard is now monitoring <strong style={{ color: 'var(--text-primary)' }}>{companyName || 'your account'}</strong> for failed payments, churn signals, and billing errors in real time.</>
                  : <>You can connect Stripe any time from <strong style={{ color: 'var(--text-primary)' }}>Integrations</strong> in the sidebar to unlock live data.</>
                }
              </p>
              <button
                className="btn-primary"
                onClick={finish}
                style={{ fontSize: '14px', padding: '12px 32px', background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
              >
                {stripeConnected ? 'View live revenue →' : 'Open dashboard →'}
              </button>
            </div>
          )}

          {step !== 3 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <button
                className="btn-secondary"
                onClick={back}
                style={{ visibility: step === 0 ? 'hidden' : 'visible', fontSize: '13px' }}
              >
                ← Back
              </button>

              <button
                className="btn-primary"
                onClick={next}
                disabled={step === 1 && !companyName.trim()}
                style={{ fontSize: '14px', padding: '10px 28px' }}
              >
                {step === 0 ? "Let's go →" : 'Continue →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
