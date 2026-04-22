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
    const [charges, customers, subscriptions] = await Promise.all([
      paginate(stripe.charges.list({ limit: 100 })),
      paginate(stripe.customers.list({ limit: 100 })),
      paginate(stripe.subscriptions.list({ limit: 100, status: 'all' })),
    ])

    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    const recentCharges = charges.filter(c => c.created * 1000 >= thirtyDaysAgo)
    const failedCharges = recentCharges.filter(c => c.status === 'failed')
    const succeededCharges = recentCharges.filter(c => c.status === 'succeeded')

    const totalRevenue = succeededCharges.reduce((sum, c) => sum + c.amount, 0)
    const failedRevenue = failedCharges.reduce((sum, c) => sum + c.amount, 0)

    const activeSubscriptions = subscriptions.filter(s => s.status === 'active')
    const canceledSubscriptions = subscriptions.filter(s => s.status === 'canceled')
    const pastDueSubscriptions = subscriptions.filter(s => s.status === 'past_due')

    const mrr = activeSubscriptions.reduce((sum, s) => {
      const amount = s.items.data.reduce((a, i) => a + (i.price.unit_amount || 0) * (i.quantity || 1), 0)
      return sum + amount
    }, 0)

    // Build 6-month chart — group all charges by YYYY-MM bucket
    const sixMonthsAgo = now - 6 * 30 * 24 * 60 * 60 * 1000
    const chartCharges = charges.filter(c => c.created * 1000 >= sixMonthsAgo)
    const buckets: Record<string, { label: string; succeeded: number; failed: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now - i * 30 * 24 * 60 * 60 * 1000)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('default', { month: 'short' })
      buckets[key] = { label, succeeded: 0, failed: 0 }
    }
    chartCharges.forEach(c => {
      const d = new Date(c.created * 1000)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (buckets[key]) {
        if (c.status === 'succeeded') buckets[key].succeeded += c.amount / 100
        else if (c.status === 'failed') buckets[key].failed += c.amount / 100
      }
    })
    const monthlyChart = Object.values(buckets)

    return NextResponse.json({
      totalRevenue: totalRevenue / 100,
      failedRevenue: failedRevenue / 100,
      failedCount: failedCharges.length,
      succeededCount: succeededCharges.length,
      totalCustomers: customers.length,
      activeSubscriptions: activeSubscriptions.length,
      canceledSubscriptions: canceledSubscriptions.length,
      pastDueSubscriptions: pastDueSubscriptions.length,
      mrr: mrr / 100,
      recoveryRate: recentCharges.length > 0
        ? ((succeededCharges.length / recentCharges.length) * 100).toFixed(1)
        : '0',
      monthlyChart,
    })
  } catch (err: unknown) {
    console.error('[stripe/overview] Error:', err instanceof Error ? err.stack : err)
    const message = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
