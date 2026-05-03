/*
  # Retention purge jobs for log-style tables

  ## Summary
  Adds scheduled purge functions for tables that grow indefinitely:
    - `audit_log`         keep 365 days
    - `cron_runs`         keep 30 days
    - `rate_limits`       keep rows untouched for 7 days

  ## Changes
  1. New functions
    - `purge_old_audit_log()`     - deletes audit_log rows older than 365 days
    - `purge_old_cron_runs()`     - deletes cron_runs older than 30 days
    - `purge_old_rate_limits()`   - deletes rate_limits inactive >7 days
  2. Security
    - All functions are SECURITY DEFINER and EXECUTE is REVOKED from PUBLIC,
      authenticated, and anon. Only the table owner / service_role can run them.
    - No RLS changes; these tables already have restrictive RLS.
  3. Notes
    - pg_cron is used to schedule the jobs daily. If pg_cron is not enabled,
      the functions can still be invoked manually by the service role.
*/

CREATE OR REPLACE FUNCTION purge_old_audit_log()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM audit_log WHERE created_at < now() - INTERVAL '365 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION purge_old_audit_log() FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION purge_old_cron_runs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM cron_runs WHERE ran_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION purge_old_cron_runs() FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION purge_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM rate_limits WHERE updated_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION purge_old_rate_limits() FROM PUBLIC, authenticated, anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-audit-log')      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-audit-log');
    PERFORM cron.unschedule('purge-cron-runs')      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-cron-runs');
    PERFORM cron.unschedule('purge-rate-limits')    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-rate-limits');

    PERFORM cron.schedule('purge-audit-log',   '17 3 * * *', $sql$SELECT purge_old_audit_log();$sql$);
    PERFORM cron.schedule('purge-cron-runs',   '23 3 * * *', $sql$SELECT purge_old_cron_runs();$sql$);
    PERFORM cron.schedule('purge-rate-limits', '29 3 * * *', $sql$SELECT purge_old_rate_limits();$sql$);
  END IF;
END $$;
