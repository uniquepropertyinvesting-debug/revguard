/*
  # Create incidents table for uptime monitoring

  Persists incidents reported by BetterStack (or any uptime monitor) so they
  can be displayed on the public /status page.

  1. New Tables
    - `incidents`
      - `id` (uuid, primary key)
      - `external_id` (text) — provider's incident ID (BetterStack incident ID)
      - `provider` (text) — source of the incident, e.g. 'betterstack'
      - `monitor_name` (text) — name of the monitor that triggered
      - `status` (text) — 'investigating' | 'identified' | 'monitoring' | 'resolved'
      - `severity` (text) — 'minor' | 'major' | 'critical'
      - `started_at` (timestamptz) — when the incident began
      - `resolved_at` (timestamptz, nullable) — when resolved
      - `summary` (text) — short human-readable description
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Indexes
    - Unique index on (provider, external_id) for upsert safety
    - Index on started_at desc for fast recent-incident queries

  3. Security
    - RLS enabled.
    - Public SELECT policy so the status page can render incidents anonymously.
    - No INSERT/UPDATE/DELETE policies — writes happen exclusively through
      the webhook edge route which uses the service role key, bypassing RLS.
*/

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  provider text NOT NULL DEFAULT 'betterstack',
  monitor_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'investigating',
  severity text NOT NULL DEFAULT 'minor',
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS incidents_provider_external_id_key
  ON incidents (provider, external_id);

CREATE INDEX IF NOT EXISTS incidents_started_at_idx
  ON incidents (started_at DESC);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view incidents"
  ON incidents FOR SELECT
  TO anon, authenticated
  USING (true);
