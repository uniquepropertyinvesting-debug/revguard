/*
  # Add audit log table for compliance tracking

  1. New Tables
    - `audit_log`
      - `id` (uuid, primary key) - Unique event ID
      - `user_id` (uuid, not null) - The user who performed the action
      - `action` (text, not null) - Action type (e.g., 'login', 'export_csv', 'password_change', 'stripe_retry')
      - `resource_type` (text) - What type of resource was affected (e.g., 'payment', 'subscription', 'settings')
      - `resource_id` (text) - ID of the affected resource
      - `details` (jsonb) - Additional context about the action
      - `ip_address` (text) - Client IP address
      - `created_at` (timestamptz) - When the action occurred

  2. Security
    - Enable RLS on `audit_log` table
    - Users can only read their own audit entries
    - Insert policy for authenticated users (own entries only)

  3. Notes
    - Indexed on user_id and created_at for fast lookups
    - JSONB details column for flexible metadata storage
    - No delete/update policies -- audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text DEFAULT '',
  resource_id text DEFAULT '',
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit log"
  ON audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit entries"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
