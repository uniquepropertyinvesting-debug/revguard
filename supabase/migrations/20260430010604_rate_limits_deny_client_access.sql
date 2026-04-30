/*
  # Lock down public.rate_limits to backend only

  ## Problem
  The `public.rate_limits` table has Row Level Security enabled but no
  policies, which the security auditor flags. While "RLS on + no policies"
  already denies access to `anon` and `authenticated`, adding explicit
  restrictive policies makes the intent obvious and silences the warning.

  ## Change
  1. Security
     - Add explicit RESTRICTIVE policies that deny SELECT/INSERT/UPDATE/DELETE
       on `public.rate_limits` for the `anon` and `authenticated` roles.
     - The `service_role` (used by Edge Functions / server code) bypasses
       RLS automatically, so backend rate-limiting logic continues to work
       unchanged.

  ## Notes
  - No data is modified.
  - This table is backend-only state; clients should never read or write it.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'rate_limits'
  ) THEN
    EXECUTE 'ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'rate_limits'
        AND policyname = 'Deny client select on rate_limits'
    ) THEN
      CREATE POLICY "Deny client select on rate_limits"
        ON public.rate_limits AS RESTRICTIVE FOR SELECT
        TO anon, authenticated
        USING (false);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'rate_limits'
        AND policyname = 'Deny client insert on rate_limits'
    ) THEN
      CREATE POLICY "Deny client insert on rate_limits"
        ON public.rate_limits AS RESTRICTIVE FOR INSERT
        TO anon, authenticated
        WITH CHECK (false);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'rate_limits'
        AND policyname = 'Deny client update on rate_limits'
    ) THEN
      CREATE POLICY "Deny client update on rate_limits"
        ON public.rate_limits AS RESTRICTIVE FOR UPDATE
        TO anon, authenticated
        USING (false)
        WITH CHECK (false);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'rate_limits'
        AND policyname = 'Deny client delete on rate_limits'
    ) THEN
      CREATE POLICY "Deny client delete on rate_limits"
        ON public.rate_limits AS RESTRICTIVE FOR DELETE
        TO anon, authenticated
        USING (false);
    END IF;
  END IF;
END $$;
