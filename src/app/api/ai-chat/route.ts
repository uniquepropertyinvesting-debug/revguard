import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

async function getStripeContext(): Promise<string> {
  try {
    const [charges, subscriptions, customers, invoices] = await Promise.all([
      stripe.charges.list({ limit: 50 }),
      stripe.subscriptions.list({ limit: 50, status: 'all' }),
      stripe.customers.list({ limit: 50 }),
      stripe.invoices.list({ limit: 50 }),
    ])

    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const nowSec = Math.floor(now / 1000)

    const recentCharges = charges.data.filter(c => c.created * 1000 >= thirtyDaysAgo)
    const failedCharges = recentCharges.filter(c => c.status === 'failed')
    const succeededCharges = recentCharges.filter(c => c.status === 'succeeded')

    const activeSubscriptions = subscriptions.data.filter(s => s.status === 'active')
    const pastDueSubs = subscriptions.data.filter(s => s.status === 'past_due')
    const canceledSubs = subscriptions.data.filter(s => s.status === 'canceled')
    const cancelAtEndSubs = subscriptions.data.filter(s => s.cancel_at_period_end)

    const mrr = activeSubscriptions.reduce((sum, s) =>
      sum + s.items.data.reduce((a, i) => a + (i.price.unit_amount || 0) * (i.quantity || 1), 0), 0) / 100

    const failedRevenue = failedCharges.reduce((sum, c) => sum + c.amount, 0) / 100
    const recoveredRevenue = succeededCharges.reduce((sum, c) => sum + c.amount, 0) / 100
    const recoveryRate = recentCharges.length > 0
      ? ((succeededCharges.length / recentCharges.length) * 100).toFixed(1)
      : '0'

    // Churn risk scoring
    const customerMap = new Map(customers.data.map(c => [c.id, c]))
    const churnRisks = subscriptions.data
      .filter(s => ['active', 'past_due', 'unpaid'].includes(s.status))
      .map(sub => {
        const cust = typeof sub.customer === 'string' ? customerMap.get(sub.customer) : null
        const daysActive = Math.floor((nowSec - sub.created) / 86400)
        const subMrr = sub.items.data.reduce((a, i) => a + (i.price.unit_amount || 0) * (i.quantity || 1), 0) / 100
        let score = 0
        if (sub.status === 'past_due') score += 50
        if (sub.status === 'unpaid') score += 60
        if (sub.cancel_at_period_end) score += 35
        if (daysActive < 30) score += 10
        else if (daysActive < 90) score += 5
        return {
          name: cust?.name || cust?.email || sub.id.slice(0, 12),
          score: Math.min(score, 99),
          mrr: subMrr,
          status: sub.status,
          cancelAtEnd: sub.cancel_at_period_end,
        }
      })
      .sort((a, b) => b.score - a.score)

    const highRisk = churnRisks.filter(r => r.score >= 75)
    const mrrAtRisk = churnRisks.filter(r => r.score >= 50).reduce((sum, r) => sum + r.mrr, 0)

    // Billing errors
    const openFailedInvoices = invoices.data.filter(i => i.status === 'open' && i.attempt_count > 1)
    const uncollectible = invoices.data.filter(i => i.status === 'uncollectible')
    const billingErrorImpact = [...openFailedInvoices, ...uncollectible]
      .reduce((sum, i) => sum + (i.amount_due || 0), 0) / 100

    // Top failed payments
    const topFailed = failedCharges.slice(0, 5).map(c => ({
      amount: (c.amount / 100).toFixed(2),
      reason: c.failure_message || 'declined',
    }))

    return `
## LIVE STRIPE DATA (as of right now)

### Revenue Overview (Last 30 days)
- MRR: $${mrr.toFixed(2)}/mo
- Failed revenue: $${failedRevenue.toFixed(2)}
- Recovered revenue: $${recoveredRevenue.toFixed(2)}
- Recovery rate: ${recoveryRate}%
- Total customers: ${customers.data.length}
- Active subscriptions: ${activeSubscriptions.length}
- Past due subscriptions: ${pastDueSubs.length}
- Canceled subscriptions (30d): ${canceledSubs.length}
- Set to cancel at period end: ${cancelAtEndSubs.length}

### Failed Payments (Last 30 days)
- Failed count: ${failedCharges.length}
- Top failures: ${topFailed.map(f => `$${f.amount} (${f.reason})`).join(', ') || 'none'}

### Churn Risk
- High risk accounts (score ≥75): ${highRisk.length}
- MRR at risk: $${mrrAtRisk.toFixed(2)}
- Top at-risk: ${highRisk.slice(0, 3).map(r => `${r.name} (score:${r.score}, $${r.mrr}/mo)`).join(', ') || 'none'}

### Billing Errors
- Open failed invoices (multi-attempt): ${openFailedInvoices.length}
- Uncollectible invoices: ${uncollectible.length}
- Total billing error impact: $${billingErrorImpact.toFixed(2)}
`.trim()
  } catch (err) {
    return '## Stripe data unavailable — answer based on general SaaS revenue best practices.'
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const stripeContext = await getStripeContext()

    const openaiApiKey = process.env.OPENAI_API_KEY || ''

    const systemPrompt = `You are RevGuard AI, an expert Revenue Loss Prevention assistant for SaaS companies.\nYou have access to LIVE Stripe data for this account. Use it to give specific, accurate, actionable answers.\nBe concise but highly specific — reference exact numbers from the data below.\nSuggest concrete next steps. Use markdown formatting (bold, bullet points) in responses.\n\n${stripeContext}`

    const payload = {
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || 'Unable to get a response.'

    return NextResponse.json({ content })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
