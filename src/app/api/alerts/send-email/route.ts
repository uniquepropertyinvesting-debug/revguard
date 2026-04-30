import { NextResponse, NextRequest } from 'next/server'
import { apiGuard } from '@/lib/apiGuard'
import { sendAlertEmail } from '@/lib/alertEmail'

/**
 * Authenticated test endpoint: lets a logged-in user send themselves a test alert email.
 * Webhooks and server code MUST call sendAlertEmail() directly (see /lib/alertEmail.ts) — never via HTTP.
 */
export async function POST(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'alert_email_test', max: 5, windowMs: 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  const userId = guard.userId!

  try {
    const body = await req.json()
    const { alertType, title, message, severity, amount } = body || {}

    if (typeof alertType !== 'string' || typeof title !== 'string' || typeof message !== 'string' || typeof severity !== 'string') {
      return NextResponse.json({ error: 'alertType, title, message, severity required' }, { status: 400 })
    }

    const result = await sendAlertEmail({
      alertType: alertType.slice(0, 64),
      title: title.slice(0, 200),
      message: message.slice(0, 2000),
      severity: severity.slice(0, 32),
      amount: typeof amount === 'number' ? amount : undefined,
      userId,
    })

    if (!result.ok && !result.skipped) {
      return NextResponse.json({ error: result.error || 'Email failed' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Email error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
