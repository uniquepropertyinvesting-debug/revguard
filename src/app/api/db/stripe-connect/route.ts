import { NextResponse, NextRequest } from 'next/server'
import { saveStripeConnection, saveWebhookSecret, getStripeConnection } from '@/lib/db'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'
import { getVerifiedUserId } from '@/lib/serverAuth'

export async function GET(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId(req)
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const connection = getStripeConnection(userId)
    if (!connection) return NextResponse.json({ connected: false })
    return NextResponse.json({
      connected: true,
      hasWebhookSecret: !!connection.webhook_secret,
      connectedAt: connection.connected_at,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, secretKey, publishableKey, webhookSecret } = await req.json()
    const verifiedUserId = (await getVerifiedUserId(req)) ?? userId
    if (!verifiedUserId || !secretKey) {
      return NextResponse.json({ error: 'userId and secretKey required' }, { status: 400 })
    }

    // Validate Stripe key format before saving
    if (!secretKey.startsWith('sk_live_') && !secretKey.startsWith('sk_test_')) {
      return NextResponse.json({ error: 'Invalid Stripe secret key format' }, { status: 400 })
    }
    if (webhookSecret && !webhookSecret.startsWith('whsec_')) {
      return NextResponse.json({ error: 'Invalid webhook secret format' }, { status: 400 })
    }

    // 5 saves per user per 10 minutes — prevents brute-force key enumeration
    const rl = rateLimit('stripe-connect', verifiedUserId, { max: 5, windowMs: 10 * 60_000 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many connection attempts — please wait 10 minutes' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    saveStripeConnection(verifiedUserId, secretKey, publishableKey, webhookSecret)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH — update only the webhook secret for an already-connected account
export async function PATCH(req: NextRequest) {
  try {
    const { userId, webhookSecret } = await req.json()
    const verifiedUserId = (await getVerifiedUserId(req)) ?? userId
    if (!verifiedUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!webhookSecret || !webhookSecret.startsWith('whsec_')) {
      return NextResponse.json({ error: 'Invalid webhook secret — must start with whsec_' }, { status: 400 })
    }

    // Ensure the user has an existing Stripe connection before saving the webhook secret
    const connection = getStripeConnection(verifiedUserId)
    if (!connection) {
      return NextResponse.json({ error: 'No Stripe account connected — add your API key first' }, { status: 400 })
    }

    const rl = rateLimit('stripe-connect', verifiedUserId, { max: 5, windowMs: 10 * 60_000 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many attempts — please wait 10 minutes' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    saveWebhookSecret(verifiedUserId, webhookSecret)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
