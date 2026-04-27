/*
  # Add n8n automation tracking and enable Supabase Realtime

  1. New Tables
    - `n8n_workflow_runs`
      - `id` (uuid, primary key) - Unique run identifier
      - `user_id` (uuid, FK to users) - Which user owns this workflow
      - `workflow_id` (text) - n8n workflow ID
      - `workflow_name` (text) - Human-readable workflow name
      - `trigger_type` (text) - What triggered: webhook, schedule, manual
      - `status` (text) - running, success, failed, timeout
      - `event_type` (text) - e.g. payment_failed, churn_detected, dunning_step
      - `input_data` (jsonb) - Data that triggered the run
      - `output_data` (jsonb) - Result from n8n
      - `error_message` (text) - Error details if failed
      - `duration_ms` (integer) - How long the run took
      - `started_at` (timestamptz) - When the run began
      - `completed_at` (timestamptz) - When it finished
      - `created_at` (timestamptz) - Row creation time

    - `n8n_connections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to users) - Owner
      - `instance_url` (text) - n8n instance base URL
      - `api_key` (text) - Encrypted n8n API key
      - `webhook_secret` (text) - Shared secret for webhook verification
      - `is_active` (boolean) - Connection enabled
      - `last_heartbeat_at` (timestamptz) - Last successful health check
      - `created_at` (timestamptz)

  2. Realtime
    - Enable realtime on: alerts, recovery_actions, webhook_events, dunning_sequences, n8n_workflow_runs
    - This powers the live event feed on the dashboard

  3. Security
    - RLS enabled on both new tables
    - Policies: users can only see/manage their own data
    - Service role can insert workflow runs (for webhook/edge function use)

  4. Indexes
    - n8n_workflow_runs: user_id, status, workflow_id
    - n8n_connections: user_id
*/

-- n8n workflow run history
CREATE TABLE IF NOT EXISTS n8n_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  workflow_id text NOT NULL,
  workflow_name text NOT NULL DEFAULT '',
  trigger_type text NOT NULL DEFAULT 'webhook',
  status text NOT NULL DEFAULT 'running',
  event_type text,
  input_data jsonb DEFAULT '{}'::jsonb,
  output_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
  duration_ms integer,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE n8n_workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow runs"
  ON n8n_workflow_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow runs"
  ON n8n_workflow_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all workflow runs"
  ON n8n_workflow_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_n8n_runs_user ON n8n_workflow_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_n8n_runs_status ON n8n_workflow_runs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_n8n_runs_workflow ON n8n_workflow_runs(workflow_id);

-- n8n connection config per user
CREATE TABLE IF NOT EXISTS n8n_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  instance_url text NOT NULL DEFAULT '',
  api_key text,
  webhook_secret text,
  is_active boolean NOT NULL DEFAULT true,
  last_heartbeat_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE n8n_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own n8n connection"
  ON n8n_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own n8n connection"
  ON n8n_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own n8n connection"
  ON n8n_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all n8n connections"
  ON n8n_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_n8n_connections_user ON n8n_connections(user_id);

-- Enable Supabase Realtime on key tables for live dashboard feed
DO $$
BEGIN
  -- alerts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  END IF;

  -- recovery_actions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'recovery_actions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE recovery_actions;
  END IF;

  -- webhook_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'webhook_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE webhook_events;
  END IF;

  -- dunning_sequences
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dunning_sequences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dunning_sequences;
  END IF;

  -- n8n_workflow_runs
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'n8n_workflow_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE n8n_workflow_runs;
  END IF;
END $$;
