import { NextResponse, NextRequest } from 'next/server'
import { getAlerts, markAlertRead, getUnreadAlertCount } from '@/lib/db'
import { getVerifiedUserId } from '@/lib/serverAuth'

export async function GET(req: NextRequest) {
  try {
    const userId = (await getVerifiedUserId(req)) ?? undefined
    const alerts = await getAlerts(userId, 50)
    const unread = await getUnreadAlertCount(userId)
    return NextResponse.json({ alerts, unread })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { alertId, markAllRead } = await req.json()
    if (markAllRead) {
      const userId = (await getVerifiedUserId(req)) ?? undefined
      const alerts = await getAlerts(userId, 200)
      for (const a of alerts) {
        if (!a.read) await markAlertRead(a.id)
      }
    } else if (alertId) {
      await markAlertRead(alertId)
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
