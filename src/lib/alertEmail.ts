import { Resend } from 'resend'
import { getAlertSettings, getAppSecret } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { logError, logInfo } from '@/lib/logger'
import { createServiceClient } from '@/lib/supabase/server'

export interface SendAlertEmailInput {
  alertType: string
  title: string
  message: string
  severity: 'critical' | 'warning' | 'success' | string
  amount?: number
  userId?: string
}

export interface SendAlertEmailResult {
  ok: boolean
  skipped?: boolean
  reason?: string
  id?: string
  error?: string
}

const TYPE_TO_PREF: Record<string, string> = {
  payment_failed: 'email_failed_payments',
  invoice_failed: 'email_failed_payments',
  churn_risk: 'email_churn_risk',
  billing_error: 'email_billing_errors',
  payment_recovered: 'email_payment_recovered',
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderEmailHtml(opts: { title: string; message: string; severity: string; amount?: number }): string {
  const severityColor = opts.severity === 'critical' ? '#ef4444' : opts.severity === 'success' ? '#10b981' : '#f59e0b'
  const severityLabel = opts.severity === 'critical' ? 'CRITICAL' : opts.severity === 'success' ? 'RECOVERED' : 'WARNING'
  const amountStr = opts.amount
    ? `$${Number(opts.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null

  const safeTitle = escapeHtml(opts.title)
  const safeMessage = escapeHtml(opts.message)
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rev-guard.com'

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#141b2d;border:1px solid #1e2d4a;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#1a2240,#0f1629);padding:28px 32px;border-bottom:1px solid #1e2d4a;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:linear-gradient(135deg,#3b82f6,#06b6d4);border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;font-size:20px;color:#fff;">RG</td>
                    <td style="padding-left:12px;">
                      <div style="color:#f1f5f9;font-size:18px;font-weight:800;line-height:1;">RevGuard</div>
                      <div style="color:#475569;font-size:10px;font-weight:600;letter-spacing:0.08em;margin-top:2px;">REVENUE PROTECTION ALERT</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right">
                <span style="background:${severityColor}22;color:${severityColor};border:1px solid ${severityColor}44;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.05em;">${severityLabel}</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="background:${severityColor}11;border:1px solid ${severityColor}33;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <div style="color:${severityColor};font-size:13px;font-weight:700;margin-bottom:8px;letter-spacing:0.03em;">${safeTitle}</div>
            <div style="color:#94a3b8;font-size:15px;line-height:1.6;">${safeMessage}</div>
            ${amountStr ? `<div style="color:#f1f5f9;font-size:28px;font-weight:900;margin-top:12px;">${amountStr}</div>` : ''}
          </div>
          <div style="color:#64748b;font-size:13px;line-height:1.7;margin-bottom:24px;">
            This alert was triggered by your RevGuard revenue protection system monitoring your Stripe account in real time.
          </div>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,#3b82f6,#06b6d4);border-radius:10px;padding:1px;">
                <a href="${dashboardUrl}" style="display:block;background:#141b2d;border-radius:9px;padding:10px 24px;color:#f1f5f9;text-decoration:none;font-size:14px;font-weight:700;">View Dashboard</a>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#0f1629;border-top:1px solid #1e2d4a;padding:20px 32px;">
          <div style="color:#334155;font-size:12px;text-align:center;">
            RevGuard Revenue Protection
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function enqueuePending(input: SendAlertEmailInput, lastError: string, attempts = 0): Promise<void> {
  try {
    const supabase = createServiceClient()
    const backoffMs = Math.min(60_000 * Math.pow(2, attempts), 30 * 60_000)
    await supabase.from('pending_emails').insert({
      user_id: input.userId || null,
      alert_type: input.alertType,
      title: input.title,
      message: input.message,
      severity: input.severity,
      amount: input.amount ?? null,
      attempts,
      last_error: lastError.slice(0, 500),
      next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
    })
  } catch (err) {
    logError('pending_email_enqueue_failed', { alertType: input.alertType }, err)
  }
}

interface SendCoreOpts {
  resendKey: string
  toEmail: string
  title: string
  message: string
  severity: string
  amount?: number
}

async function sendViaResend(opts: SendCoreOpts): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const severityLabel = opts.severity === 'critical' ? 'CRITICAL' : opts.severity === 'success' ? 'RECOVERED' : 'WARNING'
  const html = renderEmailHtml({ title: opts.title, message: opts.message, severity: opts.severity, amount: opts.amount })
  try {
    const resend = new Resend(opts.resendKey)
    const { data, error } = await resend.emails.send({
      from: 'RevGuard Alerts <alerts@rev-guard.com>',
      to: [opts.toEmail],
      subject: `[RevGuard] ${severityLabel}: ${opts.title}`,
      html,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Resend exception' }
  }
}

export async function sendAlertEmail(input: SendAlertEmailInput): Promise<SendAlertEmailResult> {
  try {
    const { alertType, title, message, severity, amount, userId } = input

    const rl = rateLimit('alert-email', userId || 'anon', { max: 20, windowMs: 60 * 60_000 })
    if (!rl.ok) {
      return { ok: false, skipped: true, reason: 'Email rate limit reached for this hour' }
    }

    const settings = userId ? await getAlertSettings(userId) : null
    const resendKey = settings?.resend_api_key || (await getAppSecret('resend_api_key')) || process.env.RESEND_API_KEY
    const toEmail = settings?.notify_email || (await getAppSecret('alert_email')) || process.env.ALERT_EMAIL

    if (!resendKey || !toEmail) {
      return { ok: false, skipped: true, reason: 'No Resend API key or email configured' }
    }

    if (settings) {
      const minAmt = settings.email_min_amount || 0
      if (amount && amount < minAmt) {
        return { ok: false, skipped: true, reason: `Amount below minimum $${minAmt}` }
      }
      const prefKey = TYPE_TO_PREF[alertType]
      if (prefKey && (settings as Record<string, unknown>)[prefKey] === 0) {
        return { ok: false, skipped: true, reason: 'Alert type disabled by user' }
      }
    }

    const result = await sendViaResend({ resendKey, toEmail, title, message, severity, amount })

    if (!result.ok) {
      logError('alert_email_send_failed', { alertType, userId, error: result.error })
      await enqueuePending(input, result.error, 0)
      return { ok: false, error: result.error }
    }

    return { ok: true, id: result.id }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Email error'
    logError('alert_email_exception', { alertType: input.alertType, userId: input.userId }, err)
    await enqueuePending(input, errMsg, 0)
    return { ok: false, error: errMsg }
  }
}

interface DrainResult {
  attempted: number
  delivered: number
  failed: number
  skipped: number
}

const MAX_ATTEMPTS = 6

/**
 * Drain pending email queue. Called by /api/cron/drain-emails on a schedule.
 * Picks up to `limit` rows whose next_attempt_at <= now, retries each one,
 * marks delivered rows as sent and bumps next_attempt_at on failures.
 */
export async function drainPendingEmails(limit = 25): Promise<DrainResult> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { data: rows, error } = await supabase
    .from('pending_emails')
    .select('id, user_id, alert_type, title, message, severity, amount, attempts')
    .is('sent_at', null)
    .lte('next_attempt_at', now)
    .order('next_attempt_at', { ascending: true })
    .limit(limit)

  if (error || !rows) {
    if (error) logError('pending_email_drain_query_failed', {}, error)
    return { attempted: 0, delivered: 0, failed: 0, skipped: 0 }
  }

  let delivered = 0
  let failed = 0
  let skipped = 0

  for (const row of rows) {
    const settings = row.user_id ? await getAlertSettings(row.user_id) : null
    const resendKey = settings?.resend_api_key || (await getAppSecret('resend_api_key')) || process.env.RESEND_API_KEY
    const toEmail = settings?.notify_email || (await getAppSecret('alert_email')) || process.env.ALERT_EMAIL
    if (!resendKey || !toEmail) {
      skipped++
      continue
    }

    const result = await sendViaResend({
      resendKey,
      toEmail,
      title: row.title,
      message: row.message,
      severity: row.severity,
      amount: row.amount ?? undefined,
    })

    const nextAttempts = (row.attempts || 0) + 1
    if (result.ok) {
      delivered++
      await supabase.from('pending_emails').update({ sent_at: new Date().toISOString(), attempts: nextAttempts }).eq('id', row.id)
    } else if (nextAttempts >= MAX_ATTEMPTS) {
      failed++
      await supabase.from('pending_emails').update({
        attempts: nextAttempts,
        last_error: result.error.slice(0, 500),
        sent_at: new Date().toISOString(),
      }).eq('id', row.id)
      logError('pending_email_max_attempts', { id: row.id, alertType: row.alert_type })
    } else {
      failed++
      const backoffMs = Math.min(60_000 * Math.pow(2, nextAttempts), 30 * 60_000)
      await supabase.from('pending_emails').update({
        attempts: nextAttempts,
        last_error: result.error.slice(0, 500),
        next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
      }).eq('id', row.id)
    }
  }

  logInfo('pending_email_drain', { attempted: rows.length, delivered, failed, skipped })
  return { attempted: rows.length, delivered, failed, skipped }
}
