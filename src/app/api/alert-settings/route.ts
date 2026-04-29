import { NextResponse, NextRequest } from 'next/server'
import { getAlertSettings, saveAlertSettings } from '@/lib/db'
import { Resend } from 'resend'
import { apiGuard } from '@/lib/apiGuard'
import { logError } from '@/lib/logger'
import { isEmail } from '@/lib/validate'

export async function GET(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'alert_settings_read', max: 60, windowMs: 60_000 })
  if (!guard.ok) return guard.response
  try {
    const userId = guard.userId ?? 'default'
    const settings = await getAlertSettings(userId)
    if (!settings) {
      return NextResponse.json({
        notifyEmail: '',
        hasResendKey: false,
        emailFailedPayments: true,
        emailChurnRisk: true,
        emailBillingErrors: true,
        emailPaymentRecovered: true,
        emailMinAmount: 0,
      })
    }
    return NextResponse.json({
      notifyEmail: settings.notify_email || '',
      hasResendKey: !!settings.resend_api_key,
      emailFailedPayments: !!settings.email_failed_payments,
      emailChurnRisk: !!settings.email_churn_risk,
      emailBillingErrors: !!settings.email_billing_errors,
      emailPaymentRecovered: !!settings.email_payment_recovered,
      emailMinAmount: settings.email_min_amount || 0,
    })
  } catch (err: unknown) {
    logError('alert_settings_failed', undefined, err)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'alert_settings_write', max: 20, windowMs: 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  try {
    const body = await req.json()
    const { notifyEmail, resendApiKey, ...prefs } = body || {}
    const verifiedUserId = guard.userId!

    if (notifyEmail !== undefined && notifyEmail !== '' && !isEmail(notifyEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (resendApiKey !== undefined && resendApiKey !== '' && (typeof resendApiKey !== 'string' || resendApiKey.length > 200)) {
      return NextResponse.json({ error: 'Invalid Resend API key format' }, { status: 400 })
    }
    if (prefs.emailMinAmount !== undefined && (typeof prefs.emailMinAmount !== 'number' || prefs.emailMinAmount < 0 || prefs.emailMinAmount > 1_000_000)) {
      return NextResponse.json({ error: 'Invalid emailMinAmount' }, { status: 400 })
    }

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)
        const check = await resend.domains.list()
        if ((check as any).error) {
          return NextResponse.json({ error: 'Invalid Resend API key' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Could not validate Resend API key' }, { status: 400 })
      }
    }

    await saveAlertSettings(verifiedUserId, {
      notifyEmail,
      resendApiKey: resendApiKey || undefined,
      emailFailedPayments: prefs.emailFailedPayments !== false,
      emailChurnRisk: prefs.emailChurnRisk !== false,
      emailBillingErrors: prefs.emailBillingErrors !== false,
      emailPaymentRecovered: prefs.emailPaymentRecovered !== false,
      emailMinAmount: prefs.emailMinAmount || 0,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    logError('alert_settings_failed', undefined, err)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'alert_settings_test_email', max: 5, windowMs: 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  try {
    await req.json()
    const verifiedUserId = guard.userId!
    const settings = await getAlertSettings(verifiedUserId)
    const resendKey = settings?.resend_api_key || process.env.RESEND_API_KEY
    const toEmail = settings?.notify_email

    if (!resendKey) return NextResponse.json({ error: 'No Resend API key configured' }, { status: 400 })
    if (!toEmail) return NextResponse.json({ error: 'No notification email set' }, { status: 400 })

    const resend = new Resend(resendKey)
    const { data, error } = await resend.emails.send({
      from: 'RevGuard Alerts <alerts@revguard.io>',
      to: [toEmail],
      subject: '[RevGuard] Test Alert — Email Alerts Working!',
      html: `
        <div style="font-family:sans-serif;background:#0a0e1a;color:#f1f5f9;padding:40px;border-radius:12px;max-width:600px;">
          <div style="font-size:32px;margin-bottom:16px;">🛡️</div>
          <h2 style="color:#10b981;margin:0 0 12px;">RevGuard Email Alerts Are Working!</h2>
          <p style="color:#94a3b8;line-height:1.6;">
            This is a test alert from your RevGuard dashboard. Your Resend API key is connected
            and email alerts are configured correctly.
          </p>
          <p style="color:#94a3b8;margin-top:16px;font-size:13px;">
            You will now receive alerts for: failed payments, churn risk events, billing errors, and payment recoveries — directly in your inbox.
          </p>
        </div>
      `,
    })

    if (error) {
      logError('alert_settings_test_email_failed', { userId: verifiedUserId }, error)
      return NextResponse.json({ error: 'Failed to send test email' }, { status: 400 })
    }
    return NextResponse.json({ success: true, id: data?.id })
  } catch (err: unknown) {
    logError('alert_settings_test_email_failed', undefined, err)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
