import { NextResponse, NextRequest } from 'next/server'
import { getN8nConnection, saveN8nConnection, getN8nWorkflowRuns, getN8nWorkflowStats } from '@/lib/db'
import { getVerifiedUserId } from '@/lib/serverAuth'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

export async function GET(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const connection = await getN8nConnection(userId)
    const stats = await getN8nWorkflowStats(userId)
    const runs = await getN8nWorkflowRuns(userId, 20)

    return NextResponse.json({
      connected: !!connection?.is_active,
      instanceUrl: connection?.instance_url || null,
      hasApiKey: !!connection?.api_key,
      hasWebhookSecret: !!connection?.webhook_secret,
      lastHeartbeat: connection?.last_heartbeat_at || null,
      stats,
      runs,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = rateLimit('n8n-connect', userId, { max: 5, windowMs: 10 * 60_000 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many connection attempts' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    const { instanceUrl, apiKey, webhookSecret } = await req.json()

    if (!instanceUrl || typeof instanceUrl !== 'string') {
      return NextResponse.json({ error: 'Instance URL is required' }, { status: 400 })
    }

    try {
      new URL(instanceUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    await saveN8nConnection(userId, { instanceUrl, apiKey, webhookSecret })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
