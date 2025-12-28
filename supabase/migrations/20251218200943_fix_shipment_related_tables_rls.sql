/*
  # Fix Shipment Related Tables RLS

  1. Changes
    - Add customer policies to shipment_address
    - Add customer policies to shipment_carrier
    - Add customer policies to shipment_detail
    - Add customer policies to shipment_item
    - Add customer policies to shipment_note
    - Add customer policies to shipment_accessorial
    - Customers can view these records if they have access to the parent shipment

  2. Security
    - Maintains strict access control
    - Follows parent shipment access rules
*/

-- shipment_address
CREATE POLICY "Customers can view shipment addresses for their shipments"
  ON shipment_address
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'customer'
    )
    AND load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM users_customers
        WHERE users_customers.user_id = auth.uid()
      )
    )
  );

-- shipment_carrier
CREATE POLICY "Customers can view shipment carriers for their shipments"
  ON shipment_carrier
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'customer'
    )
    AND load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM users_customers
        WHERE users_customers.user_id = auth.uid()
      )
    )
  );

-- shipment_detail
CREATE POLICY "Customers can view shipment details for their shipments"
  ON shipment_detail
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'customer'
    )
    AND load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM users_customers
        WHERE users_customers.user_id = auth.uid()
      )
    )
  );

-- shipment_item
CREATE POLICY "Customers can view shipment items for their shipments"
  ON shipment_item
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'customer'
    )
    AND load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM users_customers
        WHERE users_customers.user_id = auth.uid()
      )
    )
  );

-- shipment_note
CREATE POLICY "Customers can view shipment notes for their shipments"
  ON shipment_note
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'customer'
    )
    AND load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM users_customers
        WHERE users_customers.user_id = auth.uid()
      )
    )
  );

-- shipment_accessorial
CREATE POLICY "Customers can view shipment accessorials for their shipments"
  ON shipment_accessorial
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'customer'
    )
    AND load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM users_customers
        WHERE users_customers.user_id = auth.uid()
      )
    )
  );
