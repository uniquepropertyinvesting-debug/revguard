import { NextResponse, NextRequest } from 'next/server'
import { findN8nConnectionBySecret, recordN8nWorkflowRun, touchN8nHeartbeat, createAlert } from '@/lib/db'
import { logError, logInfo } from '@/lib/logger'

/**
 * Receives workflow run events from a user's n8n instance. Auth is via the
 * shared webhook secret stored when the user connected their instance — sent
 * either as `X-N8n-Signature` header or `?secret=` query param.
 */
export async function POST(req: NextRequest) {
  try {
    const secret =
      req.headers.get('x-n8n-signature') ||
      req.headers.get('x-webhook-secret') ||
      req.nextUrl.searchParams.get('secret') ||
      ''
    if (!secret) return NextResponse.json({ error: 'Missing webhook secret' }, { status: 401 })

    const conn = await findN8nConnectionBySecret(secret)
    if (!conn) return NextResponse.json({ error: 'Unknown webhook secret' }, { status: 401 })

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const workflowId = String(body.workflowId || body.workflow_id || body.id || 'unknown')
    const workflowName = typeof body.workflowName === 'string' ? body.workflowName
      : typeof body.workflow_name === 'string' ? body.workflow_name
      : typeof body.name === 'string' ? body.name
      : ''
    const rawStatus = String(body.status || 'success').toLowerCase()
    const status: 'running' | 'success' | 'error' =
      rawStatus === 'error' || rawStatus === 'failed' ? 'error'
      : rawStatus === 'running' || rawStatus === 'started' ? 'running'
      : 'success'
    const eventType = typeof body.eventType === 'string' ? body.eventType
      : typeof body.event === 'string' ? body.event
      : null
    const errorMessage = typeof body.errorMessage === 'string' ? body.errorMessage
      : typeof body.error === 'string' ? body.error
      : null
    const durationMs = typeof body.durationMs === 'number' ? body.durationMs
      : typeof body.duration_ms === 'number' ? body.duration_ms
      : undefined

    await recordN8nWorkflowRun({
      userId: conn.user_id,
      workflowId,
      workflowName,
      triggerType: typeof body.triggerType === 'string' ? body.triggerType : 'webhook',
      status,
      eventType: eventType || undefined,
      inputData: typeof body.input === 'object' && body.input ? body.input as Record<string, unknown> : {},
      outputData: typeof body.output === 'object' && body.output ? body.output as Record<string, unknown> : {},
      errorMessage: errorMessage || undefined,
      durationMs,
    })

    await touchN8nHeartbeat(conn.user_id)

    if (status === 'error') {
      await createAlert({
        userId: conn.user_id,
        type: 'n8n_workflow_failed',
        severity: 'warning',
        title: `n8n workflow failed${workflowName ? `: ${workflowName}` : ''}`,
        message: errorMessage || 'Workflow run reported an error',
        metadata: { workflowId, workflowName },
      })
    }

    logInfo('n8n_webhook_received', { userId: conn.user_id, workflowId, status })
    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    logError('n8n_webhook_failed', undefined, err)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
