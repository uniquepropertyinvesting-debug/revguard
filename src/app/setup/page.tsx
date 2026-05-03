'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth'

interface Status {
  signedIn: boolean
  userEmail: string | null
  operatorClaimed: boolean
  operatorEmail: string | null
  isOperator: boolean
  bootstrap: Array<{ name: string; set: boolean }>
  encryption: { localOk: boolean; storedOk: boolean | null; detail: string }
  secrets: Array<{ key: string; configured: boolean }>
}

const SECRET_LABELS: Record<string, string> = {
  openai_api_key: 'OpenAI API Key',
  resend_api_key: 'Resend API Key',
  alert_email: 'Alert Email',
  operator_email: 'Operator Email',
  cron_secret: 'Cron Secret',
  betterstack_webhook_secret: 'BetterStack Webhook Secret',
  sentry_dsn: 'Sentry DSN',
  log_webhook_url: 'Log Webhook URL',
}

const PILL = (ok: boolean) => ({
  background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
  color: ok ? '#22c55e' : '#f59e0b',
  border: `1px solid ${ok ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
  borderRadius: 999,
  padding: '2px 10px',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap' as const,
})

export default function SetupPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [envText, setEnvText] = useState('')

  const load = async () => {
    const r = await fetch('/api/setup', { cache: 'no-store' })
    if (r.ok) setStatus(await r.json())
  }

  useEffect(() => { load() }, [])

  const claim = async () => {
    setBusy(true); setMsg('')
    const r = await authFetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim' }),
    })
    const d = await r.json()
    if (d.success) { await load(); setMsg('You are now the operator.') }
    else setMsg(d.error || 'Failed')
    setBusy(false)
  }

  const importEnv = async () => {
    setBusy(true); setMsg('')
    const r = await authFetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import', envText }),
    })
    const d = await r.json()
    if (d.success) {
      setEnvText('')
      await load()
      setMsg(`Imported: ${d.imported.length ? d.imported.join(', ') : 'none'}${d.skipped?.length ? ` · Ignored: ${d.skipped.join(', ')}` : ''}`)
    } else {
      setMsg(d.error || 'Failed')
    }
    setBusy(false)
  }

  if (!status) {
    return <div style={{ padding: 48, color: 'var(--text-muted)' }}>Loading...</div>
  }

  const allBootstrapOk = status.bootstrap.every(b => b.set)
  const encryptionGreen = status.encryption.localOk && status.encryption.storedOk !== false
  const requiredConfigured = status.secrets.find(s => s.key === 'cron_secret')?.configured
  const platformReady = allBootstrapOk && encryptionGreen && status.operatorClaimed && requiredConfigured

  return (
    <div style={{ padding: '32px 24px', maxWidth: 880, margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Setup</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
          One screen to take this from a fresh deploy to production-ready. No copy-pasting through dashboards.
        </p>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Platform Status</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
            {platformReady ? 'Production-ready' : 'Setup incomplete'}
          </div>
        </div>
        <span style={PILL(platformReady)}>{platformReady ? 'READY' : 'ACTION NEEDED'}</span>
      </div>

      {msg && (
        <div className="card" style={{ padding: 12, marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>{msg}</div>
      )}

      {/* Step 1: bootstrap env */}
      <Section title="1. Bootstrap environment variables" hint="These must be set in the host environment (Vercel project env vars, or your dev .env). Everything else can live in the database.">
        <div style={{ display: 'grid', gap: 6 }}>
          {status.bootstrap.map(b => (
            <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <code style={{ fontSize: 12 }}>{b.name}</code>
              <span style={PILL(b.set)}>{b.set ? 'Set' : 'Missing'}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Step 2: encryption */}
      <Section title="2. Encryption key" hint="Confirms REVGUARD_ENCRYPTION_KEY can both encrypt new values and decrypt existing ones. If 'Stored decrypt' fails, your dev and production keys disagree.">
        <Row label="Local round-trip" ok={status.encryption.localOk} />
        <Row label="Stored decrypt" ok={status.encryption.storedOk === null ? true : status.encryption.storedOk} note={status.encryption.storedOk === null ? 'no secrets yet' : ''} />
      </Section>

      {/* Step 3: claim operator */}
      <Section title="3. Claim operator access" hint="The operator email controls /admin/secrets and /setup. First sign-in claims it.">
        {!status.signedIn ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Sign in first to claim operator access.</p>
        ) : status.operatorClaimed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span style={PILL(true)}>Claimed</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {status.isOperator ? `You (${status.userEmail}) are the operator.` : `Operator is ${status.operatorEmail}. You (${status.userEmail}) are not.`}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Make {status.userEmail} the operator?</div>
            <button className="btn-primary" disabled={busy} onClick={claim}>Claim operator</button>
          </div>
        )}
      </Section>

      {/* Step 4: import .env */}
      {status.isOperator && (
        <Section title="4. Bulk-import secrets" hint="Paste your existing .env. Lines that match a known key are stored encrypted in Supabase and propagate to every environment.">
          <textarea
            value={envText}
            onChange={e => setEnvText(e.target.value)}
            placeholder={'OPENAI_API_KEY=sk-...\nRESEND_API_KEY=re_...\nALERT_EMAIL=ops@example.com\nCRON_SECRET=...\n# unrelated lines are ignored'}
            rows={8}
            style={{
              width: '100%', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 12,
              background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn-primary" disabled={busy || !envText.trim()} onClick={importEnv}>Import</button>
            <a className="btn-secondary" href="/admin/secrets" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Or edit one-by-one
            </a>
          </div>
        </Section>
      )}

      {/* Step 5: secrets summary */}
      <Section title="5. Configured secrets" hint="Everything below is stored encrypted in app_secrets and shared between dev and production.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
          {status.secrets.map(s => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{SECRET_LABELS[s.key] || s.key}</div>
                <code style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.key}</code>
              </div>
              <span style={PILL(s.configured)}>{s.configured ? 'Set' : 'Missing'}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="card" style={{ padding: 18, marginTop: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>{hint}</div>
      {children}
    </section>
  )
}

function Row({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 6 }}>
      <div style={{ fontSize: 13 }}>{label} {note && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>· {note}</span>}</div>
      <span style={PILL(ok)}>{ok ? 'OK' : 'Fail'}</span>
    </div>
  )
}
