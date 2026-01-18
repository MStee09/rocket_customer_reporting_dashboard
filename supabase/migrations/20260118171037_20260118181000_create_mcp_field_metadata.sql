/*
  # Create MCP Field Metadata System
  
  Creates a metadata table and helper function to help AI understand which fields
  live in which tables, especially for fields that exist in related tables rather
  than the main shipment table.
  
  ## New Tables
  - `mcp_field_metadata`
    - Maps field names to their table locations
    - Provides AI hints for field usage
    - Includes join paths for related tables
  
  ## New Functions
  - `mcp_find_field(p_field_name)` - Looks up field locations and usage hints
  
  ## Security
  - Enable RLS on mcp_field_metadata table
  - Grant read access to authenticated and service_role
  - Grant execute on function to authenticated and service_role
*/

-- ============================================================================
-- MCP Field Metadata Table
-- Tells the AI which table contains which fields (especially for common lookups)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mcp_field_metadata (
  id SERIAL PRIMARY KEY,
  field_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  is_primary_location BOOLEAN DEFAULT true,  -- If field exists in multiple tables, which is the main one?
  ai_hint TEXT,  -- How to use this field
  requires_join_from TEXT,  -- If querying from shipment, what table to join?
  join_path TEXT,  -- The join condition
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(field_name, table_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_mcp_field_metadata_field ON mcp_field_metadata(field_name);

-- Enable RLS
ALTER TABLE mcp_field_metadata ENABLE ROW LEVEL SECURITY;

-- Read-only access for authenticated users (metadata is not customer-specific)
CREATE POLICY "Allow authenticated read access"
  ON mcp_field_metadata
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role full access
CREATE POLICY "Allow service role full access"
  ON mcp_field_metadata
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Populate with key fields that live in related tables (not shipment)
-- ============================================================================

INSERT INTO mcp_field_metadata (field_name, table_name, is_primary_location, ai_hint, requires_join_from, join_path) VALUES
-- Carrier-related fields (in shipment_carrier)
('pro_number', 'shipment_carrier', true, 'PRO Number - carrier tracking number for LTL shipments', 'shipment', 'shipment.load_id = shipment_carrier.load_id'),
('carrier_name', 'shipment_carrier', true, 'Carrier company name - use for carrier performance analysis', 'shipment', 'shipment.load_id = shipment_carrier.load_id'),
('carrier_scac', 'shipment_carrier', true, 'Carrier SCAC code', 'shipment', 'shipment.load_id = shipment_carrier.load_id'),
('driver_name', 'shipment_carrier', true, 'Driver name assigned to shipment', 'shipment', 'shipment.load_id = shipment_carrier.load_id'),
('truck_number', 'shipment_carrier', true, 'Truck/vehicle number', 'shipment', 'shipment.load_id = shipment_carrier.load_id'),
('trailer_number', 'shipment_carrier', true, 'Trailer number', 'shipment', 'shipment.load_id = shipment_carrier.load_id'),
('carrier_pay', 'shipment_carrier', true, 'Amount paid to carrier (cost side)', 'shipment', 'shipment.load_id = shipment_carrier.load_id'),

-- Address fields (in shipment_address)
('city', 'shipment_address', true, 'Origin or destination city', 'shipment', 'shipment.load_id = shipment_address.load_id'),
('state', 'shipment_address', true, 'Origin or destination state', 'shipment', 'shipment.load_id = shipment_address.load_id'),
('postal_code', 'shipment_address', true, 'Origin or destination ZIP/postal code', 'shipment', 'shipment.load_id = shipment_address.load_id'),
('address_type', 'shipment_address', true, 'Origin (1) or Destination (2)', 'shipment', 'shipment.load_id = shipment_address.load_id'),
('company_name', 'shipment_address', true, 'Shipper or consignee company name', 'shipment', 'shipment.load_id = shipment_address.load_id'),

-- Item fields (in shipment_item)
('description', 'shipment_item', true, 'Product/item description - searchable for commodities', 'shipment', 'shipment.load_id = shipment_item.load_id'),
('weight', 'shipment_item', true, 'Item weight in pounds', 'shipment', 'shipment.load_id = shipment_item.load_id'),
('quantity', 'shipment_item', true, 'Number of pieces/units', 'shipment', 'shipment.load_id = shipment_item.load_id'),
('commodity', 'shipment_item', true, 'Commodity/freight class', 'shipment', 'shipment.load_id = shipment_item.load_id'),
('nmfc_code', 'shipment_item', true, 'NMFC freight classification code', 'shipment', 'shipment.load_id = shipment_item.load_id'),

-- Accessorial fields (in shipment_accessorial)
('accessorial_code', 'shipment_accessorial', true, 'Extra service code (liftgate, residential, etc)', 'shipment', 'shipment.load_id = shipment_accessorial.load_id'),
('accessorial_cost', 'shipment_accessorial', true, 'Cost of accessorial charge', 'shipment', 'shipment.load_id = shipment_accessorial.load_id'),

-- Lookup table fields
('mode_name', 'shipment_mode', true, 'Shipping mode name (LTL, FTL, Parcel)', 'shipment', 'shipment.mode_id = shipment_mode.mode_id'),
('equipment_name', 'equipment_type', true, 'Equipment type name (Dry Van, Reefer, Flatbed)', 'shipment', 'shipment.equipment_type_id = equipment_type.equipment_type_id')
ON CONFLICT (field_name, table_name) DO NOTHING;

-- ============================================================================
-- Function for AI to lookup field locations
-- ============================================================================

CREATE OR REPLACE FUNCTION mcp_find_field(p_field_name TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'field_name', field_name,
    'table_name', table_name,
    'is_primary_location', is_primary_location,
    'ai_hint', ai_hint,
    'requires_join_from', requires_join_from,
    'join_path', join_path
  ))
  INTO v_result
  FROM mcp_field_metadata
  WHERE field_name ILIKE p_field_name
     OR field_name ILIKE '%' || p_field_name || '%';
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Field not found in metadata. Use discover_fields to check specific tables.'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'field_name', p_field_name,
    'locations', v_result
  );
END;
$$;

-- Grant access
GRANT SELECT ON mcp_field_metadata TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mcp_find_field TO authenticated, service_role;

COMMENT ON TABLE mcp_field_metadata IS 'Maps field names to their actual table locations for AI field discovery';
COMMENT ON FUNCTION mcp_find_field IS 'AI helper to find which table contains a specific field';
