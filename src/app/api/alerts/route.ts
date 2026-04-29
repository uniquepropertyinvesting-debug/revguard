import { NextResponse, NextRequest } from 'next/server'
import { getAlerts, markAlertRead, getUnreadAlertCount } from '@/lib/db'
import { apiGuard } from '@/lib/apiGuard'
import { logError } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'alerts_read', max: 120, windowMs: 60_000 })
  if (!guard.ok) return guard.response
  try {
    const userId = guard.userId ?? undefined
    const alerts = await getAlerts(userId, 50)
    const unread = await getUnreadAlertCount(userId)
    return NextResponse.json({ alerts, unread })
  } catch (err: unknown) {
    logError('alerts_get_failed', undefined, err)
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'alerts_patch', max: 60, windowMs: 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  try {
    const { alertId, markAllRead } = await req.json()
    if (markAllRead) {
      const userId = guard.userId ?? undefined
      const alerts = await getAlerts(userId, 200)
      for (const a of alerts) {
        if (!a.read) await markAlertRead(a.id)
      }
    } else if (alertId) {
      await markAlertRead(alertId)
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    logError('alerts_patch_failed', undefined, err)
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
