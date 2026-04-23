import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { encrypt, decrypt } from '@/lib/crypto'

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (db) return db

  const dbPath = path.join(process.cwd(), 'revguard.db')
  try {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    // Run migrations on first connect
    const migrationPath = path.join(process.cwd(), 'migrations', '001_initial.sql')
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      db.exec(sql)
    }
  } catch (err: unknown) {
    console.error('[getDb] Failed to initialize database at', dbPath, ':', err instanceof Error ? err.stack : err)
    throw err
  }

  return db
}

// --- Users ---
export function upsertUser(id: string, email: string, name?: string) {
  const db = getDb()
  db.prepare(`
    INSERT INTO users (id, email, name) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name
  `).run(id, email, name || null)
}

export function getUserById(id: string) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as any
}

// --- Stripe Connections (multi-tenant) ---
export function saveStripeConnection(userId: string, secretKey: string, publishableKey?: string, webhookSecret?: string) {
  const db = getDb()
  const id = `sc_${userId}`
  db.prepare(`
    INSERT INTO stripe_connections (id, user_id, stripe_secret_key, stripe_publishable_key, webhook_secret)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      stripe_secret_key = excluded.stripe_secret_key,
      stripe_publishable_key = excluded.stripe_publishable_key,
      webhook_secret = excluded.webhook_secret
  `).run(
    id, userId,
    encrypt(secretKey),
    publishableKey ? encrypt(publishableKey) : null,
    webhookSecret ? encrypt(webhookSecret) : null,
  )
}

export function saveWebhookSecret(userId: string, webhookSecret: string) {
  const db = getDb()
  db.prepare(`
    UPDATE stripe_connections SET webhook_secret = ? WHERE user_id = ?
  `).run(encrypt(webhookSecret), userId)
}

export function getStripeConnection(userId: string) {
  const row = getDb().prepare('SELECT * FROM stripe_connections WHERE user_id = ?').get(userId) as any
  if (!row) return null
  return {
    ...row,
    stripe_secret_key: row.stripe_secret_key ? decrypt(row.stripe_secret_key) : null,
    stripe_publishable_key: row.stripe_publishable_key ? decrypt(row.stripe_publishable_key) : null,
    webhook_secret: row.webhook_secret ? decrypt(row.webhook_secret) : null,
  }
}

// --- Webhook Events ---
export function saveWebhookEvent(stripeEventId: string, eventType: string, payload: any, userId?: string) {
  const db = getDb()
  const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2)}`
  try {
    db.prepare(`
      INSERT INTO webhook_events (id, user_id, event_type, stripe_event_id, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId || null, eventType, stripeEventId, JSON.stringify(payload))
    return id
  } catch {
    return null // duplicate event
  }
}

export function getWebhookEvents(userId?: string, limit = 50) {
  const db = getDb()
  if (userId) {
    return db.prepare('SELECT * FROM webhook_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as any[]
  }
  return db.prepare('SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT ?').all(limit) as any[]
}

// --- Recovery Actions ---
export function logRecoveryAction(data: {
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
  const db = getDb()
  const id = `ra_${Date.now()}_${Math.random().toString(36).slice(2)}`
  db.prepare(`
    INSERT INTO recovery_actions (id, user_id, invoice_id, customer_id, customer_email, amount, currency, action, status, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.userId || null, data.invoiceId, data.customerId || null,
    data.customerEmail || null, data.amount, data.currency || 'USD',
    data.action, data.status, data.result || null
  )
  return id
}

export function getRecoveryActions(userId?: string, limit = 100) {
  const db = getDb()
  if (userId) {
    return db.prepare('SELECT * FROM recovery_actions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as any[]
  }
  return db.prepare('SELECT * FROM recovery_actions ORDER BY created_at DESC LIMIT ?').all(limit) as any[]
}

// --- Alerts ---
export function createAlert(data: {
  userId?: string
  type: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  title: string
  message: string
  metadata?: any
}) {
  const db = getDb()
  const id = `al_${Date.now()}_${Math.random().toString(36).slice(2)}`
  db.prepare(`
    INSERT INTO alerts (id, user_id, type, severity, title, message, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId || null, data.type, data.severity, data.title, data.message, data.metadata ? JSON.stringify(data.metadata) : null)
  return id
}

export function getAlerts(userId?: string, limit = 50) {
  const db = getDb()
  if (userId) {
    return db.prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as any[]
  }
  return db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?').all(limit) as any[]
}

export function markAlertRead(id: string) {
  getDb().prepare('UPDATE alerts SET read = 1 WHERE id = ?').run(id)
}

export function getUnreadAlertCount(userId?: string) {
  const db = getDb()
  const row = userId
    ? db.prepare('SELECT COUNT(*) as count FROM alerts WHERE user_id = ? AND read = 0').get(userId) as any
    : db.prepare('SELECT COUNT(*) as count FROM alerts WHERE read = 0').get() as any
  return row?.count || 0
}

// --- Interventions ---
export function createIntervention(data: {
  userId?: string
  customerId: string
  customerEmail?: string
  type: string
  notes?: string
}) {
  const db = getDb()
  const id = `int_${Date.now()}_${Math.random().toString(36).slice(2)}`
  db.prepare(`
    INSERT INTO interventions (id, user_id, customer_id, customer_email, type, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.userId || null, data.customerId, data.customerEmail || null, data.type, data.notes || null)
  return id
}

export function getInterventions(userId?: string, limit = 50) {
  const db = getDb()
  if (userId) {
    return db.prepare('SELECT * FROM interventions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as any[]
  }
  return db.prepare('SELECT * FROM interventions ORDER BY created_at DESC LIMIT ?').all(limit) as any[]
}

// --- Alert Settings ---
export function getAlertSettings(userId: string) {
  const row = getDb().prepare('SELECT * FROM alert_settings WHERE user_id = ?').get(userId) as any
  if (!row) return null
  return {
    ...row,
    resend_api_key: row.resend_api_key ? decrypt(row.resend_api_key) : null,
  }
}

// --- Dunning Sequences ---
export function upsertDunningSequence(data: {
  invoiceId: string
  userId?: string
  customerId?: string
  customerEmail: string
  customerName?: string
  amount: number
  currency?: string
}) {
  const db = getDb()
  const id = `ds_${data.invoiceId}`
  const nowSec = Math.floor(Date.now() / 1000)
  // Day 1 email due immediately (next_email_due_at = now)
  db.prepare(`
    INSERT INTO dunning_sequences
      (id, user_id, invoice_id, customer_id, customer_email, customer_name, amount, currency, status, step, next_email_due_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)
    ON CONFLICT(invoice_id) DO NOTHING
  `).run(id, data.userId || null, data.invoiceId, data.customerId || null,
    data.customerEmail, data.customerName || null, data.amount,
    data.currency || 'USD', nowSec)
  return id
}

export function getDunningSequences(userId?: string, limit = 100) {
  const db = getDb()
  if (userId) {
    return db.prepare('SELECT * FROM dunning_sequences WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as any[]
  }
  return db.prepare('SELECT * FROM dunning_sequences ORDER BY created_at DESC LIMIT ?').all(limit) as any[]
}

export function getDunningSequenceDue(now?: number) {
  const ts = now ?? Math.floor(Date.now() / 1000)
  return getDb().prepare(`
    SELECT * FROM dunning_sequences
    WHERE status = 'active' AND step < 3 AND (next_email_due_at IS NULL OR next_email_due_at <= ?)
    ORDER BY next_email_due_at ASC LIMIT 50
  `).all(ts) as any[]
}

export function advanceDunningStep(id: string, nextDueAt: number | null) {
  const db = getDb()
  const nowSec = Math.floor(Date.now() / 1000)
  if (nextDueAt === null) {
    // exhausted all steps
    db.prepare(`UPDATE dunning_sequences SET step = step + 1, last_email_sent_at = ?, status = 'exhausted', next_email_due_at = NULL WHERE id = ?`).run(nowSec, id)
  } else {
    db.prepare(`UPDATE dunning_sequences SET step = step + 1, last_email_sent_at = ?, next_email_due_at = ? WHERE id = ?`).run(nowSec, nextDueAt, id)
  }
}

export function cancelDunningSequence(invoiceId: string) {
  const nowSec = Math.floor(Date.now() / 1000)
  getDb().prepare(`UPDATE dunning_sequences SET status = 'cancelled', cancelled_at = ? WHERE invoice_id = ?`).run(nowSec, invoiceId)
}

export function recoverDunningSequence(invoiceId: string) {
  const nowSec = Math.floor(Date.now() / 1000)
  getDb().prepare(`UPDATE dunning_sequences SET status = 'recovered', recovered_at = ? WHERE invoice_id = ?`).run(nowSec, invoiceId)
}

export function saveAlertSettings(userId: string, settings: {
  notifyEmail?: string
  resendApiKey?: string
  emailFailedPayments?: boolean
  emailChurnRisk?: boolean
  emailBillingErrors?: boolean
  emailPaymentRecovered?: boolean
  emailMinAmount?: number
}) {
  const db = getDb()
  const id = `as_${userId}`
  db.prepare(`
    INSERT INTO alert_settings (id, user_id, notify_email, resend_api_key,
      email_failed_payments, email_churn_risk, email_billing_errors,
      email_payment_recovered, email_min_amount, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(user_id) DO UPDATE SET
      notify_email = COALESCE(excluded.notify_email, notify_email),
      resend_api_key = COALESCE(excluded.resend_api_key, resend_api_key),
      email_failed_payments = excluded.email_failed_payments,
      email_churn_risk = excluded.email_churn_risk,
      email_billing_errors = excluded.email_billing_errors,
      email_payment_recovered = excluded.email_payment_recovered,
      email_min_amount = excluded.email_min_amount,
      updated_at = strftime('%s','now')
  `).run(
    id, userId,
    settings.notifyEmail ?? null,
    settings.resendApiKey ? encrypt(settings.resendApiKey) : null,
    settings.emailFailedPayments !== false ? 1 : 0,
    settings.emailChurnRisk !== false ? 1 : 0,
    settings.emailBillingErrors !== false ? 1 : 0,
    settings.emailPaymentRecovered !== false ? 1 : 0,
    settings.emailMinAmount ?? 0,
  )
}
