import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {}
  const start = Date.now()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && anonKey) {
    const t0 = Date.now()
    try {
      const client = createClient(url, anonKey, { auth: { persistSession: false } })
      const { error } = await client.from('users').select('id', { head: true, count: 'exact' }).limit(0)
      checks.database = { ok: !error, latencyMs: Date.now() - t0, error: error?.message }
    } catch (err) {
      checks.database = { ok: false, error: err instanceof Error ? err.message : 'unknown' }
    }
  } else {
    checks.database = { ok: false, error: 'env_missing' }
  }

  checks.env = {
    ok: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  }

  const allOk = Object.values(checks).every((c) => c.ok)

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeMs: Date.now() - start,
      checks,
    },
    { status: allOk ? 200 : 503 },
  )
}
