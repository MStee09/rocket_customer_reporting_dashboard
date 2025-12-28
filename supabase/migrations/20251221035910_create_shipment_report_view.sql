/*
  # Create Shipment Report View
  
  1. New Views
    - `shipment_report_view` - Flattened view of shipments with origin/destination addresses
      - All shipment base fields
      - Origin address fields prefixed with `origin_`
      - Destination address fields prefixed with `destination_`
      - Lookup values for status, mode, equipment
  
  2. Purpose
    - Provides a single queryable view for AI-generated reports
    - Eliminates need for complex joins in report queries
    - Includes human-readable names for lookup values
  
  3. Security
    - View inherits RLS from underlying tables
*/

CREATE OR REPLACE VIEW shipment_report_view AS
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
  
  -- Status lookup
  COALESCE(st.status_name, st.status_description, 'Unknown') as status_name,
  
  -- Mode lookup  
  COALESCE(m.mode_name, 'Unknown') as mode_name,
  
  -- Equipment lookup
  COALESCE(e.equipment_name, 'Unknown') as equipment_name,
  
  -- Origin address (address_type = 1)
  origin_addr.company_name as origin_company,
  origin_addr.city as origin_city,
  origin_addr.state as origin_state,
  origin_addr.postal_code as origin_zip,
  origin_addr.country as origin_country,
  
  -- Destination address (address_type = 2)
  dest_addr.company_name as destination_company,
  dest_addr.city as destination_city,
  dest_addr.state as destination_state,
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

COMMENT ON VIEW shipment_report_view IS 'Flattened shipment view for AI report generation with origin/destination addresses';
