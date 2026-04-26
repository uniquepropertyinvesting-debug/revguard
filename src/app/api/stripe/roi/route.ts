import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getRecoveryActions } from '@/lib/db'

export async function GET() {
  try {
    const [subscriptions, charges, invoices] = await Promise.all([
      stripe.subscriptions.list({ limit: 100, status: 'all' }),
      stripe.charges.list({ limit: 100 }),
      stripe.invoices.list({ limit: 100 }),
    ])

    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    // --- MRR from active subscriptions ---
    const activeSubscriptions = subscriptions.data.filter(s => s.status === 'active')
    const mrr = activeSubscriptions.reduce((sum, s) =>
      sum + s.items.data.reduce((a, i) => a + (i.price.unit_amount || 0) * (i.quantity || 1), 0), 0
    ) / 100

    // --- Failed payment rate ---
    const recentCharges = charges.data.filter(c => c.created * 1000 >= thirtyDaysAgo)
    const failedCharges = recentCharges.filter(c => c.status === 'failed')
    const failedPaymentRate = recentCharges.length > 0
      ? (failedCharges.length / recentCharges.length) * 100
      : 0
    const failedRevenue = failedCharges.reduce((sum, c) => sum + c.amount, 0) / 100

    // --- Churn rate from canceled subscriptions ---
    const recentSubs = subscriptions.data.filter(s => s.created * 1000 >= thirtyDaysAgo)
    const canceledSubs = subscriptions.data.filter(s =>
      s.status === 'canceled' && s.canceled_at && s.canceled_at * 1000 >= thirtyDaysAgo
    )
    const churnRate = recentSubs.length > 0
      ? (canceledSubs.length / recentSubs.length) * 100
      : 0
    const churnedMRR = canceledSubs.reduce((sum, s) =>
      sum + s.items.data.reduce((a, i) => a + (i.price.unit_amount || 0) * (i.quantity || 1), 0), 0
    ) / 100

    // --- Billing error rate ---
    const openInvoices = invoices.data.filter(i => i.status === 'open' && i.attempt_count > 1)
    const billingErrorRate = invoices.data.length > 0
      ? (openInvoices.length / invoices.data.length) * 100
      : 0
    const billingErrorRevenue = openInvoices.reduce((sum, i) => sum + (i.amount_due || 0), 0) / 100

    // --- Recovery stats from DB ---
    const recoveryActions = await getRecoveryActions(undefined, 200)
    const successfulRecoveries = recoveryActions.filter((a: any) => a.status === 'success')
    const totalRecovered = successfulRecoveries.reduce((sum: number, a: any) => sum + a.amount, 0)
    const recoveryRate = recoveryActions.length > 0
      ? (successfulRecoveries.length / recoveryActions.length) * 100
      : 68 // default estimate

    // --- Total loss ---
    const totalMonthlyLoss = failedRevenue + churnedMRR + billingErrorRevenue
    const projectedRecovery = totalMonthlyLoss * (recoveryRate / 100)
    const annualImpact = projectedRecovery * 12
    const platformCost = 499
    const roi = projectedRecovery > 0 ? ((projectedRecovery - platformCost) / platformCost) * 100 : 0

    return NextResponse.json({
      // Real Stripe numbers to pre-fill calculator
      mrr: Math.round(mrr),
      churnRate: parseFloat(churnRate.toFixed(1)),
      failedPaymentRate: parseFloat(failedPaymentRate.toFixed(1)),
      billingErrorRate: parseFloat(billingErrorRate.toFixed(1)),

      // Computed values
      failedRevenue,
      churnedMRR,
      billingErrorRevenue,
      totalMonthlyLoss,
      projectedRecovery,
      annualImpact,
      roi,
      recoveryRate,
      totalRecovered,

      // Counts
      activeSubscriptions: activeSubscriptions.length,
      canceledThisMonth: canceledSubs.length,
      failedChargesCount: failedCharges.length,
      openInvoicesCount: openInvoices.length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
