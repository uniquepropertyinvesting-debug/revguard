'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth'

interface SecretRow {
  key: string
  configured: boolean
  updatedAt: string | null
}

const META: Record<string, { label: string; hint: string; type: 'password' | 'text' | 'email' | 'url' }> = {
  openai_api_key: { label: 'OpenAI API Key', hint: 'Powers the AI assistant. Starts with sk-', type: 'password' },
  resend_api_key: { label: 'Resend API Key', hint: 'Sends alert and dunning emails. Starts with re_', type: 'password' },
  alert_email: { label: 'Alert Email', hint: 'Where outbound alerts are addressed', type: 'email' },
  operator_email: { label: 'Operator Email', hint: 'Email allowed to access this admin console', type: 'email' },
  cron_secret: { label: 'Cron Secret', hint: 'Bearer token for the email-drain cron job', type: 'password' },
  betterstack_webhook_secret: { label: 'BetterStack Webhook Secret', hint: 'Verifies incident webhooks', type: 'password' },
  sentry_dsn: { label: 'Sentry DSN', hint: 'https://...@sentry.io/...', type: 'url' },
  log_webhook_url: { label: 'Log Webhook URL', hint: 'Generic JSON log forwarder (Logtail, etc.)', type: 'url' },
}

export default function AdminSecretsPage() {
  const [rows, setRows] = useState<SecretRow[] | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const r = await authFetch('/api/admin/secrets')
    if (r.status === 403) {
      setForbidden(true)
      return
    }
    const d = await r.json()
    setRows(d.secrets || [])
  }

  useEffect(() => { load() }, [])

  const save = async (key: string) => {
    setSaving(true)
    setMsg('')
    try {
      const r = await authFetch('/api/admin/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: draft }),
      })
      const d = await r.json()
      if (d.success) {
        setEditing(null)
        setDraft('')
        await load()
      } else {
        setMsg(d.error || 'Failed to save')
      }
    } catch {
      setMsg('Network error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (key: string) => {
    if (!confirm(`Remove ${key}?`)) return
    await authFetch(`/api/admin/secrets?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
    await load()
  }

  if (forbidden) {
    return (
      <div style={{ padding: '64px 24px', maxWidth: 640, margin: '0 auto', color: 'var(--text-primary)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Admin Secrets</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Access denied. Set <code>OPERATOR_EMAIL</code> as an environment variable, or store an{' '}
          <code>operator_email</code> / <code>alert_email</code> entry in <code>app_secrets</code>, then sign in with that address.
        </p>
      </div>
    )
  }

  if (!rows) {
    return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 880, margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Platform Secrets</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Stored encrypted in the shared <code>app_secrets</code> table. Both your local dev environment
          and your production deploy read from here, so once a value is set it propagates everywhere
          automatically. Bootstrap variables (<code>SUPABASE_*</code>, <code>REVGUARD_ENCRYPTION_KEY</code>,
          <code> NEXT_PUBLIC_APP_URL</code>) must remain in environment variables on each platform.
        </p>
      </div>

      {msg && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '8px 12px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(row => {
          const meta = META[row.key]
          const isEditing = editing === row.key
          return (
            <div key={row.key} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{meta?.label || row.key}</div>
                    {row.configured
                      ? <span className="badge-green">Set</span>
                      : <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>Not set</span>
                    }
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                    <code>{row.key}</code> · {meta?.hint || 'Stored encrypted'}
                    {row.updatedAt && ` · Updated ${new Date(row.updatedAt).toLocaleString()}`}
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type={meta?.type || 'password'}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        placeholder={`New ${meta?.label || row.key}`}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8,
                          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                          color: 'var(--text-primary)', fontSize: 13, fontFamily: 'monospace',
                        }}
                      />
                      <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} disabled={saving || !draft} onClick={() => save(row.key)}>
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => { setEditing(null); setDraft('') }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => { setEditing(row.key); setDraft('') }}>
                        {row.configured ? 'Update' : 'Set value'}
                      </button>
                      {row.configured && (
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px', color: '#ef4444' }} onClick={() => remove(row.key)}>
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
