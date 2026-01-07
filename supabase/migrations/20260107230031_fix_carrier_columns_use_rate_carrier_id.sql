/*
  # Fix Carrier Columns to Use rate_carrier_id

  1. Changes
    - Updated shipment_report_view to use shipment.rate_carrier_id instead of shipment_carrier table
    - Join directly to carrier table using rate_carrier_id
    - This is the correct carrier reference according to the schema

  2. Purpose
    - Fix carrier data accuracy in reports
    - Use the correct carrier reference field (rate_carrier_id)
    - Avoid using shipment_carrier table which has outdated/incorrect assignments

  3. Notes
    - The shipment_carrier table contains outdated carrier assignments
    - shipment.rate_carrier_id is the authoritative carrier reference
    - This ensures carrier analytics show accurate data
    - Must drop and recreate customer_intelligence materialized view
*/

-- Drop dependent materialized view first
DROP MATERIALIZED VIEW IF EXISTS customer_intelligence;

-- Drop and recreate the shipment_report_view
DROP VIEW IF EXISTS shipment_report_view;

CREATE VIEW shipment_report_view AS
SELECT
  s.load_id,
  s.client_id,
  s.customer_id,
  s.pickup_date,
  s.pickup_date as shipped_date,
  s.delivery_date,
  s.delivery_date as delivered_date,
  s.expected_delivery_date,
  s.retail,
  s.miles,
  s.reference_number,
  s.status_id,
  s.mode_id,
  s.equipment_type_id,
  s.created_date,

  s.rate_carrier_id as carrier_id,
  COALESCE(c.carrier_name, 'Unassigned') as carrier_name,

  COALESCE(st.status_name, st.status_description, 'Unknown') as status_name,
  COALESCE(st.status_name, st.status_description, 'Unknown') as delivery_status,
  COALESCE(m.mode_name, 'Unknown') as mode_name,
  COALESCE(e.equipment_name, 'Unknown') as equipment_name,

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

  (s.status_id IN (9, 10)) as is_completed,
  (s.status_id = 11) as is_cancelled,

  CASE
    WHEN s.status_id IN (9, 10) AND s.expected_delivery_date IS NOT NULL AND s.delivery_date IS NOT NULL
      THEN s.delivery_date > s.expected_delivery_date
    WHEN s.status_id NOT IN (9, 10, 11) AND s.expected_delivery_date IS NOT NULL
      THEN s.expected_delivery_date < CURRENT_DATE
    ELSE false
  END as is_late,

  si.total_weight,
  si.has_hazmat

FROM shipment s

LEFT JOIN carrier c ON s.rate_carrier_id = c.carrier_id

LEFT JOIN shipment_status st ON s.status_id = st.status_id
LEFT JOIN shipment_mode m ON s.mode_id = m.mode_id
LEFT JOIN equipment_type e ON s.equipment_type_id = e.equipment_type_id

LEFT JOIN shipment_address origin_addr
  ON s.load_id = origin_addr.load_id AND origin_addr.address_type = 1

LEFT JOIN shipment_address dest_addr
  ON s.load_id = dest_addr.load_id AND dest_addr.address_type = 2

LEFT JOIN (
  SELECT
    load_id,
    SUM(weight) as total_weight,
    BOOL_OR(is_hazmat) as has_hazmat
  FROM shipment_item
  GROUP BY load_id
) si ON s.load_id = si.load_id;

COMMENT ON VIEW shipment_report_view IS 'Flattened shipment view using rate_carrier_id for carrier info and status flags for reporting';

-- Recreate the customer_intelligence materialized view
CREATE MATERIALIZED VIEW customer_intelligence AS
SELECT
  customer_id,
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
  0 as total_accessorial_charges,
  SUM(CASE WHEN has_hazmat THEN 1 ELSE 0 END) as hazmat_shipments
FROM shipment_report_view
WHERE customer_id IS NOT NULL
GROUP BY customer_id;

CREATE UNIQUE INDEX ON customer_intelligence (customer_id);
