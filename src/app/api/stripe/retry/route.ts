import { NextResponse, NextRequest } from 'next/server'
import { getStripeForUser } from '@/lib/stripe'
import { logRecoveryAction, createAlert } from '@/lib/db'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'
import { getVerifiedUserId } from '@/lib/serverAuth'

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json()
    const verifiedUserId = (await getVerifiedUserId(req)) ?? undefined
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
    }

    // 10 retries per user per minute — prevents Stripe fee abuse
    const rl = rateLimit('retry', verifiedUserId || req.ip || 'anon', { max: 10, windowMs: 60_000 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many retry requests — please wait a minute' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    const stripe = await getStripeForUser(verifiedUserId)

    // Attempt to pay the invoice now via Stripe
    const result = await stripe.invoices.pay(invoiceId)
    const amount = (result.amount_paid || 0) / 100

    // Log the successful recovery to DB
    await logRecoveryAction({
      userId: verifiedUserId,
      invoiceId,
      amount,
      currency: result.currency?.toUpperCase() || 'USD',
      action: 'manual_retry',
      status: 'success',
      result: `Manually retried and recovered $${amount.toFixed(2)}`,
    })

    await createAlert({
      userId: verifiedUserId,
      type: 'payment_recovered',
      severity: 'success',
      title: 'Payment Recovered',
      message: `Manual retry succeeded — $${amount.toFixed(2)} recovered`,
      metadata: { invoiceId, amount },
    })

    return NextResponse.json({
      success: true,
      status: result.status,
      amount,
      currency: result.currency?.toUpperCase(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error'

    // Log the failed retry attempt
    try {
      const body = await (err as any)?.raw ? JSON.parse('{}') : {}
      await logRecoveryAction({
        invoiceId: 'unknown',
        amount: 0,
        currency: 'USD',
        action: 'manual_retry',
        status: 'failed',
        result: message,
      })
    } catch {}

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
