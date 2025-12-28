/*
  # Create AI Report Audit Table

  1. New Tables
    - `ai_report_audit`
      - `id` (uuid, primary key)
      - `customer_id` (text) - Customer identifier
      - `customer_name` (text) - Customer display name
      - `user_request` (text, required) - What the user asked for
      - `ai_interpretation` (text) - What the AI understood
      - `report_definition` (jsonb) - The full report definition generated
      - `query_used` (text) - The actual SQL query executed
      - `conversation` (jsonb) - Recent conversation context
      - `user_feedback` (text) - Feedback from user if they complained
      - `feedback_type` (text) - Category: wrong_numbers, wrong_grouping, wrong_calculation, other
      - `status` (text) - ok, flagged, reviewed, fixed
      - `admin_notes` (text) - Notes from admin review
      - `created_at` (timestamptz) - When report was generated
      - `reviewed_at` (timestamptz) - When admin reviewed
      - `reviewed_by` (uuid) - Admin who reviewed

  2. Security
    - Enable RLS
    - Admin-only access for viewing and managing audit logs
    - Edge function can insert via service role

  3. Indexes
    - Status + created_at for filtering flagged reports
    - Customer_id + created_at for customer-specific lookups
*/

CREATE TABLE IF NOT EXISTS ai_report_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT,
  customer_name TEXT,
  user_request TEXT NOT NULL,
  ai_interpretation TEXT,
  report_definition JSONB,
  query_used TEXT,
  conversation JSONB,
  user_feedback TEXT,
  feedback_type TEXT,
  status TEXT DEFAULT 'ok',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE ai_report_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_report_audit_status ON ai_report_audit(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_report_audit_customer ON ai_report_audit(customer_id, created_at DESC);

CREATE POLICY "Admins can view all audit logs"
  ON ai_report_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update audit logs"
  ON ai_report_audit
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

CREATE POLICY "Service role can insert audit logs"
  ON ai_report_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);