/*
  # Create AI Insight Log Table

  1. New Tables
    - `ai_insight_log`
      - `id` (uuid, primary key)
      - `customer_id` (text, required) - Customer the insight was generated for
      - `insight_type` (text) - Type of insight (observation, trend, anomaly, etc.)
      - `insight_text` (text) - The generated insight text
      - `context_summary` (text) - Brief context that was used to generate insight
      - `audience` (text) - Target audience (executive, operations, finance)
      - `tokens_used` (integer) - Output tokens used
      - `model_used` (text) - Model that generated the insight
      - `latency_ms` (integer) - Response time in milliseconds
      - `created_at` (timestamptz) - When the insight was generated

  2. Security
    - Enable RLS on `ai_insight_log` table
    - Add policies for admins to read all logs
    - Add policies for customers to read their own logs

  3. Indexes
    - Index on customer_id for filtering
    - Index on created_at for time-based queries
*/

CREATE TABLE IF NOT EXISTS ai_insight_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  insight_type text,
  insight_text text,
  context_summary text,
  audience text DEFAULT 'operations',
  tokens_used integer DEFAULT 0,
  model_used text DEFAULT 'claude-3-haiku-20240307',
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_insight_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_insight_log_customer_id ON ai_insight_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_insight_log_created_at ON ai_insight_log(created_at DESC);

CREATE POLICY "Admins can read all insight logs"
  ON ai_insight_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Customers can read own insight logs"
  ON ai_insight_log
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT uc.customer_id::text FROM users_customers uc
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert insight logs"
  ON ai_insight_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);
