/*
  # Fix Auth RLS Performance - AI Tables

  1. Performance Improvements
    - Wrap JWT function calls in SELECT to prevent per-row re-evaluation
    - Applies to ai_knowledge, ai_knowledge_documents, ai_learning_feedback, ai_report_audit
    
  2. Changes
    - Updates all AI table policies to use optimized auth calls
    
  3. Security
    - No permission changes, only performance optimization
*/

-- AI Knowledge Documents
DROP POLICY IF EXISTS "Admins can view all knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can view all knowledge documents"
  ON ai_knowledge_documents FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can insert knowledge documents"
  ON ai_knowledge_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can update knowledge documents"
  ON ai_knowledge_documents FOR UPDATE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can delete knowledge documents"
  ON ai_knowledge_documents FOR DELETE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- AI Knowledge
DROP POLICY IF EXISTS "Admins can view all knowledge" ON ai_knowledge;
CREATE POLICY "Admins can view all knowledge"
  ON ai_knowledge FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert knowledge" ON ai_knowledge;
CREATE POLICY "Admins can insert knowledge"
  ON ai_knowledge FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update knowledge" ON ai_knowledge;
CREATE POLICY "Admins can update knowledge"
  ON ai_knowledge FOR UPDATE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete knowledge" ON ai_knowledge;
CREATE POLICY "Admins can delete knowledge"
  ON ai_knowledge FOR DELETE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- AI Learning Feedback
DROP POLICY IF EXISTS "Admins can read all feedback" ON ai_learning_feedback;
CREATE POLICY "Admins can read all feedback"
  ON ai_learning_feedback FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert feedback" ON ai_learning_feedback;
CREATE POLICY "Admins can insert feedback"
  ON ai_learning_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update feedback" ON ai_learning_feedback;
CREATE POLICY "Admins can update feedback"
  ON ai_learning_feedback FOR UPDATE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- AI Report Audit
DROP POLICY IF EXISTS "Admins can view all audit logs" ON ai_report_audit;
CREATE POLICY "Admins can view all audit logs"
  ON ai_report_audit FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update audit logs" ON ai_report_audit;
CREATE POLICY "Admins can update audit logs"
  ON ai_report_audit FOR UPDATE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );