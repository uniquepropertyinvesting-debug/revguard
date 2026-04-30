import { NextRequest, NextResponse } from 'next/server'
import { drainPendingEmails } from '@/lib/alertEmail'
import { logError } from '@/lib/logger'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function recordCronRun(params: {
  status: 'ok' | 'error'
  processed: number
  error?: string
  durationMs: number
}) {
  try {
    const db = createServiceClient()
    await db.from('cron_runs').insert({
      job: 'drain_emails',
      status: params.status,
      processed: params.processed,
      error: params.error ?? null,
      duration_ms: params.durationMs,
    })
  } catch {
    // observability must never break the job itself
  }
}

/**
 * Cron-callable endpoint that drains the pending_emails queue.
 * Auth: requires the CRON_SECRET to be sent via the `Authorization: Bearer <secret>` header.
 * Configure your scheduler (Netlify Scheduled Functions, Supabase pg_cron, GitHub Actions, etc.)
 * to hit this endpoint every 1-5 minutes.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 })
  }

  const auth = req.headers.get('authorization') || ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (provided.length !== expected.length || provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  try {
    const result = await drainPendingEmails(50)
    const processed = (result as { sent?: number; processed?: number })?.sent
      ?? (result as { processed?: number })?.processed
      ?? 0
    await recordCronRun({
      status: 'ok',
      processed,
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    logError('drain_emails_failed', {}, err)
    await recordCronRun({
      status: 'error',
      processed: 0,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json({ ok: false, error: 'drain failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
