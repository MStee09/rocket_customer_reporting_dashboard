/*
  # Fix Carrier Name Join in Shipment Report View

  1. Changes
    - Added join to carrier table to get carrier_name
    - Uses COALESCE to prefer shipment_carrier.carrier_name, then fall back to carrier.carrier_name
    - This ensures carrier names display even when shipment_carrier.carrier_name is null

  2. Purpose
    - Fix missing carrier names in reports
    - Ensure carrier data displays correctly for DECKED and other customers

  3. Notes
    - shipment_carrier has carrier_id but carrier_name is often null
    - carrier table has the authoritative carrier_name
*/

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
  
  sc.carrier_id,
  COALESCE(sc.carrier_name, c.carrier_name, 'Unassigned') as carrier_name,
  
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
  END as is_late

FROM shipment s

LEFT JOIN shipment_carrier sc ON s.load_id = sc.load_id
LEFT JOIN carrier c ON sc.carrier_id = c.carrier_id

LEFT JOIN shipment_status st ON s.status_id = st.status_id
LEFT JOIN shipment_mode m ON s.mode_id = m.mode_id
LEFT JOIN equipment_type e ON s.equipment_type_id = e.equipment_type_id

LEFT JOIN shipment_address origin_addr 
  ON s.load_id = origin_addr.load_id AND origin_addr.address_type = 1

LEFT JOIN shipment_address dest_addr 
  ON s.load_id = dest_addr.load_id AND dest_addr.address_type = 2;

COMMENT ON VIEW shipment_report_view IS 'Flattened shipment view with carrier info and status flags for reporting';