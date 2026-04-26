import { NextRequest, NextResponse } from 'next/server'
import { getStripeForUser } from '@/lib/stripe'
import { Resend } from 'resend'
import {
  getDunningSequences,
  getDunningSequenceDue,
  upsertDunningSequence,
  advanceDunningStep,
  cancelDunningSequence,
  recoverDunningSequence,
  getAlertSettings,
  logRecoveryAction,
  createAlert,
} from '@/lib/db'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'
import { getVerifiedUserId } from '@/lib/serverAuth'

const DUNNING_STEPS = [
  {
    step: 1,
    day: 1,
    subject: 'Action Required: Your payment failed',
    urgency: 'low',
    nextOffsetDays: 3,
  },
  {
    step: 2,
    day: 3,
    subject: 'Reminder: Your payment is still outstanding',
    urgency: 'medium',
    nextOffsetDays: 4,
  },
  {
    step: 3,
    day: 7,
    subject: 'Final Notice: Service suspension in 48 hours',
    urgency: 'high',
    nextOffsetDays: null,
  },
]

function buildDunningEmail(params: {
  step: number
  customerName: string
  customerEmail: string
  amount: number
  currency: string
  invoiceId: string
  dashboardUrl: string
}) {
  const { step, customerName, amount, currency, dashboardUrl } = params
  const amountStr = `${currency} $${amount.toFixed(2)}`
  const firstName = customerName.split(' ')[0] || customerName

  const configs = [
    {
      color: '#f59e0b',
      badge: 'DAY 1 — PAYMENT FAILED',
      headline: `Hi ${firstName}, your payment of ${amountStr} didn't go through`,
      body: `We tried to process your payment of <strong>${amountStr}</strong> but it was declined. This could be due to an expired card, insufficient funds, or a temporary bank hold.`,
      cta: 'Update Payment Method',
      urgencyNote: 'Your service continues uninterrupted while you update your details.',
    },
    {
      color: '#ef4444',
      badge: 'DAY 3 — SECOND NOTICE',
      headline: `${firstName}, your outstanding payment needs attention`,
      body: `This is a friendly reminder that your payment of <strong>${amountStr}</strong> is still outstanding. To avoid any disruption to your service, please update your payment method.`,
      cta: 'Pay Now',
      urgencyNote: 'Your account remains active, but please act soon to avoid service interruption.',
    },
    {
      color: '#dc2626',
      badge: 'DAY 7 — FINAL NOTICE',
      headline: `Urgent: Service suspension in 48 hours — ${amountStr} overdue`,
      body: `Despite our previous notices, your payment of <strong>${amountStr}</strong> remains unpaid. Your service will be suspended in <strong>48 hours</strong> if payment is not received.`,
      cta: 'Pay Now to Keep Access',
      urgencyNote: '⚠️ Account suspension will happen automatically in 48 hours.',
    },
  ]

  const cfg = configs[step - 1] || configs[0]

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#141b2d;border:1px solid #1e2d4a;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a2240,#0f1629);padding:24px 32px;border-bottom:1px solid #1e2d4a;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;font-size:18px;">🛡️</td>
                    <td style="padding-left:10px;">
                      <div style="color:#f1f5f9;font-size:16px;font-weight:800;">RevGuard</div>
                      <div style="color:#475569;font-size:9px;font-weight:600;letter-spacing:0.08em;">AUTOMATED DUNNING</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right">
                <span style="background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color}44;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.05em;">${cfg.badge}</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <div style="color:#f1f5f9;font-size:20px;font-weight:700;line-height:1.4;margin-bottom:16px;">${cfg.headline}</div>

          <div style="background:${cfg.color}11;border:1px solid ${cfg.color}33;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
            <div style="color:#94a3b8;font-size:15px;line-height:1.7;">${cfg.body}</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#64748b;font-size:13px;line-height:1.8;margin-bottom:8px;">What to do:</div>
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              ${['Log into your account', 'Go to Billing → Payment Methods', 'Update your card details', 'Your payment will be retried automatically'].map((s, i) => `
              <tr><td style="padding:4px 0;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:${cfg.color}22;color:${cfg.color};border-radius:50%;width:20px;height:20px;text-align:center;vertical-align:middle;font-size:11px;font-weight:700;">${i + 1}</td>
                    <td style="padding-left:10px;color:#94a3b8;font-size:13px;">${s}</td>
                  </tr>
                </table>
              </td></tr>`).join('')}
            </table>
          </div>

          <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="background:${cfg.color};border-radius:10px;padding:1px;">
                <a href="${dashboardUrl}"
                   style="display:block;padding:12px 28px;color:white;text-decoration:none;font-size:14px;font-weight:700;text-align:center;">
                  ${cfg.cta} →
                </a>
              </td>
            </tr>
          </table>

          <div style="color:#475569;font-size:12px;line-height:1.6;padding:12px 16px;background:#0f1629;border-radius:8px;">
            ${cfg.urgencyNote}
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0f1629;border-top:1px solid #1e2d4a;padding:16px 32px;">
          <div style="color:#334155;font-size:12px;text-align:center;">
            This is an automated payment recovery email from RevGuard.<br>
            If you have questions, reply to this email or contact support.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// GET /api/dunning — list all sequences + stats
export async function GET(req: NextRequest) {
  try {
    const userId = (await getVerifiedUserId(req)) ?? undefined
    const sequences = await getDunningSequences(userId, 200)
    const now = new Date().toISOString()

    const stats = {
      total: sequences.length,
      active: sequences.filter(s => s.status === 'active').length,
      recovered: sequences.filter(s => s.status === 'recovered').length,
      exhausted: sequences.filter(s => s.status === 'exhausted').length,
      cancelled: sequences.filter(s => s.status === 'cancelled').length,
      totalAmountInSequence: sequences.filter(s => s.status === 'active').reduce((sum: number, s: any) => sum + s.amount, 0),
      totalAmountRecovered: sequences.filter(s => s.status === 'recovered').reduce((sum: number, s: any) => sum + s.amount, 0),
      due: sequences.filter(s => s.status === 'active' && s.step < 3 && (s.next_email_due_at === null || s.next_email_due_at <= now)).length,
    }

    return NextResponse.json({ sequences, stats })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/dunning — run due sequences OR enroll a specific invoice OR cancel
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, invoiceId } = body
    const verifiedUserId = (await getVerifiedUserId(req)) ?? undefined

    const rl = rateLimit('dunning', verifiedUserId || req.ip || 'anon', { max: 30, windowMs: 60_000 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests — please wait a moment' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    const stripe = await getStripeForUser(verifiedUserId)

    // --- ENROLL: add a specific invoice to dunning ---
    if (action === 'enroll') {
      if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })

      const invoice = await stripe.invoices.retrieve(invoiceId)
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || ''
      let customerEmail = invoice.customer_email || ''
      let customerName = ''

      if (customerId) {
        try {
          const cust = await stripe.customers.retrieve(customerId)
          if (cust && !('deleted' in cust)) {
            customerEmail = cust.email || customerEmail
            customerName = cust.name || ''
          }
        } catch {}
      }

      if (!customerEmail) {
        return NextResponse.json({ error: 'Customer email not found on invoice' }, { status: 400 })
      }

      await upsertDunningSequence({
        invoiceId,
        userId: verifiedUserId,
        customerId,
        customerEmail,
        customerName,
        amount: (invoice.amount_due || 0) / 100,
        currency: invoice.currency?.toUpperCase() || 'USD',
      })

      return NextResponse.json({ success: true, message: `Enrolled ${customerEmail} in dunning sequence` })
    }

    // --- CANCEL: remove from dunning ---
    if (action === 'cancel') {
      if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
      await cancelDunningSequence(invoiceId)
      return NextResponse.json({ success: true })
    }

    // --- MARK_RECOVERED: stop dunning for a paid invoice ---
    if (action === 'mark_recovered') {
      if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
      await recoverDunningSequence(invoiceId)
      return NextResponse.json({ success: true })
    }

    // --- RUN: process all due emails ---
    if (action === 'run' || !action) {
      const due = await getDunningSequenceDue()

      if (due.length === 0) {
        return NextResponse.json({ processed: 0, message: 'No sequences due' })
      }

      const settings = verifiedUserId ? await getAlertSettings(verifiedUserId) : await getAlertSettings('default')
      const resendKey = settings?.resend_api_key || process.env.RESEND_API_KEY
      const threadId = process.env.THREAD_ID || '4e8b8e4b-dc75-44f2-8684-56cf03492cc9'
      const dashboardUrl = `https://${threadId}.studio-api.nxcode.io/`

      const results: any[] = []

      for (const seq of due) {
        const nextStep = seq.step + 1
        const stepConfig = DUNNING_STEPS[nextStep - 1]
        if (!stepConfig) continue

        const nextDueAt = stepConfig.nextOffsetDays
          ? new Date(Date.now() + stepConfig.nextOffsetDays * 86400 * 1000).toISOString()
          : null

        let emailSent = false
        let emailError = null

        if (resendKey) {
          try {
            const resend = new Resend(resendKey)
            const html = buildDunningEmail({
              step: nextStep,
              customerName: seq.customer_name || seq.customer_email,
              customerEmail: seq.customer_email,
              amount: seq.amount,
              currency: seq.currency,
              invoiceId: seq.invoice_id,
              dashboardUrl,
            })

            const { error } = await resend.emails.send({
              from: 'RevGuard Billing <billing@revguard.io>',
              to: [seq.customer_email],
              subject: stepConfig.subject,
              html,
            })

            if (error) {
              emailError = error.message
            } else {
              emailSent = true
            }
          } catch (e: any) {
            emailError = e.message
          }
        }

        await advanceDunningStep(seq.id, nextDueAt)

        await logRecoveryAction({
          userId: seq.user_id,
          invoiceId: seq.invoice_id,
          customerId: seq.customer_id,
          customerEmail: seq.customer_email,
          amount: seq.amount,
          currency: seq.currency,
          action: `dunning_step_${nextStep}`,
          status: emailSent ? 'sent' : 'logged',
          result: emailSent
            ? `Day ${stepConfig.day} dunning email sent to ${seq.customer_email}`
            : `Day ${stepConfig.day} dunning step logged (no email: ${emailError || 'no Resend key'})`,
        })

        await createAlert({
          userId: seq.user_id,
          type: 'dunning_email',
          severity: nextStep === 3 ? 'critical' : 'warning',
          title: `Dunning Step ${nextStep} — ${seq.customer_email}`,
          message: `Day ${stepConfig.day} dunning email ${emailSent ? 'sent' : 'queued'} for $${seq.amount.toFixed(2)} invoice`,
          metadata: { invoiceId: seq.invoice_id, step: nextStep, customerEmail: seq.customer_email, emailSent },
        })

        results.push({
          sequenceId: seq.id,
          customerEmail: seq.customer_email,
          step: nextStep,
          day: stepConfig.day,
          emailSent,
          emailError,
          nextDueAt,
        })
      }

      return NextResponse.json({
        processed: results.length,
        results,
        message: `Processed ${results.length} dunning sequence${results.length !== 1 ? 's' : ''}`,
      })
    }

    // --- SYNC: auto-enroll all open failed invoices from Stripe ---
    if (action === 'sync') {
      const invoices = await stripe.invoices.list({ status: 'open', limit: 50 })
      const failed = invoices.data.filter(inv => inv.attempt_count > 0 && inv.amount_due > 0)

      let enrolled = 0
      for (const inv of failed) {
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id || ''
        let customerEmail = inv.customer_email || ''
        let customerName = ''

        if (customerId && !customerEmail) {
          try {
            const cust = await stripe.customers.retrieve(customerId)
            if (cust && !('deleted' in cust)) {
              customerEmail = cust.email || ''
              customerName = cust.name || ''
            }
          } catch {}
        }

        if (customerEmail) {
          await upsertDunningSequence({
            invoiceId: inv.id,
            userId: verifiedUserId,
            customerId,
            customerEmail,
            customerName,
            amount: inv.amount_due / 100,
            currency: inv.currency?.toUpperCase() || 'USD',
          })
          enrolled++
        }
      }

      return NextResponse.json({ enrolled, total: failed.length, message: `Enrolled ${enrolled} invoices in dunning` })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
