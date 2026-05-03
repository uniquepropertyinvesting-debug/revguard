import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { listAppSecretKeys, setAppSecret, getAppSecret, recordAuditEvent } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const KNOWN = [
  'openai_api_key',
  'resend_api_key',
  'alert_email',
  'operator_email',
  'cron_secret',
  'betterstack_webhook_secret',
  'sentry_dsn',
  'log_webhook_url',
] as const

const ENV_TO_SECRET: Record<string, string> = {
  OPENAI_API_KEY: 'openai_api_key',
  RESEND_API_KEY: 'resend_api_key',
  ALERT_EMAIL: 'alert_email',
  OPERATOR_EMAIL: 'operator_email',
  CRON_SECRET: 'cron_secret',
  BETTERSTACK_WEBHOOK_SECRET: 'betterstack_webhook_secret',
  SENTRY_DSN: 'sentry_dsn',
  LOG_WEBHOOK_URL: 'log_webhook_url',
}

const BOOTSTRAP_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'REVGUARD_ENCRYPTION_KEY',
  'NEXT_PUBLIC_APP_URL',
]

async function getSignedInUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getOperatorEmail(): Promise<string | null> {
  return (
    process.env.OPERATOR_EMAIL ||
    (await getAppSecret('operator_email')) ||
    null
  )
}

async function isOperator(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  const op = await getOperatorEmail()
  return !!op && op.toLowerCase() === email.toLowerCase()
}

export async function GET() {
  try {
    const user = await getSignedInUser()
    const operatorEmail = await getOperatorEmail()
    const operatorClaimed = !!operatorEmail
    const isOp = await isOperator(user?.email)

    const bootstrap = BOOTSTRAP_VARS.map(name => ({ name, set: !!process.env[name] }))

    let encryptionOk = false
    let encryptionDetail = ''
    try {
      const sample = `probe-${Date.now()}`
      encryptionOk = decrypt(encrypt(sample)) === sample
    } catch (e: unknown) {
      encryptionDetail = e instanceof Error ? e.message : 'failed'
    }

    let storedDecryptOk: boolean | null = null
    try {
      const db = createServiceClient()
      const { data } = await db.from('app_secrets').select('value').limit(1).maybeSingle()
      if (data) {
        decrypt(data.value)
        storedDecryptOk = true
      }
    } catch {
      storedDecryptOk = false
    }

    const rows = await listAppSecretKeys()
    const secrets = KNOWN.map(key => ({
      key,
      configured: rows.some(r => r.key === key),
    }))

    return NextResponse.json({
      signedIn: !!user,
      userEmail: user?.email || null,
      operatorClaimed,
      operatorEmail: isOp ? operatorEmail : (operatorClaimed ? '(set)' : null),
      isOperator: isOp,
      bootstrap,
      encryption: { localOk: encryptionOk, storedOk: storedDecryptOk, detail: encryptionDetail },
      secrets,
    })
  } catch (err: unknown) {
    logError('setup_status_failed', undefined, err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

/**
 * POST handles two actions:
 *   - { action: 'claim' }                                 first-run operator claim
 *   - { action: 'import', envText: '...' }                bulk-import secrets from .env paste
 *   - { action: 'set', key, value }                       single-secret update
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSignedInUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'sign_in_required' }, { status: 401 })
    }

    const body = await req.json()
    const action = body?.action

    if (action === 'claim') {
      const existing = await getOperatorEmail()
      if (existing) {
        return NextResponse.json({ error: 'already_claimed' }, { status: 409 })
      }
      await setAppSecret('operator_email', user.email)
      await recordAuditEvent({
        userId: user.id,
        action: 'operator_claimed',
        resourceType: 'app_secret',
        details: { email: user.email },
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
      })
      return NextResponse.json({ success: true, operatorEmail: user.email })
    }

    if (!(await isOperator(user.email))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    if (action === 'import') {
      const envText: string = typeof body?.envText === 'string' ? body.envText : ''
      if (!envText.trim()) {
        return NextResponse.json({ error: 'empty' }, { status: 400 })
      }
      const imported: string[] = []
      const skipped: string[] = []
      for (const rawLine of envText.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq < 1) continue
        const name = line.slice(0, eq).trim()
        let value = line.slice(eq + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (!value) continue
        const secretKey = ENV_TO_SECRET[name]
        if (!secretKey) {
          skipped.push(name)
          continue
        }
        if (value.length > 4096) {
          skipped.push(name)
          continue
        }
        await setAppSecret(secretKey, value)
        imported.push(secretKey)
      }
      await recordAuditEvent({
        userId: user.id,
        action: 'app_secrets_bulk_import',
        resourceType: 'app_secret',
        details: { imported, skipped },
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
      })
      return NextResponse.json({ success: true, imported, skipped })
    }

    if (action === 'set') {
      const key = body?.key
      const value = body?.value
      if (typeof key !== 'string' || !(KNOWN as readonly string[]).includes(key)) {
        return NextResponse.json({ error: 'invalid_key' }, { status: 400 })
      }
      if (typeof value !== 'string' || !value || value.length > 4096) {
        return NextResponse.json({ error: 'invalid_value' }, { status: 400 })
      }
      await setAppSecret(key, value)
      await recordAuditEvent({
        userId: user.id,
        action: 'app_secret_updated',
        resourceType: 'app_secret',
        details: { key },
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  } catch (err: unknown) {
    logError('setup_action_failed', undefined, err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
