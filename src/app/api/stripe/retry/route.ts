import { NextResponse, NextRequest } from 'next/server'
import { getStripeForUser, safeStripeError } from '@/lib/stripe'
import { logRecoveryAction, createAlert } from '@/lib/db'
import { apiGuard } from '@/lib/apiGuard'
import { logError } from '@/lib/logger'
import { validateBody, isString } from '@/lib/validate'

export async function POST(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'stripe_retry', max: 10, windowMs: 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  const verifiedUserId = guard.userId!
  try {
    const body = await req.json()
    const validation = validateBody(body, { invoiceId: isString })
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
    const { invoiceId } = validation.value

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
    const safeMsg = safeStripeError(err, 'Retry failed')
    logError('stripe_retry_failed', { userId: verifiedUserId }, err)
    try {
      await logRecoveryAction({
        userId: verifiedUserId,
        invoiceId: 'unknown',
        amount: 0,
        currency: 'USD',
        action: 'manual_retry',
        status: 'failed',
        result: safeMsg,
      })
    } catch {}

    return NextResponse.json({ error: safeMsg }, { status: 400 })
  }
}
