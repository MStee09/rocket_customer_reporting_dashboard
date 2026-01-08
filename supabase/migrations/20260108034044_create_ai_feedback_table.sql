/*
  # Create AI Feedback Table

  1. New Tables
    - `ai_feedback`
      - `id` (uuid, primary key)
      - `customer_id` (integer, references customers)
      - `user_id` (uuid, references auth.users)
      - `conversation_id` (text) - groups messages in same conversation
      - `question` (text) - the user's question
      - `answer` (text) - the AI's response
      - `visualizations` (jsonb) - any charts/visualizations included
      - `rating` (text) - 'good' or 'bad'
      - `user_feedback` (text, nullable) - optional text feedback
      - `mode` (text, nullable) - quick/deep/visual
      - `tool_calls` (text[], nullable) - which tools were used
      - `processing_time_ms` (integer, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can insert their own feedback
    - Users can read their own feedback
    - Admins can read all feedback
*/

CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id text,
  question text NOT NULL,
  answer text NOT NULL,
  visualizations jsonb DEFAULT '[]'::jsonb,
  rating text NOT NULL CHECK (rating IN ('good', 'bad')),
  user_feedback text,
  mode text CHECK (mode IN ('quick', 'deep', 'visual') OR mode IS NULL),
  tool_calls text[] DEFAULT '{}',
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_customer_id ON ai_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at DESC);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
  ON ai_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users_customers uc
      WHERE uc.user_id = auth.uid() AND uc.customer_id = ai_feedback.customer_id
    )
  );

CREATE POLICY "Users can read their own feedback"
  ON ai_feedback
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users_customers uc
      WHERE uc.user_id = auth.uid() AND uc.customer_id = ai_feedback.customer_id
    )
  );

CREATE POLICY "Admins can read all feedback"
  ON ai_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can delete feedback"
  ON ai_feedback
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.user_role = 'admin'
    )
  );
