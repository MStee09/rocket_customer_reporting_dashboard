/*
  # Fix Auth RLS Performance - Shipment Related Tables

  1. Performance Improvements
    - Wrap JWT function calls in SELECT to prevent per-row re-evaluation
    - Applies to shipment_address, shipment_carrier, shipment_detail, 
      shipment_item, shipment_note, shipment_accessorial
    
  2. Changes
    - Updates all shipment-related table policies to use optimized auth calls
    
  3. Security
    - No permission changes, only performance optimization
*/

-- Shipment Address
DROP POLICY IF EXISTS "Admins can view shipment addresses" ON shipment_address;
CREATE POLICY "Admins can view shipment addresses"
  ON shipment_address FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- Shipment Carrier
DROP POLICY IF EXISTS "Admins can view shipment carriers" ON shipment_carrier;
CREATE POLICY "Admins can view shipment carriers"
  ON shipment_carrier FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- Shipment Detail
DROP POLICY IF EXISTS "Admins can view shipment details" ON shipment_detail;
CREATE POLICY "Admins can view shipment details"
  ON shipment_detail FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- Shipment Item
DROP POLICY IF EXISTS "Admins can view shipment items" ON shipment_item;
CREATE POLICY "Admins can view shipment items"
  ON shipment_item FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- Shipment Note
DROP POLICY IF EXISTS "Admins can view shipment notes" ON shipment_note;
CREATE POLICY "Admins can view shipment notes"
  ON shipment_note FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- Shipment Accessorial
DROP POLICY IF EXISTS "Admins can view shipment accessorials" ON shipment_accessorial;
CREATE POLICY "Admins can view shipment accessorials"
  ON shipment_accessorial FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );