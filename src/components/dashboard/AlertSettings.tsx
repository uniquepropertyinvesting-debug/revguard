'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth'

interface Settings {
  notifyEmail: string
  hasResendKey: boolean
  emailFailedPayments: boolean
  emailChurnRisk: boolean
  emailBillingErrors: boolean
  emailPaymentRecovered: boolean
  emailMinAmount: number
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: '11px', border: 'none', cursor: 'pointer',
        background: checked ? '#10b981' : 'var(--border-light)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: 'white',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

export default function AlertSettings() {
  const [settings, setSettings] = useState<Settings>({
    notifyEmail: '',
    hasResendKey: false,
    emailFailedPayments: true,
    emailChurnRisk: true,
    emailBillingErrors: true,
    emailPaymentRecovered: true,
    emailMinAmount: 0,
  })
  const [resendKey, setResendKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/alert-settings')
      .then(r => { if (!r.ok) throw new Error(`Failed (${r.status})`); return r.json() })
      .then(d => { if (!d.error) setSettings(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const body: any = { ...settings }
      if (resendKey.trim()) body.resendApiKey = resendKey.trim()
      const r = await authFetch('/api/alert-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error(`Save failed (${r.status})`)
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setStatus({ type: 'success', msg: 'Settings saved!' })
      if (resendKey) { setSettings(s => ({ ...s, hasResendKey: true })); setResendKey('') }
      setTimeout(() => setStatus(null), 3000)
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message })
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async () => {
    if (!settings.notifyEmail) { setStatus({ type: 'error', msg: 'Enter a notification email first' }); return }
    if (!settings.hasResendKey && !resendKey) { setStatus({ type: 'error', msg: 'Enter your Resend API key first' }); return }
    setTesting(true)
    setStatus(null)
    try {
      const r = await authFetch('/api/alert-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!r.ok) throw new Error(`Test failed (${r.status})`)
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setStatus({ type: 'success', msg: `Test email sent to ${settings.notifyEmail}!` })
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-muted)' }}>
      Loading settings...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 24px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.05))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px' }}>
        <span style={{ fontSize: '28px' }}>📧</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>Email Alert Settings</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Get notified instantly when revenue events occur — powered by Resend (free up to 3,000 emails/mo)
          </div>
        </div>
        <a href="https://resend.com/signup" target="_blank" rel="noreferrer"
          style={{ marginLeft: 'auto', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Get free Resend key →
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Connection Setup */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔌 Connection
            {settings.hasResendKey
              ? <span className="badge-green" style={{ fontSize: '10px' }}>Connected</span>
              : <span className="badge-yellow" style={{ fontSize: '10px' }}>Not connected</span>
            }
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Resend API Key */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Resend API Key {settings.hasResendKey && <span style={{ color: '#10b981' }}>(saved ✓)</span>}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={resendKey}
                  onChange={e => setResendKey(e.target.value)}
                  placeholder={settings.hasResendKey ? '••••••••••••••• (change key)' : 're_xxxxxxxxxxxx'}
                  style={{ flex: 1, fontSize: '13px' }}
                />
                <button onClick={() => setShowKey(s => !s)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0 10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}>
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Free at resend.com · 3,000 emails/mo · 100/day
              </div>
            </div>

            {/* Notify email */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Send alerts to
              </label>
              <input
                type="email"
                value={settings.notifyEmail}
                onChange={e => setSettings(s => ({ ...s, notifyEmail: e.target.value }))}
                placeholder="you@yourcompany.com"
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>

            {/* Minimum amount */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Only alert for amounts over ($)
              </label>
              <input
                type="number"
                value={settings.emailMinAmount}
                onChange={e => setSettings(s => ({ ...s, emailMinAmount: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                style={{ width: '100%', fontSize: '13px' }}
                min="0"
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Set to 0 to get all alerts</div>
            </div>
          </div>
        </div>

        {/* Alert Types */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '20px' }}>🔔 Alert Types</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { key: 'emailFailedPayments', label: 'Failed Payments', desc: 'When a charge or invoice fails', icon: '💳', color: '#ef4444' },
              { key: 'emailChurnRisk', label: 'Churn Risk', desc: 'When a customer becomes at-risk', icon: '⚠️', color: '#f59e0b' },
              { key: 'emailBillingErrors', label: 'Billing Errors', desc: 'Duplicate charges, anomalies', icon: '🧾', color: '#8b5cf6' },
              { key: 'emailPaymentRecovered', label: 'Payment Recovered', desc: 'When a failed payment is recovered', icon: '✅', color: '#10b981' },
            ].map((item, i) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
                  background: `${item.color}15`, border: `1px solid ${item.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
                </div>
                <Toggle
                  checked={settings[item.key as keyof Settings] as boolean}
                  onChange={v => setSettings(s => ({ ...s, [item.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status message */}
      {status && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
          background: status.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: status.type === 'success' ? '#10b981' : '#ef4444',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {status.type === 'success' ? '✅' : '❌'} {status.msg}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving}
          style={{ padding: '10px 28px', fontSize: '14px' }}
        >
          {saving ? '⏳ Saving...' : '💾 Save Settings'}
        </button>
        <button
          className="btn-secondary"
          onClick={sendTest}
          disabled={testing || (!settings.hasResendKey && !resendKey) || !settings.notifyEmail}
          style={{ padding: '10px 20px', fontSize: '14px' }}
          title={!settings.hasResendKey ? 'Save your Resend API key first' : ''}
        >
          {testing ? '⏳ Sending...' : '📨 Send Test Email'}
        </button>
      </div>

      {/* How it works */}
      <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px', padding: '16px 20px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📖</span> How email alerts work
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { step: '1', text: 'Get a free API key at resend.com (3,000 emails/mo free)' },
            { step: '2', text: 'Paste it above with your email. Click Save.' },
            { step: '3', text: 'RevGuard emails you instantly when Stripe fires a webhook event.' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{s.step}</div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
