import { NextResponse, NextRequest } from 'next/server'
import { Resend } from 'resend'
import { getAlertSettings } from '@/lib/db'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const { alertType, title, message, amount, userId, severity, internalKey } = await req.json()

    if (internalKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = rateLimit('alert-email', userId || 'anon', { max: 20, windowMs: 60 * 60_000 })
    if (!rl.ok) {
      return NextResponse.json(
        { skipped: true, reason: 'Email rate limit reached for this hour' },
        { headers: rateLimitHeaders(rl) }
      )
    }

    const settings = userId ? await getAlertSettings(userId) : null

    const resendKey = settings?.resend_api_key || process.env.RESEND_API_KEY
    const toEmail = settings?.notify_email || process.env.ALERT_EMAIL

    if (!resendKey || !toEmail) {
      return NextResponse.json({ skipped: true, reason: 'No Resend API key or email configured' })
    }

    if (settings) {
      const minAmt = settings.email_min_amount || 0
      if (amount && amount < minAmt) {
        return NextResponse.json({ skipped: true, reason: `Amount $${amount} below minimum $${minAmt}` })
      }
      const typeMap: Record<string, string> = {
        payment_failed: 'email_failed_payments',
        invoice_failed: 'email_failed_payments',
        churn_risk: 'email_churn_risk',
        billing_error: 'email_billing_errors',
        payment_recovered: 'email_payment_recovered',
      }
      const prefKey = typeMap[alertType]
      if (prefKey && settings[prefKey] === 0) {
        return NextResponse.json({ skipped: true, reason: 'Alert type disabled by user' })
      }
    }

    const resend = new Resend(resendKey)

    const severityColor = severity === 'critical' ? '#ef4444' : severity === 'success' ? '#10b981' : '#f59e0b'
    const severityLabel = severity === 'critical' ? 'CRITICAL' : severity === 'success' ? 'RECOVERED' : 'WARNING'
    const amountStr = amount ? `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#141b2d;border:1px solid #1e2d4a;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a2240,#0f1629);padding:28px 32px;border-bottom:1px solid #1e2d4a;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;font-size:20px;">🛡️</td>
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

        <!-- Alert body -->
        <tr><td style="padding:32px;">
          <div style="background:${severityColor}11;border:1px solid ${severityColor}33;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <div style="color:${severityColor};font-size:13px;font-weight:700;margin-bottom:8px;letter-spacing:0.03em;">${title}</div>
            <div style="color:#94a3b8;font-size:15px;line-height:1.6;">${message}</div>
            ${amountStr ? `<div style="color:#f1f5f9;font-size:28px;font-weight:900;margin-top:12px;">${amountStr}</div>` : ''}
          </div>

          <div style="color:#64748b;font-size:13px;line-height:1.7;margin-bottom:24px;">
            This alert was triggered by your RevGuard revenue protection system monitoring your Stripe account in real time.
          </div>

          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:10px;padding:1px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://revguard.io'}"
                   style="display:block;background:#141b2d;border-radius:9px;padding:10px 24px;color:#f1f5f9;text-decoration:none;font-size:14px;font-weight:700;">
                  View Dashboard →
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0f1629;border-top:1px solid #1e2d4a;padding:20px 32px;">
          <div style="color:#334155;font-size:12px;text-align:center;">
            RevGuard Revenue Protection · You're receiving this because you enabled email alerts.<br>
            <a href="#" style="color:#3b82f6;text-decoration:none;">Manage alert preferences</a>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    const { data, error } = await resend.emails.send({
      from: 'RevGuard Alerts <alerts@revguard.io>',
      to: [toEmail],
      subject: `[RevGuard] ${severityLabel}: ${title}`,
      html,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Email error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
