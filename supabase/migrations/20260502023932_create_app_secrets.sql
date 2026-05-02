/*
  # Create app_secrets table

  1. New Tables
    - `app_secrets`
      - `key` (text, primary key) - secret name (e.g., 'openai_api_key')
      - `value` (text) - encrypted secret value
      - `updated_at` (timestamptz) - last update timestamp

  2. Security
    - Enable RLS on `app_secrets`
    - NO policies created for clients - this table is ONLY accessible via the service role key on the server
    - Values are stored encrypted at the application layer using AES-256-GCM

  3. Notes
    - This table holds globally-shared backend secrets (like the OpenAI API key) that
      are not scoped to a single user. Access is server-side only.
*/

CREATE TABLE IF NOT EXISTS app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
