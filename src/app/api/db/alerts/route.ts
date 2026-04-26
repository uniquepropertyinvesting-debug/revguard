import { NextResponse, NextRequest } from 'next/server'
import { getAlerts, markAlertRead, getUnreadAlertCount } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || undefined
    const alerts = getAlerts(userId, 50)
    const unread = getUnreadAlertCount(userId)
    return NextResponse.json({ alerts, unread })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json()
    markAlertRead(id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
