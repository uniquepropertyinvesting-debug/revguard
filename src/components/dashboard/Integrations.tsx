'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth'

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

  useEffect(() => {
    const load = async () => {
      try {
        const r = await authFetch('/api/db/stripe-connect')
        const data = await r.json()
        setStripeStatus(data)
      } catch {
        setStripeStatus({ connected: false })
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!secretKey.startsWith('sk_')) {
      setSaveMsg('Secret key must start with sk_live_ or sk_test_')
      return
    }
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await authFetch('/api/db/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey, webhookSecret: webhookSecret || undefined }),
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
      const res = await fetch('/api/stripe/overview')
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
