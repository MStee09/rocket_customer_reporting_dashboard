/*
  # Optimize RLS Policies for Performance (Part 6 - Final)

  1. Changes
    - Optimize ai_learning_feedback policies
    - Optimize ai_report_audit policies
    - Optimize ai_knowledge policies
    - Use SELECT wrappers for auth.uid() and current_setting()

  2. Notes
    - Improves query performance at scale
    - Policies are dropped and recreated with optimized versions
    - This is the final batch of RLS policy optimizations
*/

-- Optimize ai_learning_feedback policies
DROP POLICY IF EXISTS "Admins can read all feedback" ON ai_learning_feedback;
CREATE POLICY "Admins can read all feedback"
  ON ai_learning_feedback
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can insert feedback" ON ai_learning_feedback;
CREATE POLICY "Admins can insert feedback"
  ON ai_learning_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can update feedback" ON ai_learning_feedback;
CREATE POLICY "Admins can update feedback"
  ON ai_learning_feedback
  FOR UPDATE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin')
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

-- Optimize ai_report_audit policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON ai_report_audit;
CREATE POLICY "Admins can view all audit logs"
  ON ai_report_audit
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can update audit logs" ON ai_report_audit;
CREATE POLICY "Admins can update audit logs"
  ON ai_report_audit
  FOR UPDATE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin')
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

-- Optimize ai_knowledge policies
DROP POLICY IF EXISTS "Admins can view all knowledge" ON ai_knowledge;
CREATE POLICY "Admins can view all knowledge"
  ON ai_knowledge
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can insert knowledge" ON ai_knowledge;
CREATE POLICY "Admins can insert knowledge"
  ON ai_knowledge
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can update knowledge" ON ai_knowledge;
CREATE POLICY "Admins can update knowledge"
  ON ai_knowledge
  FOR UPDATE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin')
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete knowledge" ON ai_knowledge;
CREATE POLICY "Admins can delete knowledge"
  ON ai_knowledge
  FOR DELETE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');
