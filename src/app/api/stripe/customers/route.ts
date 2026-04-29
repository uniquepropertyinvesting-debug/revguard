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
    const [customers, subscriptions] = await Promise.all([
      paginate(stripe.customers.list({ limit: 100 })),
      paginate(stripe.subscriptions.list({ limit: 100, status: 'all' })),
    ])

    const subMap = new Map<string, typeof subscriptions[0]>()
    subscriptions.forEach(s => {
      if (typeof s.customer === 'string') subMap.set(s.customer, s)
    })

    const result = customers.map(c => {
      const sub = subMap.get(c.id)
      return {
        id: c.id,
        name: c.name || 'Unknown',
        email: c.email || 'Unknown',
        created: new Date(c.created * 1000).toISOString(),
        subscriptionStatus: sub?.status || 'none',
        mrr: sub
          ? sub.items.data.reduce((sum, i) => sum + (i.price.unit_amount || 0) * (i.quantity || 1), 0) / 100
          : 0,
      }
    })

    return NextResponse.json({ customers: result })
  } catch (err: unknown) {
    logError('stripe_customers_failed', { userId }, err)
    return NextResponse.json({ error: safeStripeError(err) }, { status: 500 })
  }
}
