import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'

// --- Users ---
export async function upsertUser(id: string, email: string, name?: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('users')
    .upsert({ id, email, name: name || null }, { onConflict: 'id' })
  if (error) console.error('[upsertUser]', error.message)
}

export async function getUserById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data
}

// --- Stripe Connections ---
export async function saveStripeConnection(userId: string, secretKey: string, publishableKey?: string, webhookSecret?: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('stripe_connections')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  const payload = {
    user_id: userId,
    stripe_secret_key: encrypt(secretKey),
    stripe_publishable_key: publishableKey ? encrypt(publishableKey) : null,
    webhook_secret: webhookSecret ? encrypt(webhookSecret) : null,
  }

  if (existing) {
    await supabase.from('stripe_connections').update(payload).eq('id', existing.id)
  } else {
    await supabase.from('stripe_connections').insert(payload)
  }
}

export async function getStripeConnection(userId: string) {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('stripe_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

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
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('webhook_events')
    .insert({
      user_id: userId || null,
      event_type: eventType,
      stripe_event_id: stripeEventId,
      payload: payload,
    })
    .select('id')
    .maybeSingle()

  if (error) return null
  return data?.id ?? null
}

export async function getWebhookEvents(userId?: string, limit = 50) {
  if (!userId) {
    const serviceClient = createServiceClient()
    const { data } = await serviceClient
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }
  const supabase = await createClient()
  const { data } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
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
  const supabase = createServiceClient()
  const { data: row } = await supabase
    .from('recovery_actions')
    .insert({
      user_id: data.userId || null,
      invoice_id: data.invoiceId,
      customer_id: data.customerId || null,
      customer_email: data.customerEmail || null,
      amount: data.amount,
      currency: data.currency || 'USD',
      action: data.action,
      status: data.status,
      result: data.result || null,
    })
    .select('id')
    .maybeSingle()
  return row?.id ?? null
}

export async function getRecoveryActions(userId?: string, limit = 100) {
  if (!userId) {
    const serviceClient = createServiceClient()
    const { data } = await serviceClient
      .from('recovery_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }
  const supabase = await createClient()
  const { data } = await supabase
    .from('recovery_actions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
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
  const supabase = createServiceClient()
  const { data: row } = await supabase
    .from('alerts')
    .insert({
      user_id: data.userId || null,
      type: data.type,
      severity: data.severity,
      title: data.title,
      message: data.message,
      metadata: data.metadata || null,
    })
    .select('id')
    .maybeSingle()
  return row?.id ?? null
}

export async function getAlerts(userId?: string, limit = 50) {
  if (!userId) {
    const serviceClient = createServiceClient()
    const { data } = await serviceClient
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }
  const supabase = await createClient()
  const { data } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function markAlertRead(id: string) {
  const supabase = await createClient()
  await supabase.from('alerts').update({ read: true }).eq('id', id)
}

export async function getUnreadAlertCount(userId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('read', false)

  if (userId) query = query.eq('user_id', userId)

  const { count } = await query
  return count ?? 0
}

// --- Interventions ---
export async function createIntervention(data: {
  userId?: string
  customerId: string
  customerEmail?: string
  type: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('interventions')
    .insert({
      user_id: data.userId || null,
      customer_id: data.customerId,
      customer_email: data.customerEmail || null,
      type: data.type,
      notes: data.notes || null,
    })
    .select('id')
    .maybeSingle()
  return row?.id ?? null
}

export async function getInterventions(userId?: string, limit = 50) {
  const supabase = await createClient()
  let query = supabase
    .from('interventions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (userId) query = query.eq('user_id', userId)

  const { data } = await query
  return data ?? []
}

// --- Alert Settings ---
export async function getAlertSettings(userId: string) {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('alert_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

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
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('alert_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  const payload = {
    user_id: userId,
    notify_email: settings.notifyEmail ?? null,
    resend_api_key: settings.resendApiKey ? encrypt(settings.resendApiKey) : null,
    email_failed_payments: settings.emailFailedPayments !== false,
    email_churn_risk: settings.emailChurnRisk !== false,
    email_billing_errors: settings.emailBillingErrors !== false,
    email_payment_recovered: settings.emailPaymentRecovered !== false,
    email_min_amount: settings.emailMinAmount ?? 0,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    await supabase.from('alert_settings').update(payload).eq('id', existing.id)
  } else {
    await supabase.from('alert_settings').insert(payload)
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
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('dunning_sequences')
    .select('id')
    .eq('invoice_id', data.invoiceId)
    .maybeSingle()

  if (existing) return existing.id

  const now = new Date()
  const { data: row } = await supabase
    .from('dunning_sequences')
    .insert({
      user_id: data.userId || null,
      invoice_id: data.invoiceId,
      customer_id: data.customerId || null,
      customer_email: data.customerEmail,
      customer_name: data.customerName || null,
      amount: data.amount,
      currency: data.currency || 'USD',
      status: 'active',
      step: 0,
      next_email_due_at: now.toISOString(),
    })
    .select('id')
    .maybeSingle()

  return row?.id ?? null
}

export async function getDunningSequences(userId?: string, limit = 100) {
  const supabase = await createClient()
  let query = supabase
    .from('dunning_sequences')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (userId) query = query.eq('user_id', userId)

  const { data } = await query
  return data ?? []
}

export async function getDunningSequenceDue() {
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('dunning_sequences')
    .select('*')
    .eq('status', 'active')
    .lt('step', 3)
    .lte('next_email_due_at', now)
    .order('next_email_due_at', { ascending: true })
    .limit(50)

  return data ?? []
}

export async function advanceDunningStep(id: string, nextDueAt: Date | null) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: seq } = await supabase
    .from('dunning_sequences')
    .select('step')
    .eq('id', id)
    .maybeSingle()

  if (!seq) return

  if (nextDueAt === null) {
    await supabase
      .from('dunning_sequences')
      .update({
        step: seq.step + 1,
        last_email_sent_at: now,
        status: 'exhausted',
        next_email_due_at: null,
      })
      .eq('id', id)
  } else {
    await supabase
      .from('dunning_sequences')
      .update({
        step: seq.step + 1,
        last_email_sent_at: now,
        next_email_due_at: nextDueAt.toISOString(),
      })
      .eq('id', id)
  }
}

export async function cancelDunningSequence(invoiceId: string) {
  const supabase = await createClient()
  await supabase
    .from('dunning_sequences')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('invoice_id', invoiceId)
}

export async function recoverDunningSequence(invoiceId: string) {
  const supabase = await createClient()
  await supabase
    .from('dunning_sequences')
    .update({
      status: 'recovered',
      recovered_at: new Date().toISOString(),
    })
    .eq('invoice_id', invoiceId)
}
