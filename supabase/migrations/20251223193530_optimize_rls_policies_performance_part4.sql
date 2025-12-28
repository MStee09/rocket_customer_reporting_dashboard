/*
  # Optimize RLS Policies for Performance (Part 4)

  1. Changes
    - Optimize dashboard_widgets policies
    - Optimize AI knowledge and related table policies
    - Use SELECT wrappers for auth.uid() and current_setting()

  2. Notes
    - Improves query performance at scale
    - Policies are dropped and recreated with optimized versions
*/

-- Optimize dashboard_widgets policies
DROP POLICY IF EXISTS "Admins can view all dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can view all dashboard widgets"
  ON dashboard_widgets
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can insert dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can insert dashboard widgets"
  ON dashboard_widgets
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can update all dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can update all dashboard widgets"
  ON dashboard_widgets
  FOR UPDATE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin')
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete any dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can delete any dashboard widgets"
  ON dashboard_widgets
  FOR DELETE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Customers can view own dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Customers can view own dashboard widgets"
  ON dashboard_widgets
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can insert own dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Customers can insert own dashboard widgets"
  ON dashboard_widgets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can update own dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Customers can update own dashboard widgets"
  ON dashboard_widgets
  FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can delete own dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Customers can delete own dashboard widgets"
  ON dashboard_widgets
  FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

-- Optimize ai_knowledge_documents policies
DROP POLICY IF EXISTS "Admins can view all knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can view all knowledge documents"
  ON ai_knowledge_documents
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can insert knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can insert knowledge documents"
  ON ai_knowledge_documents
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can update knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can update knowledge documents"
  ON ai_knowledge_documents
  FOR UPDATE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin')
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can delete knowledge documents"
  ON ai_knowledge_documents
  FOR DELETE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');
