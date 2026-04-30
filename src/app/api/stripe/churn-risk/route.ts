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

function calcChurnScore(sub: {
  status: string
  daysActive: number
  pastDueCount: number
  cancelAtPeriodEnd: boolean
  mrr: number
}): number {
  let score = 0

  // Past due is the strongest signal
  if (sub.status === 'past_due') score += 50
  if (sub.status === 'unpaid') score += 60

  // Cancel at period end is a clear churn signal
  if (sub.cancelAtPeriodEnd) score += 35

  // Multiple past due increments
  score += Math.min(sub.pastDueCount * 10, 20)

  // New customers have higher risk
  if (sub.daysActive < 30) score += 10
  else if (sub.daysActive < 90) score += 5

  return Math.min(score, 99)
}

function churnSignals(sub: {
  status: string
  cancelAtPeriodEnd: boolean
  daysActive: number
  pastDueCount: number
}): string[] {
  const signals: string[] = []
  if (sub.status === 'past_due') signals.push('Payment past due')
  if (sub.status === 'unpaid') signals.push('Invoice unpaid')
  if (sub.cancelAtPeriodEnd) signals.push('Set to cancel at period end')
  if (sub.pastDueCount > 1) signals.push(`${sub.pastDueCount} payment failures`)
  if (sub.daysActive < 30) signals.push('New customer (<30 days)')
  if (sub.daysActive < 90) signals.push('Early stage customer')
  if (signals.length === 0) signals.push('Subscription active')
  return signals
}

export async function GET(req: NextRequest) {
  const userId = await getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const stripe = await getStripeForUser(userId)
  try {
    const [subscriptions, customers] = await Promise.all([
      paginate(stripe.subscriptions.list({ limit: 100, status: 'all' })),
      paginate(stripe.customers.list({ limit: 100 })),
    ])

    const customerMap = new Map(customers.map(c => [c.id, c]))

    const now = Math.floor(Date.now() / 1000)

    const risks = subscriptions
      .filter(s => ['active', 'past_due', 'unpaid'].includes(s.status))
      .map(sub => {
        const customer = typeof sub.customer === 'string'
          ? customerMap.get(sub.customer)
          : null

        const daysActive = Math.floor((now - sub.created) / 86400)
        const mrr = sub.items.data.reduce(
          (sum, i) => sum + (i.price.unit_amount || 0) * (i.quantity || 1),
          0
        ) / 100

        const subData = {
          status: sub.status,
          daysActive,
          pastDueCount: sub.status === 'past_due' ? 1 : 0,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          mrr,
        }

        const score = calcChurnScore(subData)
        const signals = churnSignals({
          status: sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          daysActive,
          pastDueCount: subData.pastDueCount,
        })

        return {
          id: sub.id,
          customerId: typeof sub.customer === 'string' ? sub.customer : '',
          customerName: customer?.name || customer?.email || 'Unknown Customer',
          customerEmail: customer?.email || 'Unknown',
          mrr,
          score,
          signals,
          status: sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          daysActive,
          currentPeriodEnd: (() => {
            const periodEnd = sub.items?.data?.[0]?.current_period_end
            return periodEnd ? new Date(periodEnd * 1000).toISOString() : new Date().toISOString()
          })(),
        }
      })
      .sort((a, b) => b.score - a.score)

    const highRisk = risks.filter(r => r.score >= 75)
    const mediumRisk = risks.filter(r => r.score >= 50 && r.score < 75)
    const mrrAtRisk = risks
      .filter(r => r.score >= 50)
      .reduce((sum, r) => sum + r.mrr, 0)

    return NextResponse.json({
      risks,
      summary: {
        total: risks.length,
        highRisk: highRisk.length,
        mediumRisk: mediumRisk.length,
        mrrAtRisk,
      },
    })
  } catch (err: unknown) {
    logError('stripe_churn_risk_failed', { userId }, err)
    return NextResponse.json({ error: safeStripeError(err) }, { status: 500 })
  }
}
