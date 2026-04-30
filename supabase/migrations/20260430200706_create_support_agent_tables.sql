/*
  # Create AI Support Agent tables

  1. New Tables
    - `support_conversations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `title` (text) - short label generated from first user message
      - `status` (text) - 'open' | 'escalated' | 'closed'
      - `created_at`, `updated_at` (timestamptz)
    - `support_messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, FK to support_conversations)
      - `role` (text) - 'user' | 'assistant' | 'system'
      - `content` (text)
      - `created_at` (timestamptz)
    - `support_tickets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `conversation_id` (uuid, nullable FK to support_conversations)
      - `subject` (text)
      - `summary` (text) - last few messages for human reviewers
      - `status` (text) - 'open' | 'in_progress' | 'resolved'
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - RLS enabled on all three tables
    - Users may only see/insert/update their own rows
    - No DELETE policies (preserve audit history)

  3. Indexes
    - Conversation lookups by user
    - Message lookups by conversation
    - Ticket lookups by user and status
*/

CREATE TABLE IF NOT EXISTS support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_conversations_user_idx
  ON support_conversations (user_id, updated_at DESC);

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON support_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON support_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON support_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_conversation_idx
  ON support_messages (conversation_id, created_at ASC);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation messages"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations c
      WHERE c.id = support_messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert into own conversations"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_conversations c
      WHERE c.id = support_messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );


CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES support_conversations(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT 'Support request',
  summary text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_idx
  ON support_tickets (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx
  ON support_tickets (status, created_at DESC);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
