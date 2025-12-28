/*
  # Optimize RLS Policies for Performance

  1. Changes
    - Wrap auth.uid() and current_setting() calls with SELECT to avoid re-evaluation per row
    - This significantly improves query performance at scale
    - Focuses on high-traffic tables: shared_reports, notifications, scheduled_reports, user_roles

  2. Notes
    - Policies are dropped and recreated with optimized versions
    - The SELECT wrapper ensures functions are evaluated once per query, not per row
*/

-- Optimize shared_reports policies
DROP POLICY IF EXISTS "Users can view shares for their customer" ON shared_reports;
CREATE POLICY "Users can view shares for their customer"
  ON shared_reports
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create shares for their customer" ON shared_reports;
CREATE POLICY "Users can create shares for their customer"
  ON shared_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update shares for their customer" ON shared_reports;
CREATE POLICY "Users can update shares for their customer"
  ON shared_reports
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

DROP POLICY IF EXISTS "Users can delete shares for their customer" ON shared_reports;
CREATE POLICY "Users can delete shares for their customer"
  ON shared_reports
  FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

-- Optimize notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Optimize scheduled_reports policies
DROP POLICY IF EXISTS "Users can view their schedules" ON scheduled_reports;
CREATE POLICY "Users can view their schedules"
  ON scheduled_reports
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create schedules" ON scheduled_reports;
CREATE POLICY "Users can create schedules"
  ON scheduled_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own schedules" ON scheduled_reports;
CREATE POLICY "Users can update their own schedules"
  ON scheduled_reports
  FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own schedules" ON scheduled_reports;
CREATE POLICY "Users can delete their own schedules"
  ON scheduled_reports
  FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- Optimize scheduled_report_runs policies
DROP POLICY IF EXISTS "Users can view runs for their schedules" ON scheduled_report_runs;
CREATE POLICY "Users can view runs for their schedules"
  ON scheduled_report_runs
  FOR SELECT
  TO authenticated
  USING (
    scheduled_report_id IN (
      SELECT id FROM scheduled_reports 
      WHERE customer_id IN (
        SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
      )
    )
  );

-- Optimize user_roles policies
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
CREATE POLICY "Admins can read all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');
