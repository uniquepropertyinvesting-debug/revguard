import { NextRequest, NextResponse } from 'next/server'
import { getStripeForUser } from '@/lib/stripe'
import { getVerifiedUserId } from '@/lib/serverAuth'
import Stripe from 'stripe'

async function getStripeContext(stripe: Stripe): Promise<string> {
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

    const openFailedInvoices = invoices.data.filter(i => i.status === 'open' && i.attempt_count > 1)
    const uncollectible = invoices.data.filter(i => i.status === 'uncollectible')
    const billingErrorImpact = [...openFailedInvoices, ...uncollectible]
      .reduce((sum, i) => sum + (i.amount_due || 0), 0) / 100

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
- High risk accounts (score >= 75): ${highRisk.length}
- MRR at risk: $${mrrAtRisk.toFixed(2)}
- Top at-risk: ${highRisk.slice(0, 3).map(r => `${r.name} (score:${r.score}, $${r.mrr}/mo)`).join(', ') || 'none'}

### Billing Errors
- Open failed invoices (multi-attempt): ${openFailedInvoices.length}
- Uncollectible invoices: ${uncollectible.length}
- Total billing error impact: $${billingErrorImpact.toFixed(2)}
`.trim()
  } catch {
    return '## Stripe data unavailable — answer based on general SaaS revenue best practices.'
  }
}

const ANALYZE_SYSTEM = `You are RevGuard AI Analyzer, an expert Revenue Loss Prevention analyst for SaaS companies.
You have LIVE Stripe data below. Produce structured JSON analysis. Be specific with exact numbers.

Return ONLY valid JSON with this exact structure:
{
  "healthScore": <number 0-100>,
  "healthLabel": "<Excellent|Good|Needs Attention|Critical>",
  "summary": "<2-3 sentence executive summary referencing exact numbers>",
  "findings": [
    {
      "category": "<revenue|churn|billing|recovery|growth>",
      "severity": "<critical|warning|positive|info>",
      "title": "<short finding title>",
      "explanation": "<1-2 sentence explanation with specific numbers>",
      "action": "<specific recommended action>"
    }
  ],
  "metrics": {
    "mrrTrend": "<up|down|stable>",
    "biggestRisk": "<one-line description of biggest risk>",
    "quickWin": "<one-line description of the easiest revenue win>",
    "projectedMonthlyLoss": <number>,
    "projectedAnnualLoss": <number>,
    "recoveryPotential": <number dollar amount recoverable>
  }
}

Include 4-8 findings covering all categories. Findings should be ordered by severity (critical first). Be brutally honest.`

const EXPLAIN_SYSTEM = `You are RevGuard AI, an expert Revenue Loss Prevention advisor.
You have LIVE Stripe data below. The user is asking about a specific metric or situation.
Explain clearly in 2-4 sentences: what it means, why it matters, and one concrete action.
Use exact numbers from the data. Be direct and practical, not generic.`

async function callOpenAI(systemPrompt: string, userContent: string, stripeContext: string) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) throw new Error('AI not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: `${systemPrompt}\n\n${stripeContext}` },
        { role: 'user', content: userContent },
      ],
    }),
  })

  if (!res.ok) throw new Error('AI request failed')
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(req: NextRequest) {
  const userId = await getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { mode } = body

    const stripe = await getStripeForUser(userId)
    const stripeContext = await getStripeContext(stripe)

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    // Mode: analyze — returns structured JSON analysis
    if (mode === 'analyze') {
      const raw = await callOpenAI(ANALYZE_SYSTEM, 'Analyze this account now.', stripeContext)
      try {
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const analysis = JSON.parse(cleaned)
        return NextResponse.json({ analysis })
      } catch {
        return NextResponse.json({ analysis: null, raw })
      }
    }

    // Mode: explain — returns a short explanation for a specific metric/topic
    if (mode === 'explain') {
      const { topic } = body
      if (!topic || typeof topic !== 'string') {
        return NextResponse.json({ error: 'topic required' }, { status: 400 })
      }
      const content = await callOpenAI(EXPLAIN_SYSTEM, topic, stripeContext)
      return NextResponse.json({ content })
    }

    // Default: chat mode
    const { messages } = body
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || 'Unable to get a response.'

    return NextResponse.json({ content })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
