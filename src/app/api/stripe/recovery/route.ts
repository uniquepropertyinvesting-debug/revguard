import { NextRequest, NextResponse } from 'next/server'
import { getStripeForUser } from '@/lib/stripe'
import { getVerifiedUserId } from '@/lib/serverAuth'

async function paginate<T>(iter: AsyncIterable<T>, maxItems = 2000): Promise<T[]> {
  const results: T[] = []
  for await (const item of iter) {
    results.push(item)
    if (results.length >= maxItems) break
  }
  return results
}

export async function GET(req: NextRequest) {
  const userId = (await getVerifiedUserId(req)) ?? undefined
  const stripe = getStripeForUser(userId)
  try {
    const [charges, invoices, customers] = await Promise.all([
      paginate(stripe.charges.list({ limit: 100 })),
      paginate(stripe.invoices.list({ limit: 100 })),
      paginate(stripe.customers.list({ limit: 100 })),
    ])

    const customerMap = new Map(customers.map(c => [c.id, c]))

    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    // --- Recovery stats from charges ---
    const recentCharges = charges.filter(c => c.created * 1000 >= thirtyDaysAgo)
    const failedCharges = recentCharges.filter(c => c.status === 'failed')
    const succeededCharges = recentCharges.filter(c => c.status === 'succeeded')
    const totalSucceeded = succeededCharges.reduce((s, c) => s + c.amount, 0) / 100
    const totalFailed = failedCharges.reduce((s, c) => s + c.amount, 0) / 100

    // --- Open invoices eligible for retry ---
    const openInvoices = invoices.filter(inv =>
      inv.status === 'open' && inv.attempt_count > 0
    )

    const retryEligible = openInvoices.map(inv => {
      const customerId = typeof inv.customer === 'string' ? inv.customer : ''
      const customer = customerMap.get(customerId)
      return {
        id: inv.id,
        customerId,
        customerName: customer?.name || customer?.email || 'Unknown',
        customerEmail: customer?.email || '',
        amount: (inv.amount_due || 0) / 100,
        currency: (inv.currency || 'usd').toUpperCase(),
        attempts: inv.attempt_count,
        nextPaymentAttempt: inv.next_payment_attempt
          ? new Date(inv.next_payment_attempt * 1000).toISOString()
          : null,
        hostedUrl: inv.hosted_invoice_url,
        created: new Date(inv.created * 1000).toISOString(),
      }
    })

    // --- Recovery history (last 20 succeeded charges after previous failure) ---
    const customerChargeMap = new Map<string, typeof charges>()
    charges.forEach(c => {
      const cid = typeof c.customer === 'string' ? c.customer : 'unknown'
      if (!customerChargeMap.has(cid)) customerChargeMap.set(cid, [])
      customerChargeMap.get(cid)!.push(c)
    })

    const recoveries: any[] = []
    customerChargeMap.forEach((cCharges, cid) => {
      const sorted = [...cCharges].sort((a, b) => b.created - a.created)
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].status === 'succeeded' && sorted[i + 1].status === 'failed') {
          const customer = customerMap.get(cid)
          recoveries.push({
            id: sorted[i].id,
            customerName: customer?.name || customer?.email || sorted[i].billing_details?.email || 'Unknown',
            customerEmail: customer?.email || sorted[i].billing_details?.email || '',
            amount: sorted[i].amount / 100,
            currency: sorted[i].currency.toUpperCase(),
            recoveredAt: new Date(sorted[i].created * 1000).toISOString(),
            method: sorted[i].payment_method_details?.type || 'card',
          })
        }
      }
    })

    // Success rate
    const totalAttempts = recentCharges.length
    const successRate = totalAttempts > 0
      ? ((succeededCharges.length / totalAttempts) * 100).toFixed(1)
      : '0'

    return NextResponse.json({
      stats: {
        totalRecovered: totalSucceeded,
        totalAtRisk: totalFailed,
        successRate,
        retryEligibleCount: retryEligible.length,
        retryEligibleAmount: retryEligible.reduce((s, i) => s + i.amount, 0),
      },
      retryEligible,
      recoveries: recoveries.slice(0, 20),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
