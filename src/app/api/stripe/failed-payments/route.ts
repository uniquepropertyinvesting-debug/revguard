import { NextRequest, NextResponse } from 'next/server'
import { getStripeForUser, safeStripeError } from '@/lib/stripe'
import { getVerifiedUserId } from '@/lib/serverAuth'
import { logError } from '@/lib/logger'

async function paginate<T>(iter: AsyncIterable<T>, maxItems = 2000): Promise<T[]> {
  const results: T[] = []
  for await (const item of iter) {
    results.push(item)
    if (results.length >= maxItems) break
  }
  return results
}

export async function GET(req: NextRequest) {
  const userId = await getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const stripe = await getStripeForUser(userId)
  try {
    const allCharges = await paginate(stripe.charges.list({ limit: 100 }))
    const failed = allCharges.filter(c => c.status === 'failed')

    const result = await Promise.all(
      failed.map(async (charge) => {
        let customerEmail = charge.billing_details?.email || 'Unknown'
        let customerName = charge.billing_details?.name || 'Unknown'

        if (charge.customer && typeof charge.customer === 'string') {
          try {
            const customer = await stripe.customers.retrieve(charge.customer)
            if (customer && !('deleted' in customer)) {
              customerEmail = customer.email || customerEmail
              customerName = customer.name || customerName
            }
          } catch {}
        }

        return {
          id: charge.id,
          amount: charge.amount / 100,
          currency: charge.currency.toUpperCase(),
          customerEmail,
          customerName,
          failureMessage: charge.failure_message || 'Payment declined',
          failureCode: charge.failure_code || 'generic_decline',
          created: new Date(charge.created * 1000).toISOString(),
          paymentMethod: charge.payment_method_details?.type || 'card',
        }
      })
    )

    return NextResponse.json({ failed: result })
  } catch (err: unknown) {
    logError('stripe_failed_payments_failed', { userId }, err)
    return NextResponse.json({ error: safeStripeError(err) }, { status: 500 })
  }
}
