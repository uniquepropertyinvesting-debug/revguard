import { NextResponse } from 'next/server'
import { getWebhookEvents, getRecoveryActions, getAlerts } from '@/lib/db'

export async function GET() {
  try {
    const webhookEvents = getWebhookEvents(undefined, 200)
    const recoveryActions = getRecoveryActions(undefined, 200)
    const alerts = getAlerts(undefined, 200)

    const now = Math.floor(Date.now() / 1000)
    const oneDayAgo = now - 86400
    const sevenDaysAgo = now - 7 * 86400

    // Build a real audit log from DB activity
    const auditLog: any[] = []

    // Webhook events = data ingestion events
    for (const ev of webhookEvents.slice(0, 15)) {
      auditLog.push({
        action: `Stripe webhook received: ${ev.event_type}`,
        actor: 'Stripe → RevGuard',
        time: ev.created_at,
        category: 'data_ingestion',
      })
    }

    // Recovery actions = user-triggered actions
    for (const ra of recoveryActions.slice(0, 10)) {
      auditLog.push({
        action: `Recovery action: ${ra.action} — ${ra.status}`,
        actor: 'RevGuard System',
        time: ra.created_at,
        category: 'action',
      })
    }

    // Sort by time desc, take top 20
    auditLog.sort((a, b) => b.time - a.time)
    const recentAuditLog = auditLog.slice(0, 20)

    // Data stats
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
