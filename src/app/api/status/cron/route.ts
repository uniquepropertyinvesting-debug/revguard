import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const TRACKED_JOBS = ['drain_emails'] as const

export async function GET() {
  try {
    const db = createServiceClient()
    const { data, error } = await db
      .from('cron_runs')
      .select('job, status, processed, error, duration_ms, ran_at')
      .in('job', TRACKED_JOBS as unknown as string[])
      .order('ran_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ jobs: [], error: 'fetch_failed' }, { status: 500 })
    }

    const latestByJob = new Map<string, typeof data[number]>()
    for (const row of data || []) {
      if (!latestByJob.has(row.job)) latestByJob.set(row.job, row)
    }

    const jobs = TRACKED_JOBS.map(name => {
      const latest = latestByJob.get(name) || null
      return {
        job: name,
        lastRunAt: latest?.ran_at ?? null,
        status: latest?.status ?? null,
        processed: latest?.processed ?? null,
        durationMs: latest?.duration_ms ?? null,
        error: latest?.error ?? null,
      }
    })

    return NextResponse.json({ jobs }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ jobs: [], error: 'fetch_failed' }, { status: 500 })
  }
}
