import { NextRequest, NextResponse } from 'next/server'
import { apiGuard } from '@/lib/apiGuard'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'support_ticket_create', max: 5, windowMs: 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  const userId = guard.userId!

  try {
    const body = await req.json() as { conversationId?: string; subject?: string; note?: string }
    const subject = (body.subject || 'Support request').trim().slice(0, 200)
    const note = (body.note || '').trim().slice(0, 4000)
    const conversationId = body.conversationId || null

    const supabase = await createClient()

    let summary = note
    if (conversationId) {
      const { data: msgs } = await supabase
        .from('support_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10)
      if (msgs && msgs.length) {
        const transcript = msgs.reverse().map(m => `[${m.role}] ${m.content}`).join('\n\n')
        summary = (note ? `User note:\n${note}\n\n---\n\n` : '') + `Recent transcript:\n${transcript}`
      }
    }

    const { data: ticket, error: ticketErr } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        subject,
        summary: summary.slice(0, 8000),
        status: 'open',
      })
      .select('id, subject, status, created_at')
      .maybeSingle()

    if (ticketErr || !ticket) {
      logError('support_create_ticket_failed', { userId }, ticketErr)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }

    if (conversationId) {
      await supabase
        .from('support_conversations')
        .update({ status: 'escalated', updated_at: new Date().toISOString() })
        .eq('id', conversationId)
    }

    const resendKey = process.env.RESEND_API_KEY
    const teamEmail = process.env.SUPPORT_TEAM_EMAIL || process.env.ALERT_EMAIL
    if (resendKey && teamEmail) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const userEmail = user?.email || 'unknown'
        const resend = new Resend(resendKey)
        await resend.emails.send({
          from: 'RevGuard Support <support@rev-guard.com>',
          to: [teamEmail],
          subject: `[Support] ${subject}`,
          text: `New support ticket\n\nFrom: ${userEmail} (${userId})\nTicket: ${ticket.id}\n\n${summary}`,
        })
      } catch (e) {
        logError('support_ticket_email_failed', { userId, ticketId: ticket.id }, e)
      }
    }

    return NextResponse.json({ ticket })
  } catch (err) {
    logError('support_ticket_exception', { userId }, err)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}
