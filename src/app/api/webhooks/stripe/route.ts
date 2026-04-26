import { NextResponse, NextRequest } from 'next/server'
import Stripe from 'stripe'
import { saveWebhookEvent, createAlert, logRecoveryAction } from '@/lib/db'
import { getStripeForUser, getWebhookSecretForUser } from '@/lib/stripe'

async function sendAlertEmail(alertType: string, title: string, message: string, severity: string, amount?: number) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173'
    await fetch(`${base}/api/alerts/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertType, title, message, severity, amount }),
    })
  } catch { /* email is best-effort */ }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  // userId can be passed as a query param when registering the webhook endpoint,
  // e.g. /api/webhooks/stripe?userId=xxx — this routes the event to the right tenant.
  // Falls back to env credentials if not provided (single-tenant / dev mode).
  const userId = req.nextUrl.searchParams.get('userId') || undefined

  const webhookSecret = await getWebhookSecretForUser(userId)
  const stripe = await getStripeForUser(userId)

  let event: Stripe.Event

  // Verify webhook signature if secret is set
  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Webhook verification failed'
      console.error('Webhook signature verification failed:', message)
      return NextResponse.json({ error: message }, { status: 400 })
    }
  } else {
    // Accept without verification in dev (no webhook secret set)
    try {
      event = JSON.parse(body) as Stripe.Event
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
  }

  // Save raw event to DB (scoped to tenant)
  await saveWebhookEvent(event.id, event.type, event, userId)

  // Handle specific events
  try {
    switch (event.type) {

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const amount = pi.amount / 100
        const severity = amount >= 1000 ? 'critical' : 'warning'
        const title = 'Payment Failed'
        const message = `Payment of $${amount.toFixed(2)} failed. Reason: ${pi.last_payment_error?.message || 'Unknown'}`
        await createAlert({ userId, type: 'payment_failed', severity, title, message, metadata: { paymentIntentId: pi.id, amount, customerId: pi.customer } })
        sendAlertEmail('payment_failed', title, message, severity, amount)
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const amount = (inv.amount_due || 0) / 100
        const severity2 = amount >= 500 ? 'critical' : 'warning'
        const title2 = 'Invoice Payment Failed'
        const msg2 = `Invoice #${inv.number || inv.id.slice(0, 8)} for $${amount.toFixed(2)} failed after ${inv.attempt_count} attempt(s)`
        await createAlert({ userId, type: 'invoice_failed', severity: severity2, title: title2, message: msg2, metadata: { invoiceId: inv.id, amount, customerId: inv.customer, attempts: inv.attempt_count } })
        sendAlertEmail('invoice_failed', title2, msg2, severity2, amount)
        await logRecoveryAction({
          userId,
          invoiceId: inv.id,
          customerId: typeof inv.customer === 'string' ? inv.customer : undefined,
          amount,
          currency: inv.currency?.toUpperCase() || 'USD',
          action: 'auto_detected',
          status: 'pending',
          result: `Invoice payment failed — ${inv.attempt_count} attempts`,
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice
        const amount = (inv.amount_paid || 0) / 100
        if (inv.attempt_count > 1) {
          const recTitle = 'Payment Recovered'
          const recMsg = `Invoice of $${amount.toFixed(2)} successfully recovered after ${inv.attempt_count} attempt(s)`
          await createAlert({ userId, type: 'payment_recovered', severity: 'success', title: recTitle, message: recMsg, metadata: { invoiceId: inv.id, amount, customerId: inv.customer } })
          sendAlertEmail('payment_recovered', recTitle, recMsg, 'success', amount)
          await logRecoveryAction({
            userId,
            invoiceId: inv.id,
            customerId: typeof inv.customer === 'string' ? inv.customer : undefined,
            amount,
            currency: inv.currency?.toUpperCase() || 'USD',
            action: 'stripe_retry',
            status: 'success',
            result: `Recovered on attempt ${inv.attempt_count}`,
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const mrr = sub.items.data.reduce(
          (sum, i) => sum + (i.price.unit_amount || 0) * (i.quantity || 1), 0
        ) / 100
        await createAlert({
          userId,
          type: 'subscription_canceled',
          severity: mrr >= 500 ? 'critical' : 'warning',
          title: 'Subscription Canceled',
          message: `Subscription canceled — $${mrr.toFixed(2)}/mo MRR lost`,
          metadata: { subscriptionId: sub.id, mrr, customerId: sub.customer },
        })
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        if (sub.status === 'past_due') {
          await createAlert({
            userId,
            type: 'subscription_past_due',
            severity: 'warning',
            title: 'Subscription Past Due',
            message: `Subscription is now past due — payment needed to keep service active`,
            metadata: { subscriptionId: sub.id, customerId: sub.customer },
          })
        }
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const amount = dispute.amount / 100
        await createAlert({
          userId,
          type: 'dispute_created',
          severity: 'critical',
          title: 'Chargeback / Dispute Created',
          message: `Dispute of $${amount.toFixed(2)} created — respond within 7 days to avoid losing funds`,
          metadata: { disputeId: dispute.id, amount, chargeId: dispute.charge },
        })
        break
      }

      default:
        // Log but don't process
        break
    }
  } catch (err) {
    console.error('Error processing webhook event:', err)
  }

  return NextResponse.json({ received: true })
}
