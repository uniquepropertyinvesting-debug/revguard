import { NextRequest, NextResponse } from 'next/server'
import { apiGuard } from '@/lib/apiGuard'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'support_conversations_list', max: 60, windowMs: 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  const userId = guard.userId!

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('support_conversations')
      .select('id, title, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      logError('support_list_conversations_failed', { userId }, error)
      return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
    }

    return NextResponse.json({ conversations: data || [] })
  } catch (err) {
    logError('support_list_conversations_exception', { userId }, err)
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
  }
}
