import { NextResponse, NextRequest } from 'next/server'
import { listN8nWorkflowRuns } from '@/lib/db'
import { getVerifiedUserId } from '@/lib/serverAuth'
import { logError } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const userId = await getVerifiedUserId(req)
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const runs = await listN8nWorkflowRuns(userId, 25)
    return NextResponse.json({ runs })
  } catch (err: unknown) {
    logError('n8n_runs_list_failed', undefined, err)
    return NextResponse.json({ error: 'Failed to load runs' }, { status: 500 })
  }
}
