/*
  # Update Shipment Report View with Country Context
  
  1. Changes
    - Modified origin_state and destination_state to append country code for non-US addresses
    - "AB" (Alberta, Canada) will now show as "AB (CA)"
    - US states remain unchanged (e.g., "CA" stays as "CA" for California)
  
  2. Purpose
    - Makes it clear when a location is outside the US
    - Prevents confusion between US states and Canadian provinces with same codes
*/

DROP VIEW IF EXISTS shipment_report_view;

CREATE VIEW shipment_report_view AS
SELECT 
  s.load_id,
  s.client_id,
  s.customer_id,
  s.pickup_date,
  s.delivery_date,
  s.expected_delivery_date,
  s.retail,
  s.miles,
  s.reference_number,
  s.status_id,
  s.mode_id,
  s.equipment_type_id,
  s.created_date,
  
  COALESCE(st.status_name, st.status_description, 'Unknown') as status_name,
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
  dest_addr.country as destination_country

FROM shipment s

LEFT JOIN shipment_status st ON s.status_id = st.status_id
LEFT JOIN shipment_mode m ON s.mode_id = m.mode_id
LEFT JOIN equipment_type e ON s.equipment_type_id = e.equipment_type_id

LEFT JOIN shipment_address origin_addr 
  ON s.load_id = origin_addr.load_id AND origin_addr.address_type = 1

LEFT JOIN shipment_address dest_addr 
  ON s.load_id = dest_addr.load_id AND dest_addr.address_type = 2;

COMMENT ON VIEW shipment_report_view IS 'Flattened shipment view for AI report generation with origin/destination addresses and country context';
