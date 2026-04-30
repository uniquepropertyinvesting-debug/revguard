import { NextRequest, NextResponse } from 'next/server'
import { apiGuard } from '@/lib/apiGuard'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

const SYSTEM_PROMPT = `You are RevGuard Support, the friendly product support agent for the RevGuard Revenue Loss Prevention platform.

Your job is to help users with questions about HOW the product works — not to analyze their live billing data.
Topics you cover:
- Connecting and reconnecting Stripe (via Stripe Connect)
- How automated dunning, retries, and recovery emails work
- How churn risk scoring is calculated (status, cancel_at_period_end, account age)
- Billing errors, usage mismatch, and revenue loss intelligence
- Alert settings, notification preferences, and Resend email setup
- Plans, pricing, billing for the RevGuard subscription itself
- Data protection, GDPR export/delete, and privacy
- Account, login, and onboarding issues

Style:
- Be concise and friendly. Aim for 2-5 short paragraphs or a tight bulleted list.
- Use markdown bold (**...**) for key terms; bullets when listing steps.
- If you don't know the answer or it's outside product scope, say so plainly and suggest escalating to a human via the "Talk to a human" button.
- Never invent features. Never expose internal data, secrets, or other users.
- If the user asks for live revenue numbers, churn, or specific Stripe data, redirect them to the AI Revenue Assistant page (which has live Stripe access) and don't fabricate numbers.`

interface IncomingMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

function isValidMessage(m: unknown): m is IncomingMessage {
  if (!m || typeof m !== 'object') return false
  const v = m as Record<string, unknown>
  return (
    typeof v.role === 'string'
    && ['user', 'assistant', 'system'].includes(v.role)
    && typeof v.content === 'string'
    && v.content.length > 0
    && v.content.length <= 8000
  )
}

export async function POST(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'support_chat', max: 30, windowMs: 60_000, requireAuth: true })
  if (!guard.ok) return guard.response
  const userId = guard.userId!

  try {
    const body = await req.json() as { conversationId?: string; message?: string }
    const message = (body.message || '').trim()
    if (!message || message.length > 8000) {
      return NextResponse.json({ error: 'message must be 1-8000 characters' }, { status: 400 })
    }

    const supabase = await createClient()
    let conversationId = body.conversationId

    if (!conversationId) {
      const title = message.length > 60 ? message.slice(0, 57) + '...' : message
      const { data: convo, error: convoErr } = await supabase
        .from('support_conversations')
        .insert({ user_id: userId, title })
        .select('id')
        .maybeSingle()
      if (convoErr || !convo) {
        logError('support_create_conversation_failed', { userId }, convoErr)
        return NextResponse.json({ error: 'Failed to start conversation' }, { status: 500 })
      }
      conversationId = convo.id
    } else {
      const { data: existing } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('id', conversationId)
        .maybeSingle()
      if (!existing) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
    }

    const { error: insertUserErr } = await supabase
      .from('support_messages')
      .insert({ conversation_id: conversationId, role: 'user', content: message })
    if (insertUserErr) {
      logError('support_insert_user_msg_failed', { userId, conversationId }, insertUserErr)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    const { data: history } = await supabase
      .from('support_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(40)

    const validHistory = (history || []).filter(isValidMessage)

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'AI not configured', conversationId }, { status: 503 })
    }

    const payload = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...validHistory.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.4,
    }

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!aiRes.ok) {
      logError('support_openai_failed', { userId, status: aiRes.status })
      return NextResponse.json({ error: 'AI request failed', conversationId }, { status: 502 })
    }

    const aiData = await aiRes.json()
    const assistantContent: string = aiData.choices?.[0]?.message?.content?.trim()
      || "I had trouble generating a reply. Please try again, or escalate to a human."

    await supabase
      .from('support_messages')
      .insert({ conversation_id: conversationId, role: 'assistant', content: assistantContent })

    await supabase
      .from('support_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json({ conversationId, assistant: assistantContent })
  } catch (err) {
    logError('support_chat_failed', { userId }, err)
    return NextResponse.json({ error: 'Support chat failed' }, { status: 500 })
  }
}
