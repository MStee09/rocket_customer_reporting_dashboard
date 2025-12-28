/*
  # Fix Scheduled Reports Customer Policy

  1. Problem
    - The "Customers can view their schedules" policy needs to use users_customers
    
  2. Solution
    - Update to use users_customers table with optimized auth call
*/

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