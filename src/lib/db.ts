import { encrypt, decrypt } from '@/lib/crypto'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

function serviceDb() {
  return createServiceClient()
}

async function authDb() {
  return await createAuthClient()
}

// --- Audit Log ---
/**
 * Records a sensitive action for compliance. Best-effort; failures are
 * swallowed so audit issues never block the underlying request.
 */
export async function recordAuditEvent(params: {
  userId: string
  action: string
  resourceType?: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}) {
  try {
    const db = serviceDb()
    await db.from('audit_log').insert({
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType ?? '',
      resource_id: params.resourceId ?? '',
      details: params.details ?? {},
      ip_address: params.ipAddress ?? '',
    })
  } catch {
    // intentional: audit failure must not break the user-facing request
  }
}

// --- Users ---
export async function upsertUser(id: string, email: string, name?: string) {
  const db = serviceDb()
  await db.from('users').upsert({ id, email, name: name || null }, { onConflict: 'id' })
}

export async function getUserById(id: string) {
  const db = serviceDb()
  const { data } = await db.from('users').select('*').eq('id', id).maybeSingle()
  return data
}

export async function setUserOnboarded(id: string) {
  const db = serviceDb()
  await db.from('users').update({ onboarded: true }).eq('id', id)
}

export async function isUserOnboarded(userId: string): Promise<boolean> {
  const db = serviceDb()
  const { data } = await db.from('users').select('onboarded').eq('id', userId).maybeSingle()
  return data?.onboarded === true
}

// --- Stripe Connections (multi-tenant) ---
export async function saveStripeConnection(userId: string, secretKey: string, publishableKey?: string, webhookSecret?: string) {
  const db = serviceDb()
  const { data: existing } = await db.from('stripe_connections').select('id').eq('user_id', userId).maybeSingle()

  const row = {
    user_id: userId,
    stripe_secret_key: encrypt(secretKey),
    stripe_publishable_key: publishableKey ? encrypt(publishableKey) : null,
    webhook_secret: webhookSecret ? encrypt(webhookSecret) : null,
  }

  if (existing) {
    await db.from('stripe_connections').update(row).eq('id', existing.id)
  } else {
    await db.from('stripe_connections').insert(row)
  }
}

export async function getStripeConnection(userId: string) {
  const db = serviceDb()
  const { data: row } = await db.from('stripe_connections').select('*').eq('user_id', userId).maybeSingle()
  if (!row) return null
  return {
    ...row,
    stripe_secret_key: row.stripe_secret_key ? decrypt(row.stripe_secret_key) : null,
    stripe_publishable_key: row.stripe_publishable_key ? decrypt(row.stripe_publishable_key) : null,
    webhook_secret: row.webhook_secret ? decrypt(row.webhook_secret) : null,
  }
}

// --- Webhook Events ---
export async function saveWebhookEvent(stripeEventId: string, eventType: string, payload: any, userId?: string) {
  const db = serviceDb()
  const { data, error } = await db.from('webhook_events').insert({
    user_id: userId || null,
    event_type: eventType,
    stripe_event_id: stripeEventId,
    payload,
  }).select('id').maybeSingle()
  if (error) return null
  return data?.id
}

/** Returns true if a webhook with this Stripe event ID was already recorded. */
export async function isWebhookEventProcessed(stripeEventId: string): Promise<boolean> {
  const db = serviceDb()
  const { data } = await db
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle()
  return !!data
}

export async function markWebhookEventProcessed(stripeEventId: string) {
  const db = serviceDb()
  await db.from('webhook_events').update({ processed: true }).eq('stripe_event_id', stripeEventId)
}

export async function getWebhookEvents(userId?: string, limit = 50) {
  const db = userId ? await authDb() : serviceDb()
  let query = db.from('webhook_events').select('*').order('created_at', { ascending: false }).limit(limit)
  if (userId) query = query.eq('user_id', userId)
  const { data } = await query
  return data || []
}

// --- Recovery Actions ---
export async function logRecoveryAction(data: {
  userId?: string
  invoiceId: string
  customerId?: string
  customerEmail?: string
  amount: number
  currency?: string
  action: string
  status: string
  result?: string
}) {
  const db = serviceDb()
  const { data: row } = await db.from('recovery_actions').insert({
    user_id: data.userId || null,
    invoice_id: data.invoiceId,
    customer_id: data.customerId || null,
    customer_email: data.customerEmail || null,
    amount: data.amount,
    currency: data.currency || 'USD',
    action: data.action,
    status: data.status,
    result: data.result || null,
  }).select('id').maybeSingle()
  return row?.id
}

export async function getRecoveryActions(userId?: string, limit = 100) {
  const db = userId ? await authDb() : serviceDb()
  let query = db.from('recovery_actions').select('*').order('created_at', { ascending: false }).limit(limit)
  if (userId) query = query.eq('user_id', userId)
  const { data } = await query
  return data || []
}

// --- Alerts ---
export async function createAlert(data: {
  userId?: string
  type: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  title: string
  message: string
  metadata?: any
}) {
  const db = serviceDb()
  const { data: row } = await db.from('alerts').insert({
    user_id: data.userId || null,
    type: data.type,
    severity: data.severity,
    title: data.title,
    message: data.message,
    metadata: data.metadata || null,
  }).select('id').maybeSingle()
  return row?.id
}

export async function getAlerts(userId?: string, limit = 50) {
  const db = userId ? await authDb() : serviceDb()
  let query = db.from('alerts').select('*').order('created_at', { ascending: false }).limit(limit)
  if (userId) query = query.eq('user_id', userId)
  const { data } = await query
  return data || []
}

export async function markAlertRead(id: string) {
  const db = serviceDb()
  await db.from('alerts').update({ read: true }).eq('id', id)
}

export async function getUnreadAlertCount(userId?: string) {
  const db = userId ? await authDb() : serviceDb()
  let query = db.from('alerts').select('*', { count: 'exact', head: true }).eq('read', false)
  if (userId) query = query.eq('user_id', userId)
  const { count } = await query
  return count || 0
}

// --- Interventions ---
export async function createIntervention(data: {
  userId?: string
  customerId: string
  customerEmail?: string
  type: string
  notes?: string
}) {
  const db = serviceDb()
  const { data: row } = await db.from('interventions').insert({
    user_id: data.userId || null,
    customer_id: data.customerId,
    customer_email: data.customerEmail || null,
    type: data.type,
    notes: data.notes || null,
  }).select('id').maybeSingle()
  return row?.id
}

export async function getInterventions(userId?: string, limit = 50) {
  const db = userId ? await authDb() : serviceDb()
  let query = db.from('interventions').select('*').order('created_at', { ascending: false }).limit(limit)
  if (userId) query = query.eq('user_id', userId)
  const { data } = await query
  return data || []
}

// --- Alert Settings ---
export async function getAlertSettings(userId: string) {
  const db = serviceDb()
  const { data: row } = await db.from('alert_settings').select('*').eq('user_id', userId).maybeSingle()
  if (!row) return null
  return {
    ...row,
    resend_api_key: row.resend_api_key ? decrypt(row.resend_api_key) : null,
  }
}

export async function saveAlertSettings(userId: string, settings: {
  notifyEmail?: string
  resendApiKey?: string
  emailFailedPayments?: boolean
  emailChurnRisk?: boolean
  emailBillingErrors?: boolean
  emailPaymentRecovered?: boolean
  emailMinAmount?: number
}) {
  const db = serviceDb()
  const { data: existing } = await db.from('alert_settings').select('id').eq('user_id', userId).maybeSingle()

  const row = {
    user_id: userId,
    notify_email: settings.notifyEmail ?? null,
    resend_api_key: settings.resendApiKey ? encrypt(settings.resendApiKey) : undefined,
    email_failed_payments: settings.emailFailedPayments !== false,
    email_churn_risk: settings.emailChurnRisk !== false,
    email_billing_errors: settings.emailBillingErrors !== false,
    email_payment_recovered: settings.emailPaymentRecovered !== false,
    email_min_amount: settings.emailMinAmount ?? 0,
  }

  if (existing) {
    await db.from('alert_settings').update(row).eq('id', existing.id)
  } else {
    await db.from('alert_settings').insert(row)
  }
}

// --- Dunning Sequences ---
export async function upsertDunningSequence(data: {
  invoiceId: string
  userId?: string
  customerId?: string
  customerEmail: string
  customerName?: string
  amount: number
  currency?: string
}) {
  const db = serviceDb()
  const now = new Date().toISOString()

  const { data: existing } = await db.from('dunning_sequences').select('id').eq('invoice_id', data.invoiceId).maybeSingle()
  if (existing) return existing.id

  const { data: row, error } = await db.from('dunning_sequences').insert({
    user_id: data.userId || null,
    invoice_id: data.invoiceId,
    customer_id: data.customerId || null,
    customer_email: data.customerEmail,
    customer_name: data.customerName || null,
    amount: data.amount,
    currency: data.currency || 'USD',
    status: 'active',
    step: 0,
    next_email_due_at: now,
  }).select('id').maybeSingle()
  if (error) console.error('[upsertDunningSequence]', error.message)
  return row?.id
}

export async function getDunningSequences(userId?: string, limit = 100) {
  const db = userId ? await authDb() : serviceDb()
  let query = db.from('dunning_sequences').select('*').order('created_at', { ascending: false }).limit(limit)
  if (userId) query = query.eq('user_id', userId)
  const { data } = await query
  return data || []
}

export async function getDunningSequenceDue(now?: string) {
  const ts = now ?? new Date().toISOString()
  const db = serviceDb()
  const { data } = await db
    .from('dunning_sequences')
    .select('*')
    .eq('status', 'active')
    .lt('step', 3)
    .lte('next_email_due_at', ts)
    .order('next_email_due_at', { ascending: true })
    .limit(50)
  return data || []
}

export async function advanceDunningStep(id: string, nextDueAt: string | null) {
  const db = serviceDb()
  const now = new Date().toISOString()

  const { data: current } = await db.from('dunning_sequences').select('step').eq('id', id).maybeSingle()
  const currentStep = current?.step ?? 0

  if (nextDueAt === null) {
    await db.from('dunning_sequences').update({
      step: currentStep + 1,
      last_email_sent_at: now,
      status: 'exhausted',
      next_email_due_at: null,
    }).eq('id', id)
  } else {
    await db.from('dunning_sequences').update({
      step: currentStep + 1,
      last_email_sent_at: now,
      next_email_due_at: nextDueAt,
    }).eq('id', id)
  }
}

export async function cancelDunningSequence(invoiceId: string) {
  const db = serviceDb()
  await db.from('dunning_sequences').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  }).eq('invoice_id', invoiceId)
}

export async function recoverDunningSequence(invoiceId: string) {
  const db = serviceDb()
  await db.from('dunning_sequences').update({
    status: 'recovered',
    recovered_at: new Date().toISOString(),
  }).eq('invoice_id', invoiceId)
}
