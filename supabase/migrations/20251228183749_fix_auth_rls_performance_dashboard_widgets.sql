/*
  # Fix Auth RLS Performance - Dashboard Widgets

  1. Performance Improvements
    - Wrap auth.uid() in SELECT to prevent per-row re-evaluation
    
  2. Changes
    - Updates all dashboard_widgets policies to use (select auth.uid())
    
  3. Security
    - No permission changes, only performance optimization
*/

-- Dashboard widgets admin policies
DROP POLICY IF EXISTS "Admins can view all dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can view all dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can insert dashboard widgets"
  ON dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update all dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can update all dashboard widgets"
  ON dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete any dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can delete any dashboard widgets"
  ON dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- Dashboard widgets customer policies (already optimized, recreating for consistency)
DROP POLICY IF EXISTS "Customers can view own dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Customers can view own dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can insert own dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Customers can insert own dashboard widgets"
  ON dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT customer_id FROM user_roles
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can update own dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Customers can update own dashboard widgets"
  ON dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can delete own dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Customers can delete own dashboard widgets"
  ON dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles
      WHERE user_id = (select auth.uid())
    )
  );