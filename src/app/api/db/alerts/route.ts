import { NextResponse, NextRequest } from 'next/server'
import { getAlerts, markAlertRead, getUnreadAlertCount } from '@/lib/db'
import { getVerifiedUserId } from '@/lib/serverAuth'

export async function GET(req: NextRequest) {
  const userId = await getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const alerts = await getAlerts(userId, 50)
    const unread = await getUnreadAlertCount(userId)
    return NextResponse.json({ alerts, unread })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const userId = await getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await req.json()
    await markAlertRead(id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
