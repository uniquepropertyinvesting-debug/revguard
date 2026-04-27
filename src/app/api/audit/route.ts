import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUserId } from '@/lib/serverAuth'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const userId = await getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { action, resourceType, resourceId, details } = await req.json()
    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'action required' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''

    const supabase = await createClient()
    const { error } = await supabase.from('audit_log').insert({
      user_id: userId,
      action,
      resource_type: resourceType || '',
      resource_id: resourceId || '',
      details: details || {},
      ip_address: ip,
    })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Audit log error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const userId = await getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return NextResponse.json({ entries: data || [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Audit log error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
