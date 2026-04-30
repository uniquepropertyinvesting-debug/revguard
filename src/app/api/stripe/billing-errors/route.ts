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

type BillingErrorType = 'Duplicate' | 'Overcharge' | 'Undercharge' | 'Past Due Invoice' | 'Voided Invoice' | 'Uncollectible'

function detectErrorType(invoice: {
  status: string | null
  attemptCount: number
  discount: boolean
  duplicateFlag: boolean
}): BillingErrorType | null {
  if (invoice.duplicateFlag) return 'Duplicate'
  if (invoice.status === 'uncollectible') return 'Uncollectible'
  if (invoice.status === 'void') return 'Voided Invoice'
  if (invoice.status === 'open' && invoice.attemptCount > 1) return 'Past Due Invoice'
  if (invoice.discount) return 'Undercharge'
  return null
}

export async function GET(req: NextRequest) {
  const userId = await getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const stripe = await getStripeForUser(userId)
  try {
    const allInvoices = await paginate(stripe.invoices.list({ limit: 100 }))

    // Check for duplicate invoices (same customer + amount + period)
    const invoiceSignatures = new Map<string, string[]>()
    allInvoices.forEach(inv => {
      const key = `${inv.customer}-${inv.amount_due}-${inv.period_start}`
      if (!invoiceSignatures.has(key)) invoiceSignatures.set(key, [])
      invoiceSignatures.get(key)!.push(inv.id)
    })

    const errors: any[] = []
    const seenCustomers = new Map<string, string>()

    for (const inv of allInvoices) {
      const key = `${inv.customer}-${inv.amount_due}-${inv.period_start}`
      const isDuplicate = (invoiceSignatures.get(key)?.length ?? 0) > 1

      const errorType = detectErrorType({
        status: inv.status,
        attemptCount: inv.attempt_count,
        discount: Array.isArray(inv.discounts) ? inv.discounts.length > 0 : !!inv.discounts,
        duplicateFlag: isDuplicate,
      })

      if (!errorType) continue

      // Get customer name (cache it)
      let customerName = 'Unknown'
      let customerEmail = ''
      const customerId = typeof inv.customer === 'string' ? inv.customer : ''

      if (customerId) {
        if (seenCustomers.has(customerId)) {
          customerName = seenCustomers.get(customerId)!
        } else {
          try {
            const cust = await stripe.customers.retrieve(customerId)
            if (cust && !('deleted' in cust)) {
              customerName = cust.name || cust.email || 'Unknown'
              customerEmail = cust.email || ''
              seenCustomers.set(customerId, customerName)
            }
          } catch {}
        }
      }

      const description = (() => {
        if (errorType === 'Duplicate') return 'Duplicate invoice detected for same customer, amount, and period'
        if (errorType === 'Uncollectible') return 'Invoice marked uncollectible — revenue has been written off'
        if (errorType === 'Voided Invoice') return 'Invoice was voided — check if replacement was issued'
        if (errorType === 'Past Due Invoice') return `Invoice attempted ${inv.attempt_count} times without success`
        if (errorType === 'Undercharge') return 'Discount applied to invoice — verify discount is still valid'
        return 'Billing anomaly detected'
      })()

      errors.push({
        id: inv.id,
        customerName,
        customerEmail,
        customerId,
        type: errorType,
        amount: inv.amount_due / 100,
        currency: inv.currency.toUpperCase(),
        status: inv.status,
        description,
        created: new Date(inv.created * 1000).toISOString(),
        hostedUrl: inv.hosted_invoice_url,
        attemptCount: inv.attempt_count,
      })
    }

    const openErrors = errors.filter(e => e.status !== 'paid' && e.status !== 'void')
    const totalImpact = openErrors.reduce((sum, e) => sum + e.amount, 0)

    return NextResponse.json({
      errors,
      summary: {
        total: errors.length,
        open: openErrors.length,
        totalImpact,
        resolved: errors.filter(e => e.status === 'paid').length,
      },
    })
  } catch (err: unknown) {
    logError('stripe_billing_errors_failed', { userId }, err)
    return NextResponse.json({ error: safeStripeError(err) }, { status: 500 })
  }
}
