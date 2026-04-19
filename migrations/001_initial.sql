-- Users / tenants
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Per-user Stripe connections (multi-tenant)
CREATE TABLE IF NOT EXISTS stripe_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_account_id TEXT,
  stripe_secret_key TEXT NOT NULL,
  stripe_publishable_key TEXT,
  webhook_secret TEXT,
  connected_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Webhook events log
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  payload TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Recovery actions log
CREATE TABLE IF NOT EXISTS recovery_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  invoice_id TEXT NOT NULL,
  customer_id TEXT,
  customer_email TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Alerts / notifications
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Churn intervention log
CREATE TABLE IF NOT EXISTS interventions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  customer_id TEXT NOT NULL,
  customer_email TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  resolved_at INTEGER
);

-- Alert settings (email prefs + Resend API key per user)
CREATE TABLE IF NOT EXISTS alert_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  notify_email TEXT,
  resend_api_key TEXT,
  email_failed_payments INTEGER NOT NULL DEFAULT 1,
  email_churn_risk INTEGER NOT NULL DEFAULT 1,
  email_billing_errors INTEGER NOT NULL DEFAULT 1,
  email_payment_recovered INTEGER NOT NULL DEFAULT 1,
  email_min_amount INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Automated dunning sequences (track per-invoice email cadence)
CREATE TABLE IF NOT EXISTS dunning_sequences (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  invoice_id TEXT NOT NULL,
  customer_id TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',  -- active | recovered | cancelled | exhausted
  step INTEGER NOT NULL DEFAULT 0,         -- 0=not started, 1=day1, 2=day3, 3=day7
  last_email_sent_at INTEGER,
  next_email_due_at INTEGER,
  recovered_at INTEGER,
  cancelled_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_user ON webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_user ON recovery_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, read);
CREATE INDEX IF NOT EXISTS idx_interventions_user ON interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connections_user ON stripe_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_dunning_status ON dunning_sequences(status, next_email_due_at);
