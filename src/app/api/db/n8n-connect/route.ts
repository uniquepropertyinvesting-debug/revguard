import { NextResponse, NextRequest } from 'next/server'
import { saveN8nConnection, getN8nConnection, recordAuditEvent } from '@/lib/db'
import { apiGuard } from '@/lib/apiGuard'
import { getVerifiedUserId } from '@/lib/serverAuth'
import { logError } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId(req)
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const conn = await getN8nConnection(userId)
    if (!conn) return NextResponse.json({ connected: false })
    return NextResponse.json({
      connected: true,
      instanceUrl: conn.instance_url,
      hasApiKey: !!conn.api_key,
      hasWebhookSecret: !!conn.webhook_secret,
      isActive: conn.is_active,
      lastHeartbeatAt: conn.last_heartbeat_at,
    })
  } catch (err: unknown) {
    logError('n8n_connect_get_failed', undefined, err)
    return NextResponse.json({ error: 'Failed to load connection' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'n8n_connect', max: 5, windowMs: 10 * 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  const userId = guard.userId!

  try {
    const { instanceUrl, apiKey, webhookSecret } = await req.json()
    if (!instanceUrl || typeof instanceUrl !== 'string') {
      return NextResponse.json({ error: 'instanceUrl required' }, { status: 400 })
    }
    let parsed: URL
    try {
      parsed = new URL(instanceUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid instanceUrl' }, { status: 400 })
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return NextResponse.json({ error: 'instanceUrl must be http(s)' }, { status: 400 })
    }
    if (apiKey !== undefined && apiKey !== '' && typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'Invalid apiKey' }, { status: 400 })
    }
    if (webhookSecret !== undefined && webhookSecret !== '' && typeof webhookSecret !== 'string') {
      return NextResponse.json({ error: 'Invalid webhookSecret' }, { status: 400 })
    }

    await saveN8nConnection(
      userId,
      parsed.toString().replace(/\/$/, ''),
      apiKey || undefined,
      webhookSecret || undefined,
    )

    await recordAuditEvent({
      userId,
      action: 'n8n_connection_updated',
      resourceType: 'n8n_connection',
      details: { hasApiKey: !!apiKey, hasWebhookSecret: !!webhookSecret },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    logError('n8n_connect_save_failed', { userId }, err)
    return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
  }
}
