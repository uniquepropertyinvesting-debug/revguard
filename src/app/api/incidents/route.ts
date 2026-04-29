import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ incidents: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } })
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('incidents')
    .select('id, monitor_name, status, severity, started_at, resolved_at, summary')
    .gte('started_at', since)
    .order('started_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ incidents: [], error: 'fetch_failed' }, { status: 500 })
  }

  return NextResponse.json(
    { incidents: data || [] },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
