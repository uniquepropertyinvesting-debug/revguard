import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiGuard } from '@/lib/apiGuard'
import { logInfo, logError } from '@/lib/logger'

const TABLES = [
  'users',
  'alerts',
  'alert_settings',
  'recovery_actions',
  'interventions',
  'dunning_sequences',
  'webhook_events',
  'stripe_connections',
  'n8n_connections',
  'n8n_workflow_runs',
  'audit_log',
] as const

export async function GET(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'gdpr_export', max: 3, windowMs: 60 * 60_000, requireAuth: true })
  if (!guard.ok) return guard.response

  const userId = guard.userId!

  try {
    const supabase = await createClient()
    const result: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: userId }

    for (const table of TABLES) {
      const column = table === 'users' ? 'id' : 'user_id'
      const { data, error } = await supabase.from(table).select('*').eq(column, userId)
      if (error) {
        logError('gdpr_export_table_failed', { table, userId }, error)
        result[table] = { error: error.message }
      } else {
        result[table] = data || []
      }
    }

    if (result.stripe_connections && Array.isArray(result.stripe_connections)) {
      result.stripe_connections = (result.stripe_connections as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        stripe_secret_key: '[REDACTED]',
        webhook_secret: '[REDACTED]',
      }))
    }
    if (result.alert_settings && Array.isArray(result.alert_settings)) {
      result.alert_settings = (result.alert_settings as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        resend_api_key: row.resend_api_key ? '[REDACTED]' : null,
      }))
    }
    if (result.n8n_connections && Array.isArray(result.n8n_connections)) {
      result.n8n_connections = (result.n8n_connections as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        api_key: row.api_key ? '[REDACTED]' : null,
        webhook_secret: row.webhook_secret ? '[REDACTED]' : null,
      }))
    }

    logInfo('gdpr_export_completed', { userId })

    return new NextResponse(JSON.stringify(result, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="revguard-data-export-${userId}.json"`,
        ...guard.rateHeaders,
      },
    })
  } catch (err) {
    logError('gdpr_export_failed', { userId }, err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
