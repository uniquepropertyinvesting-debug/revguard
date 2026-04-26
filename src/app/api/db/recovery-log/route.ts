import { NextResponse, NextRequest } from 'next/server'
import { getRecoveryActions } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || undefined
    const actions = getRecoveryActions(userId, 100)
    const totalRecovered = actions
      .filter((a: any) => a.status === 'success')
      .reduce((sum: number, a: any) => sum + a.amount, 0)
    return NextResponse.json({ actions, totalRecovered })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
