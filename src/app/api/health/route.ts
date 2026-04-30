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
      checks.database = { ok: !error, latencyMs: Date.now() - t0, error: error ? 'query_failed' : undefined }
    } catch {
      checks.database = { ok: false, error: 'connection_failed' }
    }
  } else {
    checks.database = { ok: false, error: 'env_missing' }
  }

  checks.env = {
    ok: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey) {
    try {
      const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
      const { data } = await admin
        .from('cron_runs')
        .select('ran_at, status')
        .eq('job', 'drain_emails')
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!data) {
        checks.email_drain = { ok: false, error: 'never_run' }
      } else {
        const ageMs = Date.now() - new Date(data.ran_at).getTime()
        const ageMinutes = Math.round(ageMs / 60_000)
        const stale = ageMs > 15 * 60_000
        const failed = data.status !== 'ok'
        checks.email_drain = {
          ok: !stale && !failed,
          latencyMs: ageMinutes,
          error: failed ? 'last_run_failed' : stale ? `stale_${ageMinutes}m` : undefined,
        }
      }
    } catch {
      checks.email_drain = { ok: false, error: 'check_failed' }
    }
  }

  const allOk = Object.values(checks).every((c) => c.ok)

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      version: process.env.RELEASE_VERSION || 'dev',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptimeMs: Date.now() - start,
      checks,
    },
    {
      status: allOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
