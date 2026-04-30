/*
  # Restrict execution of purge_old_webhook_events()

  ## Problem
  The maintenance function `public.purge_old_webhook_events()` is defined as
  SECURITY DEFINER, which means it runs with the privileges of its owner.
  By default PostgreSQL grants EXECUTE on functions to PUBLIC, so the
  `anon` and `authenticated` roles can call it through the PostgREST
  endpoint `/rest/v1/rpc/purge_old_webhook_events` and delete data.

  ## Change
  1. Security
     - Revoke EXECUTE on `public.purge_old_webhook_events()` from PUBLIC,
       `anon`, and `authenticated`.
     - Keep EXECUTE granted to `service_role` and `postgres` so scheduled
       jobs and admin tooling continue to work.

  ## Notes
  - No data is modified.
  - The function itself is left intact (still SECURITY DEFINER) because it
    needs elevated privileges to clean up old webhook rows when invoked
    from a trusted backend / cron context.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'purge_old_webhook_events'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.purge_old_webhook_events() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.purge_old_webhook_events() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.purge_old_webhook_events() FROM authenticated;
    GRANT  EXECUTE ON FUNCTION public.purge_old_webhook_events() TO service_role;
  END IF;
END $$;
