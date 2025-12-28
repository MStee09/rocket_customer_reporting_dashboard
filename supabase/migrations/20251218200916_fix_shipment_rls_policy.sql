/*
  # Fix Shipment RLS Policy

  1. Changes
    - Drop existing shipment RLS policy
    - Create new policies that properly check user access
    - Admin users can see all shipments
    - Customer users can only see shipments for customers they're linked to

  2. Security
    - Maintains strict access control
    - Properly queries user_roles table and users_customers table
*/

DROP POLICY IF EXISTS "Admins can view all shipments via client cascade" ON shipment;

CREATE POLICY "Admins can view all shipments"
  ON shipment
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Customers can view their assigned shipments"
  ON shipment
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
