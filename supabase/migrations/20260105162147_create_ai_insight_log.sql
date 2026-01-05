/*
  # Create AI Insight Log Table

  1. New Tables
    - `ai_insight_log`
      - `id` (uuid, primary key)
      - `customer_id` (text, references customer)
      - `insight_type` (text) - type of insight (observation, trend, anomaly, etc.)
      - `insight_text` (text) - the generated insight content
      - `context_summary` (text) - summary of context used
      - `audience` (text) - target audience (executive, operations, finance)
      - `tokens_used` (integer) - tokens consumed for generation
      - `model_used` (text) - model identifier (claude-3-haiku, fallback)
      - `latency_ms` (integer) - API response time
      - `created_at` (timestamptz) - when generated

  2. Security
    - Enable RLS on `ai_insight_log` table
    - Add policy for admins to read all logs
    - Add policy for users to read their customer's logs

  3. Indexes
    - Index on customer_id for filtering
    - Index on created_at for time-based queries
*/

CREATE TABLE IF NOT EXISTS ai_insight_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  insight_type text NOT NULL DEFAULT 'observation',
  insight_text text NOT NULL,
  context_summary text,
  audience text NOT NULL DEFAULT 'operations',
  tokens_used integer DEFAULT 0,
  model_used text NOT NULL DEFAULT 'fallback',
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_insight_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_insight_log_customer_id ON ai_insight_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_insight_log_created_at ON ai_insight_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insight_log_model ON ai_insight_log(model_used);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_insight_log' AND policyname = 'Admins can read all insight logs'
  ) THEN
    CREATE POLICY "Admins can read all insight logs"
      ON ai_insight_log
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_insight_log' AND policyname = 'Users can read their customer insight logs'
  ) THEN
    CREATE POLICY "Users can read their customer insight logs"
      ON ai_insight_log
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users_customers
          WHERE users_customers.user_id = auth.uid()
          AND users_customers.customer_id::text = ai_insight_log.customer_id
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_insight_log' AND policyname = 'Service role can insert insight logs'
  ) THEN
    CREATE POLICY "Service role can insert insight logs"
      ON ai_insight_log
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;
