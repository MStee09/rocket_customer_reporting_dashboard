/*
  # Comprehensive Shipment Report View Update

  This migration rebuilds shipment_report_view to include ALL useful data
  from the database with proper carrier joins.

  ## Key Changes:
  1. CARRIER FIX: Uses shipment_carrier table (actual hauling carrier) instead of rate_carrier_id
  2. Added customer name from customer table
  3. Added carrier details (SCAC, PRO number, driver info, etc.)
  4. Added missing shipment fields (BOL, PO, quote number, etc.)
  5. Added aggregated accessorial charges
  6. Added shipment financial fields visible to customers

  ## Notes:
  - carrier_pay and cost_amount are EXCLUDED (admin-only sensitive data)
  - One-to-many data (accessorials, notes, items) are aggregated where possible
  - View updates automatically as underlying data changes
*/

-- Drop dependent materialized view first
DROP MATERIALIZED VIEW IF EXISTS customer_intelligence;

-- Drop and recreate the shipment_report_view
DROP VIEW IF EXISTS shipment_report_view;

CREATE VIEW shipment_report_view AS
SELECT
  -- ============================================
  -- SHIPMENT CORE FIELDS
  -- ============================================
  s.load_id,
  s.client_id,
  s.customer_id,
  s.client_load_id,
  s.payer_id,

  -- Dates
  s.pickup_date,
  s.pickup_date as shipped_date,  -- Alias for compatibility
  s.delivery_date,
  s.delivery_date as delivered_date,  -- Alias for compatibility
  s.expected_delivery_date,
  s.estimated_delivery_date,
  s.requested_on_dock_date,
  s.created_date,
  s.modified_date,

  -- Financial (customer-visible)
  s.retail,
  s.retail_without_tax,
  s.shipment_value,

  -- Dimensions
  s.miles,
  s.number_of_pallets,
  s.linear_feet,

  -- Reference numbers
  s.reference_number,
  s.bol_number,
  s.po_reference,
  s.shipper_number,
  s.pickup_number,
  s.quote_number,

  -- Status/Mode/Equipment IDs (for filtering)
  s.status_id,
  s.mode_id,
  s.equipment_type_id,

  -- Flags
  s.is_stackable,
  s.is_palletized,
  s.is_automated_ltl,
  s.priority,

  -- ============================================
  -- CUSTOMER INFO
  -- ============================================
  cust.company_name as customer_name,

  -- ============================================
  -- CARRIER INFO (from shipment_carrier - THE FIX!)
  -- ============================================
  sc.carrier_id,
  COALESCE(c.carrier_name, sc.carrier_name, 'Unassigned') as carrier_name,
  COALESCE(c.scac, sc.carrier_scac) as carrier_scac,
  c.dot_number as carrier_dot,
  c.mc_number as carrier_mc,

  -- Carrier assignment details
  sc.pro_number,
  sc.driver_name,
  sc.driver_phone,
  sc.truck_number,
  sc.trailer_number,
  sc.assignment_status as carrier_assignment_status,
  sc.assigned_date as carrier_assigned_date,
  sc.accepted_date as carrier_accepted_date,

  -- ============================================
  -- LOOKUP TABLE VALUES
  -- ============================================
  COALESCE(st.status_name, st.status_description, 'Unknown') as status_name,
  COALESCE(st.status_name, st.status_description, 'Unknown') as delivery_status,  -- Alias
  COALESCE(m.mode_name, 'Unknown') as mode_name,
  COALESCE(e.equipment_name, 'Unknown') as equipment_name,

  -- ============================================
  -- ORIGIN ADDRESS
  -- ============================================
  origin_addr.company_name as origin_company,
  origin_addr.city as origin_city,
  CASE
    WHEN origin_addr.country IS NOT NULL
      AND origin_addr.country NOT IN ('US', 'USA', 'United States', '')
    THEN CONCAT(origin_addr.state, ' (', origin_addr.country, ')')
    ELSE origin_addr.state
  END as origin_state,
  origin_addr.postal_code as origin_zip,
  origin_addr.country as origin_country,
  origin_addr.address_line1 as origin_address,
  origin_addr.contact_name as origin_contact,
  origin_addr.contact_phone as origin_phone,

  -- ============================================
  -- DESTINATION ADDRESS
  -- ============================================
  dest_addr.company_name as destination_company,
  dest_addr.city as destination_city,
  CASE
    WHEN dest_addr.country IS NOT NULL
      AND dest_addr.country NOT IN ('US', 'USA', 'United States', '')
    THEN CONCAT(dest_addr.state, ' (', dest_addr.country, ')')
    ELSE dest_addr.state
  END as destination_state,
  dest_addr.postal_code as destination_zip,
  dest_addr.country as destination_country,
  dest_addr.address_line1 as destination_address,
  dest_addr.contact_name as destination_contact,
  dest_addr.contact_phone as destination_phone,

  -- ============================================
  -- COMPUTED STATUS FLAGS
  -- ============================================
  (s.status_id IN (9, 10)) as is_completed,
  (s.status_id = 11) as is_cancelled,

  CASE
    WHEN s.status_id IN (9, 10) AND s.expected_delivery_date IS NOT NULL AND s.delivery_date IS NOT NULL
      THEN s.delivery_date > s.expected_delivery_date
    WHEN s.status_id NOT IN (9, 10, 11) AND s.expected_delivery_date IS NOT NULL
      THEN s.expected_delivery_date < CURRENT_DATE
    ELSE false
  END as is_late,

  -- Transit time calculation
  CASE
    WHEN s.delivery_date IS NOT NULL AND s.pickup_date IS NOT NULL
    THEN EXTRACT(DAY FROM (s.delivery_date - s.pickup_date))
    ELSE NULL
  END as transit_days,

  -- ============================================
  -- AGGREGATED ITEM DATA
  -- ============================================
  si.total_weight,
  si.total_pieces,
  si.has_hazmat,
  si.commodity_description,

  -- ============================================
  -- AGGREGATED ACCESSORIAL DATA
  -- ============================================
  COALESCE(acc.total_accessorial_charge, 0) as total_accessorial_charge,
  acc.accessorial_count,
  acc.accessorial_types

FROM shipment s

-- Customer join
LEFT JOIN customer cust ON s.customer_id = cust.customer_id

-- CARRIER JOIN - Using shipment_carrier (THE ACTUAL CARRIER!)
LEFT JOIN shipment_carrier sc ON s.load_id = sc.load_id
LEFT JOIN carrier c ON sc.carrier_id = c.carrier_id

-- Lookup tables
LEFT JOIN shipment_status st ON s.status_id = st.status_id
LEFT JOIN shipment_mode m ON s.mode_id = m.mode_id
LEFT JOIN equipment_type e ON s.equipment_type_id = e.equipment_type_id

-- Origin address (address_type = 1)
LEFT JOIN shipment_address origin_addr
  ON s.load_id = origin_addr.load_id AND origin_addr.address_type = 1

-- Destination address (address_type = 2)
LEFT JOIN shipment_address dest_addr
  ON s.load_id = dest_addr.load_id AND dest_addr.address_type = 2

-- Aggregated shipment items
LEFT JOIN (
  SELECT
    load_id,
    SUM(weight) as total_weight,
    SUM(quantity) as total_pieces,
    BOOL_OR(is_hazmat) as has_hazmat,
    STRING_AGG(DISTINCT commodity, ', ') as commodity_description
  FROM shipment_item
  GROUP BY load_id
) si ON s.load_id = si.load_id

-- Aggregated accessorials (customer-visible charges only)
LEFT JOIN (
  SELECT
    load_id,
    SUM(charge_amount) as total_accessorial_charge,
    COUNT(*) as accessorial_count,
    STRING_AGG(DISTINCT accessorial_type, ', ') as accessorial_types
  FROM shipment_accessorial
  WHERE is_billable = true
  GROUP BY load_id
) acc ON s.load_id = acc.load_id;

COMMENT ON VIEW shipment_report_view IS 'Comprehensive shipment reporting view with correct carrier data from shipment_carrier table, customer info, and aggregated accessorials/items';

-- ============================================
-- Recreate the customer_intelligence materialized view
-- ============================================
CREATE MATERIALIZED VIEW customer_intelligence AS
SELECT
  customer_id,
  customer_name,
  COUNT(*) as total_shipments,
  SUM(retail) as total_revenue,
  AVG(retail) as avg_shipment_value,
  COUNT(DISTINCT carrier_name) as unique_carriers,
  COUNT(DISTINCT destination_state) as unique_destinations,
  MIN(created_date) as first_shipment_date,
  MAX(created_date) as last_shipment_date,
  SUM(CASE WHEN is_late THEN 1 ELSE 0 END) as late_shipments,
  SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_shipments,
  SUM(CASE WHEN is_cancelled THEN 1 ELSE 0 END) as cancelled_shipments,
  SUM(miles) as total_miles,
  AVG(miles) as avg_miles,
  SUM(total_weight) as total_weight,
  SUM(total_accessorial_charge) as total_accessorial_charges,
  SUM(CASE WHEN has_hazmat THEN 1 ELSE 0 END) as hazmat_shipments
FROM shipment_report_view
WHERE customer_id IS NOT NULL
GROUP BY customer_id, customer_name;

CREATE UNIQUE INDEX ON customer_intelligence (customer_id);

-- Grant permissions
GRANT SELECT ON shipment_report_view TO authenticated, anon, service_role;
GRANT SELECT ON customer_intelligence TO authenticated, anon, service_role;