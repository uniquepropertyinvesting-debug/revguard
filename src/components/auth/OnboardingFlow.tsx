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

interface OnboardingFlowProps {
  user: User | null
  onComplete: () => void
}

const STEPS = ['Welcome', 'Company', 'Revenue Profile', 'Integrations', 'Goals', 'Done']

const integrationOptions = [
  { id: 'stripe', name: 'Stripe', icon: '💳', desc: 'Payment recovery & monitoring' },
  { id: 'paypal', name: 'PayPal', icon: '🅿️', desc: 'PayPal transaction monitoring' },
  { id: 'quickbooks', name: 'QuickBooks', icon: '📚', desc: 'Invoice & billing sync' },
  { id: 'salesforce', name: 'Salesforce', icon: '☁️', desc: 'CRM & customer health' },
  { id: 'hubspot', name: 'HubSpot', icon: '🧡', desc: 'Deal & pipeline tracking' },
  { id: 'snowflake', name: 'Snowflake', icon: '❄️', desc: 'Usage analytics' },
]

const goalOptions = [
  { id: 'failed_payments', label: 'Recover Failed Payments', icon: '💳' },
  { id: 'reduce_churn', label: 'Reduce Churn Rate', icon: '📉' },
  { id: 'fix_billing', label: 'Fix Billing Errors', icon: '🧾' },
  { id: 'usage_tracking', label: 'Track Usage vs Billing', icon: '📊' },
  { id: 'revenue_intel', label: 'Get Revenue Intelligence', icon: '🔍' },
  { id: 'automate_recovery', label: 'Automate Recovery Workflows', icon: '🔄' },
]

export default function OnboardingFlow({ user, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [industry, setIndustry] = useState('')
  const [mrr, setMrr] = useState('')
  const [churnRate, setChurnRate] = useState('')
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>(['stripe'])
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['failed_payments'])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [stripeKey, setStripeKey] = useState('')
  const [stripeKeyError, setStripeKeyError] = useState('')
  const [stripeConnected, setStripeConnected] = useState(false)

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))

  const toggleItem = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const connectStripe = async () => {
    const key = stripeKey.trim()
    if (!key.startsWith('sk_live_') && !key.startsWith('sk_test_')) {
      setStripeKeyError('Key must start with sk_live_ or sk_test_')
      return
    }
    setStripeKeyError('')
    setConnecting('stripe')
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
        setSelectedIntegrations(prev => prev.includes('stripe') ? prev : [...prev, 'stripe'])
        setStripeKey('')
      }
    } catch {
      setStripeKeyError('Connection failed — please try again')
    } finally {
      setConnecting(null)
    }
  }

  const simulateConnect = (id: string) => {
    if (id === 'stripe') return // Stripe uses real connection flow above
    setConnecting(id)
    setTimeout(() => {
      setSelectedIntegrations(prev => prev.includes(id) ? prev : [...prev, id])
      setConnecting(null)
    }, 1200)
  }

  const displayName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '620px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 40, height: 40, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}>🛡️</div>
          <span style={{ fontSize: '20px', fontWeight: 800 }}>RevGuard</span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i < step ? '#10b981' : i === step ? '#3b82f6' : 'var(--border)',
                  border: i === step ? '2px solid rgba(59,130,246,0.5)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: i <= step ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.3s'
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '9px', color: i === step ? '#3b82f6' : 'var(--text-muted)', fontWeight: i === step ? 700 : 400, whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="progress-bar" style={{ height: '3px' }}>
            <div className="progress-fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
          </div>
        </div>

        {/* Card */}
        <div className="card slide-in" style={{ padding: '36px', minHeight: '360px', display: 'flex', flexDirection: 'column' }}>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ fontSize: '56px' }}>👋</div>
              <h2 style={{ fontSize: '26px', fontWeight: 800 }}>Welcome, {displayName}!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '380px', lineHeight: 1.6 }}>
                You're about to set up RevGuard for your company. This takes less than <strong style={{ color: 'var(--text-primary)' }}>2 minutes</strong> and will start protecting your revenue immediately.
              </p>
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                {[
                  { icon: '⚡', label: '2 min setup' },
                  { icon: '🔗', label: 'One-click integrations' },
                  { icon: '🛡️', label: 'Protection starts instantly' },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Company */}
          {step === 1 && (
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Tell us about your company</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>We'll personalize RevGuard for your business</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>COMPANY NAME *</label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>COMPANY SIZE</label>
                    <select value={companySize} onChange={e => setCompanySize(e.target.value)} style={{ width: '100%' }}>
                      <option value="">Select size...</option>
                      <option value="1-10">1–10 employees</option>
                      <option value="11-50">11–50 employees</option>
                      <option value="51-200">51–200 employees</option>
                      <option value="201-500">201–500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>INDUSTRY</label>
                    <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ width: '100%' }}>
                      <option value="">Select industry...</option>
                      <option value="saas">SaaS / Software</option>
                      <option value="fintech">FinTech</option>
                      <option value="ecommerce">E-Commerce</option>
                      <option value="marketplace">Marketplace</option>
                      <option value="healthtech">HealthTech</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Revenue Profile */}
          {step === 2 && (
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Your Revenue Profile</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Helps us calculate how much revenue we can protect</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>MONTHLY RECURRING REVENUE (MRR)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }}>$</span>
                    <input value={mrr} onChange={e => setMrr(e.target.value)} placeholder="150,000" style={{ width: '100%', paddingLeft: '26px' }} type="number" />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>MONTHLY CHURN RATE (%)</label>
                  <input value={churnRate} onChange={e => setChurnRate(e.target.value)} placeholder="3.5" style={{ width: '100%' }} type="number" step="0.1" />
                </div>

                {/* Live Preview */}
                {mrr && (
                  <div style={{ padding: '16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, marginBottom: '8px' }}>📊 REVENUE PROTECTION ESTIMATE</div>
                    <div style={{ display: 'flex', gap: '24px' }}>
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                          ${Math.round(parseFloat(mrr || '0') * 0.068 * 0.68).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Est. monthly recovery</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>
                          ${Math.round(parseFloat(mrr || '0') * 0.068 * 0.68 * 12).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Est. annual protection</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Integrations */}
          {step === 3 && (
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Connect your tools</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Start with Stripe — add more integrations any time from the dashboard.</p>

              {/* Stripe — real connection */}
              <div style={{
                padding: '16px', borderRadius: '12px', marginBottom: '12px',
                background: stripeConnected ? 'rgba(16,185,129,0.08)' : 'var(--bg-primary)',
                border: `1px solid ${stripeConnected ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: stripeConnected ? 0 : '12px' }}>
                  <span style={{ fontSize: '22px' }}>💳</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Stripe {stripeConnected && <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Connected</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payment recovery & real-time monitoring</div>
                  </div>
                  {stripeConnected && <span className="badge-green" style={{ fontSize: '10px' }}>LIVE</span>}
                </div>
                {!stripeConnected && (
                  <>
                    <div style={{ marginBottom: '8px' }}>
                      <input
                        value={stripeKey}
                        onChange={e => { setStripeKey(e.target.value); setStripeKeyError('') }}
                        placeholder="sk_live_... or sk_test_..."
                        type="password"
                        style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace' }}
                        onKeyDown={e => e.key === 'Enter' && connectStripe()}
                      />
                    </div>
                    {stripeKeyError && (
                      <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>{stripeKeyError}</div>
                    )}
                    <button
                      className="btn-primary"
                      onClick={connectStripe}
                      disabled={connecting === 'stripe' || !stripeKey.trim()}
                      style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                    >
                      {connecting === 'stripe' ? '⏳ Connecting...' : '🔗 Connect Stripe'}
                    </button>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Find your key at <strong>dashboard.stripe.com → Developers → API keys</strong>. We encrypt it immediately.
                    </div>
                  </>
                )}
              </div>

              {/* Other integrations — coming soon */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {integrationOptions.filter(i => i.id !== 'stripe').map(intg => {
                  const isConnected = selectedIntegrations.includes(intg.id)
                  const isConnecting = connecting === intg.id
                  return (
                    <button
                      key={intg.id}
                      onClick={() => isConnected ? null : simulateConnect(intg.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '10px', cursor: isConnected ? 'default' : 'pointer',
                        background: isConnected ? 'rgba(16,185,129,0.08)' : 'var(--bg-primary)',
                        border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                        textAlign: 'left', opacity: 0.7,
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{intg.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{intg.name}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Coming soon</div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: isConnected ? '#10b981' : 'var(--text-muted)' }}>
                        {isConnecting ? '⏳' : isConnected ? '✓' : 'Soon'}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                {stripeConnected ? '✅ Stripe connected — monitoring active!' : 'You can also connect Stripe later from Integrations settings.'}
              </div>
            </div>
          )}

          {/* Step 4: Goals */}
          {step === 4 && (
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>What are your top priorities?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Select all that apply. We'll customize your dashboard.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {goalOptions.map(goal => {
                  const selected = selectedGoals.includes(goal.id)
                  return (
                    <button
                      key={goal.id}
                      onClick={() => toggleItem(goal.id, selectedGoals, setSelectedGoals)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '14px', borderRadius: '10px', cursor: 'pointer',
                        background: selected ? 'rgba(59,130,246,0.1)' : 'var(--bg-primary)',
                        border: `1px solid ${selected ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                        textAlign: 'left', transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{goal.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: selected ? '#3b82f6' : 'var(--text-secondary)' }}>{goal.label}</span>
                      {selected && <span style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: '14px', fontWeight: 700 }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ fontSize: '64px', animation: 'pulse 1s' }}>🎉</div>
              <h2 style={{ fontSize: '26px', fontWeight: 800 }}>You're all set, {displayName}!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '380px', lineHeight: 1.6 }}>
                <strong style={{ color: '#10b981' }}>{companyName || 'Your company'}</strong> is now protected.
                RevGuard is monitoring your revenue in real-time.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { icon: '✅', label: `${selectedIntegrations.length} integrations connected` },
                  { icon: '🎯', label: `${selectedGoals.length} goals configured` },
                  { icon: '🛡️', label: 'Protection active' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '20px', fontSize: '13px', color: '#10b981', fontWeight: 600
                  }}>
                    {item.icon} {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn-secondary"
              onClick={back}
              style={{ visibility: step === 0 ? 'hidden' : 'visible', fontSize: '14px' }}
            >
              ← Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                className="btn-primary"
                onClick={next}
                disabled={step === 1 && !companyName.trim()}
                style={{ fontSize: '14px', padding: '10px 28px' }}
              >
                {step === 0 ? "Let's Go →" : step === STEPS.length - 2 ? 'Almost Done →' : 'Continue →'}
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={onComplete}
                style={{ fontSize: '14px', padding: '10px 28px', background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}
              >
                🚀 Enter RevGuard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
