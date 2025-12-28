/*
  # Fix Customer Views Authentication

  1. Problem
    - Customer views check JWT claims for user_role
    - But JWT claims are never set - app uses user_roles table
    - This causes views to return 0 rows, breaking dashboard

  2. Changes
    - Drop existing customer views
    - Recreate with proper user_roles table checks
    - Use same pattern as RLS policies

  3. Security
    - Admins see all data
    - Customers only see their assigned data via users_customers
*/

-- Drop existing views
DROP VIEW IF EXISTS shipment_customer_view;
DROP VIEW IF EXISTS shipment_carrier_customer_view;
DROP VIEW IF EXISTS shipment_accessorial_customer_view;
DROP VIEW IF EXISTS shipment_address_customer_view;
DROP VIEW IF EXISTS shipment_item_customer_view;
DROP VIEW IF EXISTS shipment_detail_customer_view;
DROP VIEW IF EXISTS shipment_note_customer_view;

-- Recreate shipment_customer_view with proper auth
CREATE VIEW shipment_customer_view AS
SELECT 
  load_id, client_id, client_load_id, customer_id, payer_id, payer_address_id,
  mode_id, equipment_type_id, status_id, created_date, modified_date,
  pickup_date, delivery_date, estimated_delivery_date, expected_delivery_date,
  requested_on_dock_date, retail, target_rate, shipment_value, retail_without_tax,
  status_code, status_description, priority, number_of_pallets, linear_feet, miles,
  reference_number, bol_number, po_reference, shipper_number, pickup_number,
  quote_number, rate_carrier_id, is_rerun_rate, is_stackable, is_palletized,
  is_automated_ltl, created_by, modified_by
FROM shipment
WHERE 
  -- Admin users see everything
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
  -- OR customer users see their assigned customers
  OR (
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

-- Recreate shipment_carrier_customer_view
CREATE VIEW shipment_carrier_customer_view AS
SELECT sc.*
FROM shipment_carrier sc
WHERE 
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM shipment_customer_view scv
    WHERE scv.load_id = sc.load_id
  );

-- Recreate shipment_accessorial_customer_view
CREATE VIEW shipment_accessorial_customer_view AS
SELECT sa.*
FROM shipment_accessorial sa
WHERE 
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM shipment_customer_view scv
    WHERE scv.load_id = sa.load_id
  );

-- Recreate shipment_address_customer_view
CREATE VIEW shipment_address_customer_view AS
SELECT sa.*
FROM shipment_address sa
WHERE 
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM shipment_customer_view scv
    WHERE scv.load_id = sa.load_id
  );

-- Recreate shipment_item_customer_view
CREATE VIEW shipment_item_customer_view AS
SELECT si.*
FROM shipment_item si
WHERE 
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM shipment_customer_view scv
    WHERE scv.load_id = si.load_id
  );

-- Recreate shipment_detail_customer_view
CREATE VIEW shipment_detail_customer_view AS
SELECT sd.*
FROM shipment_detail sd
WHERE 
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM shipment_customer_view scv
    WHERE scv.load_id = sd.load_id
  );

-- Recreate shipment_note_customer_view
CREATE VIEW shipment_note_customer_view AS
SELECT sn.*
FROM shipment_note sn
WHERE 
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM shipment_customer_view scv
    WHERE scv.load_id = sn.load_id
  );
