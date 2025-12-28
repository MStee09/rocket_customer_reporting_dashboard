/*
  # Fix Customer RLS Policy

  1. Changes
    - Drop existing customer RLS policy
    - Create new policy that properly checks user_roles table
    - Admin users can see all customers
    - Customer users can only see customers they're linked to via users_customers

  2. Security
    - Maintains strict access control
    - Properly queries user_roles table instead of JWT claims
*/

DROP POLICY IF EXISTS "Users can view accessible customers" ON customer;

CREATE POLICY "Admins can view all customers"
  ON customer
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Customers can view their assigned customers"
  ON customer
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'customer'
    )
    AND customer_id IN (
      SELECT customer_id FROM users_customers
      WHERE users_customers.user_id = auth.uid()
    )
  );
