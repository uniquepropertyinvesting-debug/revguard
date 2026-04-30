/*
  # Cron Runs Log

  Adds a small audit table so the platform can prove that scheduled jobs
  (currently the email-queue drain) are actually executing. The /status
  page and the deploy-check script can read the latest row to surface
  "last successful run" without having to scrape Netlify or Supabase logs.

  1. New Table: cron_runs
     - id (uuid, pk)
     - job (text) - identifier of the scheduled job, e.g. 'drain_emails'
     - status (text) - 'ok' or 'error'
     - processed (int) - how many items the job processed
     - error (text, nullable) - error message if status='error'
     - duration_ms (int) - how long the run took
     - ran_at (timestamptz) - when the run finished

  2. Indexes
     - (job, ran_at desc) for fast "latest run for this job" lookups

  3. Security
     - RLS enabled
     - No client policies. Only the service role (used by the cron route)
       reads/writes this table. Authenticated end-users have no access.
*/

CREATE TABLE IF NOT EXISTS cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ok',
  processed int NOT NULL DEFAULT 0,
  error text,
  duration_ms int NOT NULL DEFAULT 0,
  ran_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cron_runs_job_ran_at_idx
  ON cron_runs (job, ran_at DESC);

ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;
