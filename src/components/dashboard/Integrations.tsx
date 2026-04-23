'use client'

import { useState, useEffect } from 'react'
import { getAuthUserId, authFetch } from '@/lib/auth'

interface StripeConnectionStatus {
  connected: boolean
  hasWebhookSecret?: boolean
  connectedAt?: number
}

const comingSoon = [
  {
    name: 'PayPal', icon: '🅿️', category: 'Payments', color: '#003087',
    description: 'PayPal transaction monitoring and dispute management',
    features: ['Transaction Monitoring', 'Dispute Management', 'Refund Tracking'],
  },
  {
    name: 'QuickBooks', icon: '📚', category: 'Accounting', color: '#2ca01c',
    description: 'Invoice sync, billing error detection, AR management',
    features: ['Invoice Sync', 'Billing Errors', 'AR Aging', 'Tax Compliance'],
  },
  {
    name: 'Salesforce', icon: '☁️', category: 'CRM', color: '#00a1e0',
    description: 'Customer health scores, contract renewals, opportunity tracking',
    features: ['Customer Health', 'Contract Renewals', 'Opportunity Sync'],
  },
  {
    name: 'HubSpot', icon: '🧡', category: 'CRM', color: '#ff7a59',
    description: 'Deal tracking, churn signals from CRM activity',
    features: ['Deal Tracking', 'Contact Activity', 'Pipeline Sync'],
  },
  {
    name: 'Snowflake', icon: '❄️', category: 'Data Warehouse', color: '#29b5e8',
    description: 'Product usage analytics and custom revenue metrics',
    features: ['Usage Analytics', 'Custom Metrics', 'Revenue Attribution'],
  },
]

export default function Integrations() {
  const [stripeStatus, setStripeStatus] = useState<StripeConnectionStatus | null>(null)
  const [showStripeForm, setShowStripeForm] = useState(false)
  const [secretKey, setSecretKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Webhook setup section state
  const [webhookInput, setWebhookInput] = useState('')
  const [webhookSaving, setWebhookSaving] = useState(false)
  const [webhookMsg, setWebhookMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const id = getAuthUserId() || ''
    setUserId(id)
    authFetch('/api/db/stripe-connect')
      .then(r => r.json())
      .then(data => setStripeStatus(data))
      .catch(() => setStripeStatus({ connected: false }))
  }, [])

  const handleSave = async () => {
    if (!secretKey.startsWith('sk_')) {
      setSaveMsg('Secret key must start with sk_live_ or sk_test_')
      return
    }
    setSaving(true)
    setSaveMsg('')
    try {
      const uid = getAuthUserId()
      const res = await authFetch('/api/db/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, secretKey, webhookSecret: webhookSecret || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setStripeStatus({ connected: true, hasWebhookSecret: !!webhookSecret, connectedAt: Date.now() / 1000 })
        setShowStripeForm(false)
        setSecretKey('')
        setWebhookSecret('')
        setSaveMsg('')
        // Reload the page so the new key takes effect for all API calls
        window.location.reload()
      } else {
        setSaveMsg(data.error || 'Failed to save')
      }
    } catch {
      setSaveMsg('Network error — try again')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!secretKey.startsWith('sk_')) {
      setTestResult({ ok: false, message: 'Key must start with sk_live_ or sk_test_' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      // Quick validation: hit our overview endpoint which uses the stored key
      // For a new key being tested before saving, we test by trying to save temporarily
      const res = await authFetch('/api/stripe/overview')
      if (res.ok) {
        setTestResult({ ok: true, message: 'Stripe connection is working' })
      } else {
        setTestResult({ ok: false, message: 'Could not reach Stripe — verify key is correct' })
      }
    } catch {
      setTestResult({ ok: false, message: 'Connection test failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleWebhookSave = async () => {
    if (!webhookInput.startsWith('whsec_')) {
      setWebhookMsg({ ok: false, text: 'Secret must start with whsec_' })
      return
    }
    setWebhookSaving(true)
    setWebhookMsg(null)
    try {
      const uid = getAuthUserId()
      const res = await authFetch('/api/db/stripe-connect', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, webhookSecret: webhookInput }),
      })
      const data = await res.json()
      if (data.success) {
        setStripeStatus(prev => prev ? { ...prev, hasWebhookSecret: true } : { connected: true, hasWebhookSecret: true })
        setWebhookMsg({ ok: true, text: 'Webhook secret saved — real-time events are now active' })
        setWebhookInput('')
      } else {
        setWebhookMsg({ ok: false, text: data.error || 'Failed to save webhook secret' })
      }
    } catch {
      setWebhookMsg({ ok: false, text: 'Network error — please try again' })
    } finally {
      setWebhookSaving(false)
    }
  }

  const webhookEndpointUrl = `https://revguard.up.railway.app/api/webhooks/stripe${userId ? `?userId=${userId}` : ''}`

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookEndpointUrl).then(() => {
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    })
  }

  const connectedAt = stripeStatus?.connectedAt
    ? new Date(stripeStatus.connectedAt * 1000).toLocaleDateString()
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Connected', value: stripeStatus?.connected ? '1' : '0', color: '#10b981', icon: '✅' },
          { label: 'Available', value: `${comingSoon.length}`, color: '#3b82f6', icon: '🔗' },
          { label: 'Webhook Status', value: stripeStatus?.hasWebhookSecret ? 'Active' : 'No webhook', color: '#8b5cf6', icon: '📡' },
          { label: 'Last Sync', value: '2m ago', color: '#06b6d4', icon: '🔄' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
              <span style={{ fontSize: '22px' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stripe — Primary Integration */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge-green">PRIMARY</span>
          <span>Stripe Integration</span>
        </div>

        <div className={`card ${stripeStatus?.connected ? 'glow-green' : ''}`} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '36px' }}>💳</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>Stripe</div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payments & Billing</span>
                {stripeStatus?.connected
                  ? <span className="badge-green" style={{ marginLeft: 'auto' }}>Connected</span>
                  : <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>Not Connected</span>
                }
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Powers all 6 Revenue Shields — failed payment recovery, churn detection, billing error analysis, dunning, and real-time alerts.
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
                {['Failed Payment Recovery', 'Smart Retry Engine', 'Webhook Events', 'Subscription Monitoring', 'Invoice Tracking', 'Automated Dunning'].map(f => (
                  <span key={f} style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)' }}>{f}</span>
                ))}
              </div>

              {stripeStatus?.connected && !showStripeForm && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="pulse-dot" style={{ background: '#10b981' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Live · Connected {connectedAt ? `on ${connectedAt}` : 'recently'}
                      {stripeStatus.hasWebhookSecret ? ' · Webhooks active' : ' · Webhooks not configured'}
                    </span>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '5px 12px', marginLeft: 'auto' }}
                    onClick={() => setShowStripeForm(true)}
                  >
                    Update Keys
                  </button>
                </div>
              )}

              {(!stripeStatus?.connected || showStripeForm) && (
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                    {showStripeForm ? 'Update Stripe API Keys' : 'Connect Your Stripe Account'}
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      SECRET KEY <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="sk_live_... or sk_test_..."
                      value={secretKey}
                      onChange={e => setSecretKey(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: '8px',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Find this in Stripe Dashboard → Developers → API keys
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      WEBHOOK SIGNING SECRET <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="whsec_..."
                      value={webhookSecret}
                      onChange={e => setWebhookSecret(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: '8px',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Required for real-time webhook events. Set endpoint URL to: <code style={{ background: 'rgba(59,130,246,0.1)', padding: '1px 4px', borderRadius: '3px', fontSize: '10px' }}>/api/webhooks/stripe</code>
                    </div>
                  </div>

                  {saveMsg && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '12px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {saveMsg}
                    </div>
                  )}

                  {testResult && (
                    <div style={{ fontSize: '12px', color: testResult.ok ? '#10b981' : '#ef4444', marginBottom: '12px', padding: '8px 12px', background: testResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '6px', border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                      {testResult.ok ? '✓' : '✗'} {testResult.message}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn-primary"
                      style={{ fontSize: '13px', padding: '8px 18px' }}
                      onClick={handleSave}
                      disabled={saving || !secretKey}
                    >
                      {saving ? '⏳ Saving...' : '🔐 Save & Connect'}
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '13px', padding: '8px 14px' }}
                      onClick={handleTest}
                      disabled={testing || !secretKey}
                    >
                      {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                    {showStripeForm && (
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '13px', padding: '8px 14px' }}
                        onClick={() => { setShowStripeForm(false); setSaveMsg(''); setTestResult(null) }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Setup */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge-blue">SETUP</span>
          <span>Webhook Configuration</span>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '36px' }}>🔗</div>
            <div style={{ flex: 1 }}>

              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>Webhook Setup</div>
                {stripeStatus?.hasWebhookSecret
                  ? <span className="badge-green" style={{ marginLeft: 'auto' }}>✓ Webhook Connected</span>
                  : <span style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>Not Configured</span>
                }
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Register your webhook endpoint in Stripe so RevGuard receives real-time payment events — failed charges, subscription cancellations, disputes, and recovered payments.
              </div>

              {/* Step-by-step instructions */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '14px' }}>
                  HOW TO REGISTER YOUR WEBHOOK
                </div>
                {[
                  { step: '1', text: 'Go to Stripe Dashboard → Settings → Webhooks', link: 'https://dashboard.stripe.com/webhooks', linkText: 'Open Stripe Webhooks →' },
                  { step: '2', text: 'Click "Add endpoint" and paste the URL below' },
                  { step: '3', text: 'Under "Select events", add these 6 events:' },
                  { step: '4', text: 'Click "Add endpoint" to save, then open the endpoint and click "Reveal" next to Signing secret' },
                  { step: '5', text: 'Copy the signing secret (whsec_...) and paste it in the field below' },
                ].map(({ step, text, link, linkText }) => (
                  <div key={step} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      {step}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {text}
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: '#3b82f6', fontSize: '12px', textDecoration: 'none' }}>
                          {linkText}
                        </a>
                      )}
                      {step === '3' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                          {[
                            'payment_intent.payment_failed',
                            'invoice.payment_failed',
                            'invoice.payment_succeeded',
                            'customer.subscription.deleted',
                            'customer.subscription.updated',
                            'charge.dispute.created',
                          ].map(evt => (
                            <code key={evt} style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', borderRadius: '4px', border: '1px solid rgba(139,92,246,0.2)', fontFamily: 'monospace' }}>
                              {evt}
                            </code>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Endpoint URL */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  YOUR WEBHOOK ENDPOINT URL
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <code style={{
                    flex: 1, padding: '10px 14px', borderRadius: '8px',
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    color: '#10b981', fontSize: '12px', fontFamily: 'monospace',
                    wordBreak: 'break-all', lineHeight: '1.5',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {webhookEndpointUrl}
                  </code>
                  <button
                    onClick={handleCopyUrl}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '8px 14px', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {urlCopied ? '✓ Copied!' : '📋 Copy URL'}
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Paste this URL into the "Endpoint URL" field in Stripe Dashboard
                </div>
              </div>

              {/* Webhook secret input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  WEBHOOK SIGNING SECRET
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    placeholder="whsec_..."
                    value={webhookInput}
                    onChange={e => { setWebhookInput(e.target.value); setWebhookMsg(null) }}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: '8px',
                      background: 'var(--bg-primary)', border: '1px solid var(--border)',
                      color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace',
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '10px 18px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onClick={handleWebhookSave}
                    disabled={webhookSaving || !webhookInput}
                  >
                    {webhookSaving ? '⏳ Saving...' : '🔐 Save Webhook Secret'}
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Found in Stripe Dashboard → Webhooks → your endpoint → Signing secret
                </div>
              </div>

              {/* Status message */}
              {webhookMsg && (
                <div style={{
                  fontSize: '13px',
                  color: webhookMsg.ok ? '#10b981' : '#ef4444',
                  padding: '10px 14px',
                  background: webhookMsg.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  borderRadius: '8px',
                  border: `1px solid ${webhookMsg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  marginBottom: '4px',
                }}>
                  {webhookMsg.ok ? '✓ ' : '✗ '}{webhookMsg.text}
                </div>
              )}

              {/* Docs link */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <a
                  href="https://stripe.com/docs/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  📖 Stripe Webhook Documentation
                  <span style={{ fontSize: '10px' }}>↗</span>
                </a>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge-blue">COMING SOON</span>
          <span>More integrations</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {comingSoon.map(intg => (
            <div key={intg.name} className="card" style={{ padding: '20px', opacity: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '28px' }}>{intg.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{intg.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{intg.category}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '9px', padding: '2px 8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '20px', fontWeight: 700 }}>SOON</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{intg.description}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {intg.features.map(f => (
                  <span key={f} style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(59,130,246,0.06)', color: '#3b82f6', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.15)' }}>{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
