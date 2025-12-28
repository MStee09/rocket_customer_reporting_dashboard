/*
  # Fix Dashboard Widgets Policies

  1. Problem
    - Previous migration incorrectly referenced user_roles.customer_id which doesn't exist
    - Should use users_customers table to check customer access
    
  2. Solution
    - Recreate customer policies using users_customers table
    - Use optimized (select auth.uid()) pattern
    
  3. Security
    - Maintains same access control with correct table references
*/

-- Drop broken customer policies
DROP POLICY IF EXISTS "Customers can view own dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Customers can insert own dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Customers can update own dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Customers can delete own dashboard widgets" ON dashboard_widgets;

-- Recreate with correct table reference and optimized auth calls
CREATE POLICY "Customers can view own dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Customers can insert own dashboard widgets"
  ON dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Customers can update own dashboard widgets"
  ON dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Customers can delete own dashboard widgets"
  ON dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  );