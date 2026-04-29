import { NextResponse, NextRequest } from 'next/server'
import { saveStripeConnection, getStripeConnection, recordAuditEvent } from '@/lib/db'
import { apiGuard } from '@/lib/apiGuard'
import { getVerifiedUserId } from '@/lib/serverAuth'
import { logError } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId(req)
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const connection = await getStripeConnection(userId)
    if (!connection) return NextResponse.json({ connected: false })
    return NextResponse.json({
      connected: true,
      hasWebhookSecret: !!connection.webhook_secret,
      connectedAt: connection.connected_at,
    })
  } catch (err: unknown) {
    logError('stripe_connect_get_failed', undefined, err)
    return NextResponse.json({ error: 'Failed to load connection' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'stripe_connect', max: 5, windowMs: 10 * 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  const verifiedUserId = guard.userId!

  try {
    const { secretKey, publishableKey, webhookSecret } = await req.json()
    if (!secretKey || typeof secretKey !== 'string') {
      return NextResponse.json({ error: 'secretKey required' }, { status: 400 })
    }
    if (!secretKey.startsWith('sk_live_') && !secretKey.startsWith('sk_test_')) {
      return NextResponse.json({ error: 'Invalid Stripe secret key format' }, { status: 400 })
    }
    if (publishableKey !== undefined && publishableKey !== '' && typeof publishableKey !== 'string') {
      return NextResponse.json({ error: 'Invalid publishableKey' }, { status: 400 })
    }
    if (webhookSecret && (typeof webhookSecret !== 'string' || !webhookSecret.startsWith('whsec_'))) {
      return NextResponse.json({ error: 'Invalid webhook secret format' }, { status: 400 })
    }

    await saveStripeConnection(verifiedUserId, secretKey, publishableKey, webhookSecret)

    await recordAuditEvent({
      userId: verifiedUserId,
      action: 'stripe_connection_updated',
      resourceType: 'stripe_connection',
      details: {
        keyType: secretKey.startsWith('sk_live_') ? 'live' : 'test',
        hasWebhookSecret: !!webhookSecret,
      },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    logError('stripe_connect_save_failed', { userId: verifiedUserId }, err)
    return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
  }
}
