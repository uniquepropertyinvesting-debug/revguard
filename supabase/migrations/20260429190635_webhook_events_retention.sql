/*
  # Webhook Events Retention

  Adds an automated 90-day retention policy for the `webhook_events` table.
  Webhook payloads can grow unbounded; old events are kept long enough for
  debugging and idempotency duplicate detection (Stripe redelivers within
  ~3 days at most), then purged.

  1. Functions
    - `purge_old_webhook_events()` — deletes rows older than 90 days
  2. Schedule
    - Runs daily at 03:17 UTC via pg_cron
  3. Indexes
    - `idx_webhook_events_created_at` — speeds up the retention sweep
  4. Notes
    - Retention window: 90 days. Stripe&rsquo;s longest redelivery window is
      far shorter, so idempotency is preserved.
    - The job is idempotent and safe to re-run.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
  ON public.webhook_events (created_at);

CREATE OR REPLACE FUNCTION public.purge_old_webhook_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.webhook_events
  WHERE created_at < (now() - interval '90 days');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_webhook_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_webhook_events() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'purge_old_webhook_events_daily'
  ) THEN
    PERFORM cron.schedule(
      'purge_old_webhook_events_daily',
      '17 3 * * *',
      $cron$SELECT public.purge_old_webhook_events();$cron$
    );
  END IF;
END $$;
