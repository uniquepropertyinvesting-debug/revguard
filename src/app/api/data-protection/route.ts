import { NextRequest, NextResponse } from 'next/server'
import { getWebhookEvents, getRecoveryActions, getAlerts } from '@/lib/db'
import { getVerifiedUserId } from '@/lib/serverAuth'

export async function GET(req: NextRequest) {
  const userId = await getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const webhookEvents = await getWebhookEvents(userId, 200)
    const recoveryActions = await getRecoveryActions(userId, 200)
    const alerts = await getAlerts(userId, 200)

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 86400 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000).toISOString()

    const auditLog: any[] = []

    for (const ev of webhookEvents.slice(0, 15)) {
      auditLog.push({
        action: `Stripe webhook received: ${ev.event_type}`,
        actor: 'Stripe',
        time: ev.created_at,
        category: 'data_ingestion',
      })
    }

    for (const ra of recoveryActions.slice(0, 10)) {
      auditLog.push({
        action: `Recovery action: ${ra.action} — ${ra.status}`,
        actor: 'RevGuard System',
        time: ra.created_at,
        category: 'action',
      })
    }

    auditLog.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    const recentAuditLog = auditLog.slice(0, 20)

    const eventsLast24h = webhookEvents.filter(e => e.created_at >= oneDayAgo).length
    const eventsLast7d = webhookEvents.filter(e => e.created_at >= sevenDaysAgo).length
    const totalRecoveryActions = recoveryActions.length
    const totalAlerts = alerts.length

    return NextResponse.json({
      auditLog: recentAuditLog,
      stats: {
        webhookEventsTotal: webhookEvents.length,
        webhookEventsLast24h: eventsLast24h,
        webhookEventsLast7d: eventsLast7d,
        recoveryActionsTotal: totalRecoveryActions,
        alertsTotal: totalAlerts,
        dbSizeEstimate: `${Math.round((webhookEvents.length * 0.5 + recoveryActions.length * 0.3 + alerts.length * 0.2))}KB`,
      }
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
