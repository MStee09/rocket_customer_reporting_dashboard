/*
  # Fix Auth RLS Performance - Scheduled Reports

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent per-row re-evaluation
    - Significantly improves query performance at scale
    
  2. Changes
    - Updates all scheduled_reports policies to use (select auth.uid())
    
  3. Security
    - No permission changes, only performance optimization
*/

-- Drop and recreate policies with optimized auth calls
DROP POLICY IF EXISTS "Admins can view all schedules" ON scheduled_reports;
CREATE POLICY "Admins can view all schedules"
  ON scheduled_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid()) 
        AND user_role = 'admin'::user_role
    )
  );

DROP POLICY IF EXISTS "Customers can view their schedules" ON scheduled_reports;
CREATE POLICY "Customers can view their schedules"
  ON scheduled_reports FOR SELECT
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM users_customers
      WHERE user_id = (select auth.uid()) 
        AND customer_id = scheduled_reports.customer_id
    )) OR (created_by = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update schedules" ON scheduled_reports;
CREATE POLICY "Users can update schedules"
  ON scheduled_reports FOR UPDATE
  TO authenticated
  USING (
    (created_by = (select auth.uid())) OR
    (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid()) 
        AND user_role = 'admin'::user_role
    ))
  );

DROP POLICY IF EXISTS "Users can delete schedules" ON scheduled_reports;
CREATE POLICY "Users can delete schedules"
  ON scheduled_reports FOR DELETE
  TO authenticated
  USING (
    (created_by = (select auth.uid())) OR
    (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid()) 
        AND user_role = 'admin'::user_role
    ))
  );

DROP POLICY IF EXISTS "Users can create schedules" ON scheduled_reports;
CREATE POLICY "Users can create schedules"
  ON scheduled_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    (created_by = (select auth.uid())) OR
    (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid()) 
        AND user_role = 'admin'::user_role
    ))
  );