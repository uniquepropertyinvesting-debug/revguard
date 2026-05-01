import { NextRequest, NextResponse } from 'next/server'
import { getStripeForUser, getWebhookSecretForUser, safeStripeError } from '@/lib/stripe'
import { apiGuard } from '@/lib/apiGuard'
import { createServiceClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

interface EndpointStatus {
  id: string
  url: string
  status: string
  enabledEvents: string[]
  livemode: boolean
}

const REQUIRED_EVENTS = [
  'payment_intent.payment_failed',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
  'customer.subscription.deleted',
  'customer.subscription.updated',
  'charge.dispute.created',
]

function buildExpectedUrl(req: NextRequest, userId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (appUrl) return `${appUrl}/api/webhooks/stripe?userId=${userId}`
  const host = req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}/api/webhooks/stripe?userId=${userId}`
}

export async function GET(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'stripe_webhook_verify', max: 20, windowMs: 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  const userId = guard.userId!

  const expectedUrl = buildExpectedUrl(req, userId)
  const webhookSecret = await getWebhookSecretForUser(userId)
  const secretConfigured = !!webhookSecret

  let endpoints: EndpointStatus[] = []
  let stripeError: string | null = null
  try {
    const stripe = await getStripeForUser(userId)
    const list = await stripe.webhookEndpoints.list({ limit: 100 })
    endpoints = list.data.map(e => ({
      id: e.id,
      url: e.url,
      status: e.status,
      enabledEvents: e.enabled_events,
      livemode: e.livemode,
    }))
  } catch (err) {
    stripeError = safeStripeError(err, 'Failed to list webhook endpoints')
    logError('webhook_verify_list_failed', { userId }, err)
  }

  const matchingEndpoint = endpoints.find(e => {
    try {
      const a = new URL(e.url)
      const b = new URL(expectedUrl)
      return a.origin === b.origin && a.pathname === b.pathname
    } catch {
      return e.url === expectedUrl
    }
  }) || null

  const missingEvents = matchingEndpoint
    ? REQUIRED_EVENTS.filter(ev =>
        !matchingEndpoint.enabledEvents.includes(ev) &&
        !matchingEndpoint.enabledEvents.includes('*'))
    : REQUIRED_EVENTS

  let lastEventAt: string | null = null
  let recentEventCount = 0
  try {
    const db = createServiceClient()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString()
    const { data: latest } = await db
      .from('webhook_events')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    lastEventAt = latest?.created_at ?? null

    const { count } = await db
      .from('webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo)
    recentEventCount = count ?? 0
  } catch (err) {
    logError('webhook_verify_db_query_failed', { userId }, err)
  }

  const status: 'ok' | 'partial' | 'missing' =
    !matchingEndpoint || !secretConfigured
      ? 'missing'
      : missingEvents.length > 0 || recentEventCount === 0
        ? 'partial'
        : 'ok'

  return NextResponse.json({
    status,
    expectedUrl,
    secretConfigured,
    endpointFound: !!matchingEndpoint,
    matchingEndpoint,
    endpoints,
    requiredEvents: REQUIRED_EVENTS,
    missingEvents,
    recentEventCount,
    lastEventAt,
    stripeError,
  })
}
