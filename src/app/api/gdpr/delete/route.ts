import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { apiGuard } from '@/lib/apiGuard'
import { logInfo, logError } from '@/lib/logger'

const CHILD_TABLES = [
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

export async function POST(req: NextRequest) {
  const guard = await apiGuard(req, { scope: 'gdpr_delete', max: 2, windowMs: 60 * 60_000, requireAuth: true })
  if (!guard.ok) return guard.response

  const userId = guard.userId!

  let body: { confirm?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.confirm !== 'DELETE MY ACCOUNT') {
    return NextResponse.json(
      { error: 'Confirmation phrase required. Send { "confirm": "DELETE MY ACCOUNT" }' },
      { status: 400 },
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    logError('gdpr_delete_misconfigured', { userId })
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const userClient = await createServerClient()
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } })

  try {
    for (const table of CHILD_TABLES) {
      const { error } = await userClient.from(table).delete().eq('user_id', userId)
      if (error) logError('gdpr_delete_child_failed', { table, userId }, error)
    }

    const { error: userRowErr } = await userClient.from('users').delete().eq('id', userId)
    if (userRowErr) logError('gdpr_delete_user_row_failed', { userId }, userRowErr)

    const { error: authErr } = await adminClient.auth.admin.deleteUser(userId)
    if (authErr) {
      logError('gdpr_delete_auth_failed', { userId }, authErr)
      return NextResponse.json({ error: 'Account data deleted but auth removal failed. Contact support.' }, { status: 500 })
    }

    logInfo('gdpr_delete_completed', { userId })
    return NextResponse.json({ success: true, message: 'Account and all associated data deleted' })
  } catch (err) {
    logError('gdpr_delete_failed', { userId }, err)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
