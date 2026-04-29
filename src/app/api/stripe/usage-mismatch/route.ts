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
    const [subscriptions, customers, invoices] = await Promise.all([
      paginate(stripe.subscriptions.list({ limit: 100, status: 'active' })),
      paginate(stripe.customers.list({ limit: 100 })),
      paginate(stripe.invoices.list({ limit: 100 })),
    ])

    const customerMap = new Map(customers.map(c => [c.id, c]))

    // Build invoice history per customer: count invoices and total spend
    const customerInvoiceMap = new Map<string, { count: number; total: number; lastAmount: number }>()
    invoices.forEach(inv => {
      const cid = typeof inv.customer === 'string' ? inv.customer : ''
      if (!cid) return
      const existing = customerInvoiceMap.get(cid) || { count: 0, total: 0, lastAmount: 0 }
      customerInvoiceMap.set(cid, {
        count: existing.count + 1,
        total: existing.total + (inv.amount_paid || 0),
        lastAmount: inv.amount_due || existing.lastAmount,
      })
    })

    const mismatches: any[] = []

    for (const sub of subscriptions) {
      const customerId = typeof sub.customer === 'string' ? sub.customer : ''
      const customer = customerMap.get(customerId)
      const invoiceHistory = customerInvoiceMap.get(customerId)

      for (const item of sub.items.data) {
        const price = item.price
        const quantity = item.quantity || 1
        const unitAmount = price.unit_amount || 0
        const mrr = (unitAmount * quantity) / 100

        let mismatchType: string | null = null
        let contracted = ''
        let actual = ''
        let overage = ''
        let revenueImpact = 0
        let risk: 'high' | 'medium' | 'low' = 'low'

        // Check for metered/usage-based pricing
        if (price.billing_scheme === 'tiered' || price.recurring?.usage_type === 'metered') {
          const expectedMRR = mrr
          const actualSpend = invoiceHistory ? invoiceHistory.total / 100 / Math.max(invoiceHistory.count, 1) : 0

          if (actualSpend < expectedMRR * 0.5 && expectedMRR > 10) {
            mismatchType = 'Underutilization'
            contracted = `${price.nickname || price.id} — ${fmt(expectedMRR)}/mo`
            actual = `Avg invoice: ${fmt(actualSpend)}/mo`
            overage = `${fmt(expectedMRR - actualSpend)} undercharge`
            revenueImpact = expectedMRR - actualSpend
            risk = revenueImpact > 500 ? 'high' : revenueImpact > 100 ? 'medium' : 'low'
          }
        }

        // Check for high-quantity seat plans
        if (quantity > 10 && price.recurring?.interval === 'month') {
          const perSeatPrice = unitAmount / 100
          if (quantity > 50) {
            mismatchType = 'High Seat Count'
            contracted = `${quantity} seats @ ${fmt(perSeatPrice)}/seat`
            actual = `${quantity} active seats`
            overage = `${quantity - 10} above base tier`
            revenueImpact = (quantity - 10) * perSeatPrice
            risk = revenueImpact > 1000 ? 'high' : 'medium'
          }
        }

        // Check for large quantity discrepancy: subscription amount vs last invoice
        if (invoiceHistory && invoiceHistory.lastAmount > 0) {
          const subAmount = unitAmount * quantity
          const lastInvoiceAmount = invoiceHistory.lastAmount
          const discrepancy = subAmount - lastInvoiceAmount

          if (discrepancy > 1000 && !mismatchType) {
            mismatchType = 'Billing Discrepancy'
            contracted = `Subscription: ${fmt(subAmount / 100)}/mo`
            actual = `Last invoice: ${fmt(lastInvoiceAmount / 100)}`
            overage = `${fmt(discrepancy / 100)} gap`
            revenueImpact = discrepancy / 100
            risk = revenueImpact > 500 ? 'high' : 'medium'
          }
        }

        if (mismatchType) {
          const customerName = customer?.name || customer?.email || 'Unknown Customer'
          const customerEmail = customer?.email || ''

          mismatches.push({
            id: `${sub.id}-${item.id}`,
            customerName,
            customerEmail,
            customerId,
            subscriptionId: sub.id,
            mismatchType,
            contracted,
            actual,
            overage,
            revenueImpact,
            risk,
            mrr,
            priceName: price.nickname || price.id,
            currency: (price.currency || 'usd').toUpperCase(),
          })
        }
      }
    }

    const totalLeakage = mismatches.reduce((sum, m) => sum + m.revenueImpact, 0)

    return NextResponse.json({
      mismatches,
      summary: {
        total: mismatches.length,
        highRisk: mismatches.filter(m => m.risk === 'high').length,
        totalLeakage,
        totalSubscriptions: subscriptions.length,
      },
    })
  } catch (err: unknown) {
    logError('stripe_usage_mismatch_failed', { userId }, err)
    return NextResponse.json({ error: safeStripeError(err) }, { status: 500 })
  }
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
