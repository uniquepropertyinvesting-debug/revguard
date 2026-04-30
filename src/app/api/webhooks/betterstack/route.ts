import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto'
import { logError, logInfo } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface BetterStackPayload {
  data?: {
    id?: string
    attributes?: {
      name?: string
      url?: string
      cause?: string
      started_at?: string
      resolved_at?: string | null
      status?: string
    }
  }
  event?: string
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return nodeTimingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

function safeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

/**
 * Verify the request body against the configured secret. Prefers HMAC (x-webhook-signature
 * header containing a hex SHA-256 digest of the raw body) and falls back to a constant-time
 * compare on a static secret header for legacy / static-secret BetterStack configs.
 */
export function verifySignature(rawBody: string, headers: Headers, secret: string): boolean {
  const sigHeader = headers.get('x-webhook-signature') || headers.get('x-signature') || ''
  if (sigHeader) {
    const provided = sigHeader.startsWith('sha256=') ? sigHeader.slice(7) : sigHeader
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    return safeEqualHex(provided.toLowerCase(), expected)
  }
  const staticSecret = headers.get('x-webhook-secret') || ''
  if (staticSecret) {
    return safeEqualString(staticSecret, secret)
  }
  return false
}

export async function POST(req: NextRequest) {
  const expected = process.env.BETTERSTACK_WEBHOOK_SECRET
  if (!expected) {
    logError('betterstack_webhook_misconfigured', { reason: 'secret_missing' })
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  const rawBody = await req.text()

  if (!verifySignature(rawBody, req.headers, expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: BetterStackPayload
  try {
    body = JSON.parse(rawBody) as BetterStackPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const externalId = body.data?.id
  if (!externalId) {
    return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 })
  }

  const attrs = body.data?.attributes || {}
  const event = body.event || ''
  const isResolved = event.includes('resolved') || Boolean(attrs.resolved_at)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    logError('betterstack_webhook_db_unconfigured', {})
    return NextResponse.json({ ok: false, error: 'db_unavailable' }, { status: 503 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const monitorName = (attrs.name || attrs.url || 'unknown').slice(0, 200)
  const summary = (attrs.cause || event || '').slice(0, 1000)
  const startedAt = attrs.started_at || new Date().toISOString()
  const resolvedAt = isResolved ? attrs.resolved_at || new Date().toISOString() : null
  const status = isResolved ? 'resolved' : (attrs.status || 'investigating').slice(0, 50)

  const { error } = await supabase.from('incidents').upsert(
    {
      provider: 'betterstack',
      external_id: externalId,
      monitor_name: monitorName,
      summary,
      status,
      started_at: startedAt,
      resolved_at: resolvedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'provider,external_id' },
  )

  if (error) {
    logError('betterstack_webhook_upsert_failed', { externalId }, error)
    return NextResponse.json({ ok: false, error: 'db_write_failed' }, { status: 500 })
  }

  logInfo('betterstack_webhook_received', { externalId, event, status })
  return NextResponse.json({ ok: true })
}
