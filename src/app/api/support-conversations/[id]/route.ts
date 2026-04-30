import { NextRequest, NextResponse } from 'next/server'
import { apiGuard } from '@/lib/apiGuard'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await apiGuard(req, { scope: 'support_conversation_get', max: 120, windowMs: 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  const userId = guard.userId!

  try {
    const { id } = await ctx.params
    const supabase = await createClient()

    const { data: convo, error: convoErr } = await supabase
      .from('support_conversations')
      .select('id, title, status, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (convoErr || !convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data: messages, error: msgErr } = await supabase
      .from('support_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (msgErr) {
      logError('support_get_messages_failed', { userId, id }, msgErr)
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
    }

    return NextResponse.json({ conversation: convo, messages: messages || [] })
  } catch (err) {
    logError('support_get_conversation_exception', { userId }, err)
    return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 })
  }
}
