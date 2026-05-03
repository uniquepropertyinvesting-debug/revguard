/*
  # Deny client access to server-only tables

  These tables are written and read exclusively by the server (service role
  key) and trusted background jobs. RLS is enabled but no policies exist,
  which already blocks anon/authenticated access. To make the intent explicit
  and satisfy security linters, this migration adds restrictive deny policies
  for the `anon` and `authenticated` roles on each table.

  1. Tables affected
    - `public.app_secrets`     - encrypted application secrets
    - `public.cron_runs`       - cron job execution log
    - `public.pending_emails`  - outbound email queue

  2. Security
    - Adds explicit FOR SELECT/INSERT/UPDATE/DELETE policies that always
      evaluate to false for `anon` and `authenticated` roles.
    - Service role bypasses RLS, so background jobs and server routes are
      unaffected.

  3. Notes
    - No data is modified.
    - Uses `DROP POLICY IF EXISTS` + `CREATE POLICY` so the migration is
      safely re-runnable.
*/

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['app_secrets', 'cron_runs', 'pending_emails']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "Deny select for clients" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Deny insert for clients" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Deny update for clients" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Deny delete for clients" ON public.%I', t);

    EXECUTE format($f$
      CREATE POLICY "Deny select for clients" ON public.%I
        FOR SELECT TO anon, authenticated
        USING (false)
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Deny insert for clients" ON public.%I
        FOR INSERT TO anon, authenticated
        WITH CHECK (false)
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Deny update for clients" ON public.%I
        FOR UPDATE TO anon, authenticated
        USING (false)
        WITH CHECK (false)
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Deny delete for clients" ON public.%I
        FOR DELETE TO anon, authenticated
        USING (false)
    $f$, t);
  END LOOP;
END $$;
