/*
  # Add RLS Policies to Carrier Table

  1. Changes
    - Enable RLS on carrier table
    - Add policy for admins to view all carriers
    - Add policy for customers to view carriers used in their shipments

  2. Security
    - Admins can see all carriers
    - Customers can only see carriers associated with their shipments
*/

ALTER TABLE carrier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all carriers"
  ON carrier
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Customers can view carriers for their shipments"
  ON carrier
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'customer'
    )
    AND carrier_id IN (
      SELECT DISTINCT sc.carrier_id 
      FROM shipment_carrier sc
      JOIN shipment s ON s.load_id = sc.load_id
      WHERE s.customer_id IN (
        SELECT customer_id FROM users_customers
        WHERE users_customers.user_id = auth.uid()
      )
    )
  );
