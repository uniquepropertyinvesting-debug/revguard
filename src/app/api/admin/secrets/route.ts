import { NextRequest, NextResponse } from 'next/server'
import { listAppSecretKeys, setAppSecret, deleteAppSecret, recordAuditEvent } from '@/lib/db'
import { getOperatorUserId } from '@/lib/serverAuth'
import { logError } from '@/lib/logger'

const ALLOWED_KEYS = new Set([
  'openai_api_key',
  'resend_api_key',
  'alert_email',
  'operator_email',
  'cron_secret',
  'betterstack_webhook_secret',
  'sentry_dsn',
  'log_webhook_url',
])

export async function GET(req: NextRequest) {
  const userId = await getOperatorUserId(req)
  if (!userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  try {
    const rows = await listAppSecretKeys()
    return NextResponse.json({
      secrets: Array.from(ALLOWED_KEYS).map(key => {
        const row = rows.find(r => r.key === key)
        return { key, configured: !!row, updatedAt: row?.updated_at || null }
      }),
    })
  } catch (err: unknown) {
    logError('admin_secrets_list_failed', undefined, err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getOperatorUserId(req)
  if (!userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  try {
    const { key, value } = await req.json()
    if (typeof key !== 'string' || !ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: 'invalid key' }, { status: 400 })
    }
    if (typeof value !== 'string' || value.length === 0) {
      return NextResponse.json({ error: 'value required' }, { status: 400 })
    }
    if (value.length > 4096) {
      return NextResponse.json({ error: 'value too long' }, { status: 400 })
    }
    await setAppSecret(key, value)
    await recordAuditEvent({
      userId,
      action: 'app_secret_updated',
      resourceType: 'app_secret',
      details: { key },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    logError('admin_secrets_set_failed', undefined, err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getOperatorUserId(req)
  if (!userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  try {
    const key = req.nextUrl.searchParams.get('key') || ''
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: 'invalid key' }, { status: 400 })
    }
    await deleteAppSecret(key)
    await recordAuditEvent({
      userId,
      action: 'app_secret_deleted',
      resourceType: 'app_secret',
      details: { key },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    logError('admin_secrets_delete_failed', undefined, err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
