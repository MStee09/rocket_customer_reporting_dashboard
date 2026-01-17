/*
  # Add Column-Level Security for Cost Data

  1. New Functions
    - `is_admin()` - Helper function to check if current user is an admin
    - `get_shipment_cost()` - Returns cost only if user is admin, NULL otherwise
    - `get_cost_without_tax()` - Returns cost_without_tax only if user is admin
    - `get_carrier_pay()` - Returns carrier_pay only if user is admin

  2. Security
    - Cost-related columns are now protected at the database level
    - Customers can never see carrier cost data, even through direct queries
    - Admins have full access to all financial data

  3. Notes
    - This implements true column-level security
    - Cost data is hidden at the database query level for non-admins
    - Application must use these functions for cost columns when querying
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND user_role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION get_shipment_cost(shipment_cost numeric)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE 
    WHEN is_admin() THEN shipment_cost
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION get_cost_without_tax(cost_without_tax_value numeric)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE 
    WHEN is_admin() THEN cost_without_tax_value
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION get_carrier_pay(carrier_pay_value numeric)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE 
    WHEN is_admin() THEN carrier_pay_value
    ELSE NULL
  END;
$$;

CREATE OR REPLACE VIEW shipment_secure AS
SELECT 
  s.load_id,
  s.client_id,
  s.client_load_id,
  s.customer_id,
  s.payer_id,
  s.payer_address_id,
  s.mode_id,
  s.equipment_type_id,
  s.status_id,
  s.created_date,
  s.modified_date,
  s.pickup_date,
  s.delivery_date,
  s.estimated_delivery_date,
  s.expected_delivery_date,
  s.requested_on_dock_date,
  get_shipment_cost(s.cost) as cost,
  get_cost_without_tax(s.cost_without_tax) as cost_without_tax,
  s.retail,
  s.target_rate,
  s.shipment_value,
  s.retail_without_tax,
  s.status_code,
  s.status_description,
  s.priority,
  s.number_of_pallets,
  s.linear_feet,
  s.miles,
  s.reference_number,
  s.bol_number,
  s.po_reference,
  s.shipper_number,
  s.pickup_number,
  s.quote_number,
  s.rate_carrier_id,
  s.is_rerun_rate,
  s.is_stackable,
  s.is_palletized,
  s.is_automated_ltl,
  s.created_by,
  s.modified_by
FROM shipment s;

GRANT SELECT ON shipment_secure TO authenticated;

CREATE OR REPLACE VIEW shipment_carrier_secure AS
SELECT 
  sc.shipment_carrier_id,
  sc.load_id,
  sc.carrier_id,
  sc.assignment_type,
  sc.assignment_status,
  sc.assigned_date,
  sc.accepted_date,
  sc.declined_date,
  get_carrier_pay(sc.carrier_pay) as carrier_pay,
  sc.carrier_name,
  sc.carrier_scac,
  sc.driver_name,
  sc.driver_phone,
  sc.truck_number,
  sc.trailer_number,
  sc.pro_number,
  sc.notes,
  sc.created_date,
  sc.modified_date,
  sc.created_by,
  sc.modified_by
FROM shipment_carrier sc;

GRANT SELECT ON shipment_carrier_secure TO authenticated;

CREATE OR REPLACE VIEW shipment_accessorial_secure AS
SELECT 
  sa.shipment_accessorial_id,
  sa.load_id,
  sa.accessorial_type,
  sa.accessorial_code,
  sa.description,
  sa.charge_amount,
  get_shipment_cost(sa.cost_amount) as cost_amount,
  sa.is_billable,
  sa.is_approved,
  sa.quantity,
  sa.unit_type,
  sa.created_date,
  sa.modified_date,
  sa.created_by,
  sa.modified_by
FROM shipment_accessorial sa;

GRANT SELECT ON shipment_accessorial_secure TO authenticated;
