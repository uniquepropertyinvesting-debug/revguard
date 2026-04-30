/*
  # Pending Emails Queue (Outage Resilience)

  Creates a durable queue for alert emails that fail to send. A scheduled retry
  endpoint drains this table so users never lose alerts because Resend was
  briefly down.

  1. New Table: pending_emails
     - id, user_id, alert_type, title, message, severity, amount
     - attempts, last_error, next_attempt_at, sent_at, created_at
  2. Index for fast queue draining (partial index where sent_at IS NULL)
  3. Security: RLS enabled with no client policies — service role only.
*/

CREATE TABLE IF NOT EXISTS pending_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  alert_type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'warning',
  amount numeric,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_emails_drain_idx
  ON pending_emails (sent_at, next_attempt_at)
  WHERE sent_at IS NULL;

ALTER TABLE pending_emails ENABLE ROW LEVEL SECURITY;
