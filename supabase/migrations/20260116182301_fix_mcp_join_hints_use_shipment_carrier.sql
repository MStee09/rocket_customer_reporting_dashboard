/*
  # Fix MCP Join Hints to Use shipment_carrier Table
  
  Updates mcp_get_join_hints function to use the correct join path for carrier data:
  - shipment -> shipment_carrier (via load_id)
  - shipment_carrier -> carrier (via carrier_id)
  
  Instead of the old incorrect path:
  - shipment -> carrier (via rate_carrier_id)
*/

CREATE OR REPLACE FUNCTION mcp_get_join_hints(p_table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH known_joins AS (
    SELECT * FROM (VALUES
      -- Shipment to carrier via shipment_carrier (CORRECT WAY)
      ('shipment', 'shipment_carrier', 'load_id', 'load_id', 'left', 'Get carrier assignment'),
      ('shipment_carrier', 'carrier', 'carrier_id', 'carrier_id', 'left', 'Get carrier details'),
      -- Other shipment joins
      ('shipment', 'shipment_item', 'load_id', 'load_id', 'left', 'Get line items'),
      ('shipment', 'shipment_address', 'load_id', 'load_id', 'left', 'Get addresses'),
      ('shipment', 'shipment_accessorial', 'load_id', 'load_id', 'left', 'Get accessorials'),
      ('shipment', 'shipment_mode', 'mode_id', 'mode_id', 'left', 'Get mode name'),
      ('shipment', 'shipment_status', 'status_id', 'status_id', 'left', 'Get status name'),
      ('shipment', 'customer', 'customer_id', 'customer_id', 'left', 'Get customer info'),
      -- Reverse joins
      ('shipment_item', 'shipment', 'load_id', 'load_id', 'inner', 'Join to shipment'),
      ('shipment_address', 'shipment', 'load_id', 'load_id', 'inner', 'Join to shipment'),
      ('shipment_carrier', 'shipment', 'load_id', 'load_id', 'inner', 'Join to shipment'),
      ('carrier', 'shipment_carrier', 'carrier_id', 'carrier_id', 'left', 'Get carrier assignments')
    ) AS t(from_table, to_table, from_field, to_field, join_type, description)
  )
  SELECT jsonb_agg(jsonb_build_object(
    'to_table', to_table,
    'from_field', from_field,
    'to_field', to_field,
    'join_type', join_type,
    'description', description
  ))
  INTO v_result
  FROM known_joins WHERE from_table = p_table_name;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION mcp_get_join_hints IS 'Returns known join paths from a given table - uses shipment_carrier for carrier data';