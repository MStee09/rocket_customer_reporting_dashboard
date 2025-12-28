/*
  # Create AI Learning Feedback Table

  1. New Tables
    - `ai_learning_feedback`
      - `id` (uuid, primary key)
      - `customer_id` (text) - Customer who triggered the feedback
      - `customer_name` (text) - Customer name for display
      - `trigger_type` (text) - Type: correction, frustration, clarification, data_issue
      - `user_message` (text) - The message that triggered feedback capture
      - `ai_assumption` (text) - What the AI assumed incorrectly
      - `actual_intent` (text) - What user actually wanted
      - `field_or_calculation` (text) - Specific field/calc that was wrong
      - `suggested_improvement` (text) - How to avoid in future
      - `conversation_context` (jsonb) - Recent messages for context
      - `admin_notes` (text) - Notes from admin review
      - `status` (text) - pending_review, reviewed, implemented, dismissed
      - `created_at` (timestamptz)
      - `reviewed_at` (timestamptz)
      - `reviewed_by` (text)

  2. Security
    - Enable RLS
    - Admins can read/write all feedback
    - Edge function (service role) can insert feedback

  3. Indexes
    - Index on status and created_at for admin queue
*/

CREATE TABLE IF NOT EXISTS ai_learning_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT,
  customer_name TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('correction', 'frustration', 'clarification', 'data_issue')),
  user_message TEXT NOT NULL,
  ai_assumption TEXT,
  actual_intent TEXT,
  field_or_calculation TEXT,
  suggested_improvement TEXT,
  conversation_context JSONB,
  admin_notes TEXT,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'reviewed', 'implemented', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

ALTER TABLE ai_learning_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all feedback"
  ON ai_learning_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert feedback"
  ON ai_learning_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update feedback"
  ON ai_learning_feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_learning_feedback_status ON ai_learning_feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_feedback_customer ON ai_learning_feedback(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_feedback_type ON ai_learning_feedback(trigger_type, created_at DESC);