/*
  # Fix dashboard_widgets RLS policies

  1. Issues Fixed
    - Customer policies had incorrect SQL (was trying to select customer_id from user_roles)
    - Need to use users_customers table to get customer_id for users
    - Missing support for admin-only widgets (customer_id IS NULL)
    
  2. Changes
    - Drop all existing policies
    - Recreate with correct SQL using users_customers table
    - Add support for admins to manage their own widgets (customer_id IS NULL)
    - Add support for customers to manage their customer-specific widgets
    
  3. Security
    - Admins can view/manage all widgets (both admin-only and customer-specific)
    - Customers can only view/manage widgets for their own customer_id (via users_customers table)
    - Both admins and customers authenticated via user_roles table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Admins can insert any dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Admins can update any dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Admins can delete any dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Customers can view own dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Customers can insert own dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Customers can update own dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Customers can delete own dashboard widgets" ON dashboard_widgets;

-- Admin policies (can access all widgets)
CREATE POLICY "Admins can view all dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert dashboard widgets"
  ON dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update all dashboard widgets"
  ON dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can delete any dashboard widgets"
  ON dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Customer policies (can only access their customer_id widgets)
CREATE POLICY "Customers can view own dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert own dashboard widgets"
  ON dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can update own dashboard widgets"
  ON dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can delete own dashboard widgets"
  ON dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = auth.uid()
    )
  );
