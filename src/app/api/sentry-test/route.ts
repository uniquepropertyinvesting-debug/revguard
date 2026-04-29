import { NextResponse } from 'next/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const err = new Error('Sentry test error from /api/sentry-test')
  err.name = 'SentryTestError'
  logError('sentry_test', { source: 'manual_trigger' }, err)
  return NextResponse.json({
    ok: true,
    message: 'Test error sent. Check your Sentry dashboard within ~30s.',
    sentryConfigured: Boolean(process.env.SENTRY_DSN),
  })
}
