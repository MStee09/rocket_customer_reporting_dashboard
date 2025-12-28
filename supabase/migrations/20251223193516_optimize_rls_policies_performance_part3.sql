/*
  # Optimize RLS Policies for Performance (Part 3)

  1. Changes
    - Optimize shipment-related table policies (address, carrier, detail, item, note, accessorial)
    - Use SELECT wrappers for auth.uid() and current_setting()

  2. Notes
    - Improves query performance at scale
    - Policies are dropped and recreated with optimized versions
*/

-- Optimize shipment_address policies
DROP POLICY IF EXISTS "Admins can view shipment addresses" ON shipment_address;
CREATE POLICY "Admins can view shipment addresses"
  ON shipment_address
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Customers can view shipment addresses for their shipments" ON shipment_address;
CREATE POLICY "Customers can view shipment addresses for their shipments"
  ON shipment_address
  FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
      )
    )
  );

-- Optimize shipment_carrier policies
DROP POLICY IF EXISTS "Admins can view shipment carriers" ON shipment_carrier;
CREATE POLICY "Admins can view shipment carriers"
  ON shipment_carrier
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Customers can view shipment carriers for their shipments" ON shipment_carrier;
CREATE POLICY "Customers can view shipment carriers for their shipments"
  ON shipment_carrier
  FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
      )
    )
  );

-- Optimize shipment_detail policies
DROP POLICY IF EXISTS "Admins can view shipment details" ON shipment_detail;
CREATE POLICY "Admins can view shipment details"
  ON shipment_detail
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Customers can view shipment details for their shipments" ON shipment_detail;
CREATE POLICY "Customers can view shipment details for their shipments"
  ON shipment_detail
  FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
      )
    )
  );

-- Optimize shipment_item policies
DROP POLICY IF EXISTS "Admins can view shipment items" ON shipment_item;
CREATE POLICY "Admins can view shipment items"
  ON shipment_item
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Customers can view shipment items for their shipments" ON shipment_item;
CREATE POLICY "Customers can view shipment items for their shipments"
  ON shipment_item
  FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
      )
    )
  );

-- Optimize shipment_note policies
DROP POLICY IF EXISTS "Admins can view shipment notes" ON shipment_note;
CREATE POLICY "Admins can view shipment notes"
  ON shipment_note
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Customers can view shipment notes for their shipments" ON shipment_note;
CREATE POLICY "Customers can view shipment notes for their shipments"
  ON shipment_note
  FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
      )
    )
  );

-- Optimize shipment_accessorial policies
DROP POLICY IF EXISTS "Admins can view shipment accessorials" ON shipment_accessorial;
CREATE POLICY "Admins can view shipment accessorials"
  ON shipment_accessorial
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Customers can view shipment accessorials for their shipments" ON shipment_accessorial;
CREATE POLICY "Customers can view shipment accessorials for their shipments"
  ON shipment_accessorial
  FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT load_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
      )
    )
  );
