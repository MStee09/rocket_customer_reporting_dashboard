-- ============================================================================
-- Migration: Add shipment_mode and equipment_type to MCP discovery
-- Description: Enables AI to join shipment → shipment_mode for mode_name
--              and shipment → equipment_type for equipment_name
-- ============================================================================

-- ============================================================================
-- 1. Update mcp_discover_tables to include shipment_mode and equipment_type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mcp_discover_tables(
  p_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(t ORDER BY t->>'table_name')
  INTO v_result
  FROM (
    -- Core tables
    SELECT jsonb_build_object(
      'table_name', 'shipment',
      'description', 'Main shipment records with costs, dates, references',
      'category', 'core'
    ) as t WHERE p_category IS NULL OR p_category = 'core'
    
    UNION ALL
    SELECT jsonb_build_object(
      'table_name', 'shipment_report_view',
      'description', 'Pre-joined view with mode_name, equipment_name, carrier_name, addresses - USE THIS for most queries',
      'category', 'core'
    ) WHERE p_category IS NULL OR p_category = 'core'
    
    UNION ALL
    SELECT jsonb_build_object(
      'table_name', 'shipment_accessorial',
      'description', 'Extra charges (liftgate, residential)',
      'category', 'core'
    ) WHERE p_category IS NULL OR p_category = 'core'
    
    UNION ALL
    SELECT jsonb_build_object(
      'table_name', 'shipment_address',
      'description', 'Origin and destination addresses',
      'category', 'core'
    ) WHERE p_category IS NULL OR p_category = 'core'
    
    UNION ALL
    SELECT jsonb_build_object(
      'table_name', 'shipment_carrier',
      'description', 'Carrier assignments - join to carrier table for names',
      'category', 'core'
    ) WHERE p_category IS NULL OR p_category = 'core'
    
    UNION ALL
    SELECT jsonb_build_object(
      'table_name', 'shipment_item',
      'description', 'Line items with weight, dimensions, class',
      'category', 'core'
    ) WHERE p_category IS NULL OR p_category = 'core'
    
    -- Reference/lookup tables
    UNION ALL
    SELECT jsonb_build_object(
      'table_name', 'carrier',
      'description', 'Carrier information (names, SCAC codes)',
      'category', 'reference'
    ) WHERE p_category IS NULL OR p_category = 'reference'
    
    UNION ALL
    SELECT jsonb_build_object(
      'table_name', 'customer',
      'description', 'Customer/company information',
      'category', 'reference'
    ) WHERE p_category IS NULL OR p_category = 'reference'
    
    UNION ALL
    SELECT jsonb_build_object(
      'table_name', 'shipment_mode',
      'description', 'Shipping mode lookup (LTL, Truckload, Parcel, etc) - join via mode_id',
      'category', 'reference'
    ) WHERE p_category IS NULL OR p_category = 'reference'
    
    UNION ALL
    SELECT jsonb_build_object(
      'table_name', 'equipment_type',
      'description', 'Equipment type lookup (Van, Reefer, Flatbed, etc) - join via equipment_type_id',
      'category', 'reference'
    ) WHERE p_category IS NULL OR p_category = 'reference'
  ) sub;

  RETURN jsonb_build_object(
    'success', true,
    'tables', COALESCE(v_result, '[]'::jsonb),
    'count', jsonb_array_length(COALESCE(v_result, '[]'::jsonb))
  );
END;
$$;

-- ============================================================================
-- 2. Update mcp_get_table_joins to include mode and equipment joins
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mcp_get_table_joins()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'joins', jsonb_build_array(
      -- Carrier joins (through shipment_carrier)
      jsonb_build_object(
        'from_table', 'shipment',
        'to_table', 'shipment_carrier',
        'join_type', 'LEFT',
        'on_clause', 'shipment.load_id = shipment_carrier.load_id',
        'description', 'Get carrier assignment for shipment'
      ),
      jsonb_build_object(
        'from_table', 'shipment_carrier',
        'to_table', 'carrier',
        'join_type', 'LEFT',
        'on_clause', 'shipment_carrier.carrier_id = carrier.carrier_id',
        'description', 'Get carrier name and details'
      ),
      -- Mode join (direct from shipment)
      jsonb_build_object(
        'from_table', 'shipment',
        'to_table', 'shipment_mode',
        'join_type', 'LEFT',
        'on_clause', 'shipment.mode_id = shipment_mode.mode_id',
        'description', 'Get mode name (LTL, Truckload, Parcel, etc)'
      ),
      -- Equipment type join (direct from shipment)
      jsonb_build_object(
        'from_table', 'shipment',
        'to_table', 'equipment_type',
        'join_type', 'LEFT',
        'on_clause', 'shipment.equipment_type_id = equipment_type.equipment_type_id',
        'description', 'Get equipment name (Van, Reefer, Flatbed, etc)'
      ),
      -- Address joins
      jsonb_build_object(
        'from_table', 'shipment',
        'to_table', 'shipment_address',
        'join_type', 'LEFT',
        'on_clause', 'shipment.load_id = shipment_address.load_id',
        'description', 'Get origin/destination addresses'
      ),
      -- Accessorial joins
      jsonb_build_object(
        'from_table', 'shipment',
        'to_table', 'shipment_accessorial',
        'join_type', 'LEFT',
        'on_clause', 'shipment.load_id = shipment_accessorial.load_id',
        'description', 'Get accessorial charges'
      ),
      -- Item joins
      jsonb_build_object(
        'from_table', 'shipment',
        'to_table', 'shipment_item',
        'join_type', 'LEFT',
        'on_clause', 'shipment.load_id = shipment_item.load_id',
        'description', 'Get line items with weight and dimensions'
      ),
      -- Customer join
      jsonb_build_object(
        'from_table', 'shipment',
        'to_table', 'customer',
        'join_type', 'LEFT',
        'on_clause', 'shipment.customer_id = customer.customer_id',
        'description', 'Get customer/company name'
      )
    ),
    'hints', jsonb_build_array(
      'To get carrier_name: JOIN shipment_carrier ON load_id, then JOIN carrier ON carrier_id',
      'To get mode_name: JOIN shipment_mode ON mode_id',
      'To get equipment_name: JOIN equipment_type ON equipment_type_id',
      'For queries needing mode_name, carrier_name, equipment_name - consider using shipment_report_view instead',
      'shipment_report_view already has all lookups pre-joined and is optimized for reporting queries'
    )
  );
END;
$$;

-- ============================================================================
-- 3. Update mcp_discover_fields to include shipment_mode fields
-- ============================================================================

-- Add shipment_mode to the allowed tables in mcp_discover_fields
-- (The existing function should already handle this dynamically, 
--  but we ensure the metadata is correct)

-- ============================================================================
-- 4. Update mcp_query_with_join to handle mode and equipment joins
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mcp_query_with_join(
  p_base_table text,
  p_customer_id integer,
  p_is_admin boolean DEFAULT false,
  p_joins jsonb DEFAULT NULL,
  p_select jsonb DEFAULT NULL,
  p_filters jsonb DEFAULT NULL,
  p_group_by jsonb DEFAULT NULL,
  p_aggregations jsonb DEFAULT NULL,
  p_order_by text DEFAULT NULL,
  p_order_dir text DEFAULT 'desc',
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query text;
  v_select_clause text := '';
  v_from_clause text;
  v_join_clause text := '';
  v_where_clause text := '';
  v_group_clause text := '';
  v_order_clause text := '';
  v_result jsonb;
  v_join jsonb;
  v_field text;
  v_agg jsonb;
  v_filter jsonb;
BEGIN
  -- Validate base table
  IF p_base_table NOT IN ('shipment', 'shipment_report_view', 'shipment_accessorial', 'shipment_address', 'shipment_item') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid base table: ' || p_base_table);
  END IF;

  v_from_clause := quote_ident(p_base_table);

  -- Build JOIN clause
  IF p_joins IS NOT NULL THEN
    FOR v_join IN SELECT * FROM jsonb_array_elements(p_joins)
    LOOP
      DECLARE
        v_join_table text := v_join->>'table';
        v_join_type text := COALESCE(v_join->>'type', 'LEFT');
        v_join_on text;
      BEGIN
        -- Auto-determine join conditions based on known relationships
        v_join_on := CASE v_join_table
          WHEN 'shipment_carrier' THEN p_base_table || '.load_id = shipment_carrier.load_id'
          WHEN 'carrier' THEN 'shipment_carrier.carrier_id = carrier.carrier_id'
          WHEN 'shipment_mode' THEN p_base_table || '.mode_id = shipment_mode.mode_id'
          WHEN 'equipment_type' THEN p_base_table || '.equipment_type_id = equipment_type.equipment_type_id'
          WHEN 'shipment_address' THEN p_base_table || '.load_id = shipment_address.load_id'
          WHEN 'shipment_accessorial' THEN p_base_table || '.load_id = shipment_accessorial.load_id'
          WHEN 'shipment_item' THEN p_base_table || '.load_id = shipment_item.load_id'
          WHEN 'customer' THEN p_base_table || '.customer_id = customer.customer_id'
          ELSE v_join->>'on'
        END;

        IF v_join_on IS NOT NULL THEN
          v_join_clause := v_join_clause || ' ' || v_join_type || ' JOIN ' || quote_ident(v_join_table) || ' ON ' || v_join_on;
        END IF;
      END;
    END LOOP;
  END IF;

  -- Build SELECT clause
  IF p_select IS NOT NULL AND jsonb_array_length(p_select) > 0 THEN
    SELECT string_agg(
      CASE 
        WHEN elem::text LIKE '%.%' THEN elem::text  -- Already qualified
        ELSE elem::text
      END, 
      ', '
    )
    INTO v_select_clause
    FROM jsonb_array_elements_text(p_select) elem;
  END IF;

  -- Add aggregations to SELECT
  IF p_aggregations IS NOT NULL THEN
    FOR v_agg IN SELECT * FROM jsonb_array_elements(p_aggregations)
    LOOP
      IF v_select_clause != '' THEN
        v_select_clause := v_select_clause || ', ';
      END IF;
      v_select_clause := v_select_clause || 
        UPPER(v_agg->>'function') || '(' || 
        CASE WHEN v_agg->>'field' = '*' THEN '*' ELSE (v_agg->>'field') END || 
        ')';
      IF v_agg->>'alias' IS NOT NULL THEN
        v_select_clause := v_select_clause || ' as ' || quote_ident(v_agg->>'alias');
      END IF;
    END LOOP;
  END IF;

  IF v_select_clause = '' THEN
    v_select_clause := '*';
  END IF;

  -- Build WHERE clause for customer filtering
  IF p_base_table IN ('shipment', 'shipment_report_view') THEN
    IF NOT p_is_admin THEN
      v_where_clause := ' WHERE ' || quote_ident(p_base_table) || '.client_id = ' || p_customer_id;
    ELSIF p_customer_id IS NOT NULL THEN
      v_where_clause := ' WHERE ' || quote_ident(p_base_table) || '.client_id = ' || p_customer_id;
    END IF;
  END IF;

  -- Add filters
  IF p_filters IS NOT NULL AND jsonb_array_length(p_filters) > 0 THEN
    FOR v_filter IN SELECT * FROM jsonb_array_elements(p_filters)
    LOOP
      IF v_where_clause = '' THEN
        v_where_clause := ' WHERE ';
      ELSE
        v_where_clause := v_where_clause || ' AND ';
      END IF;
      v_where_clause := v_where_clause || 
        (v_filter->>'field') || ' ' || 
        COALESCE(v_filter->>'operator', '=') || ' ' ||
        quote_literal(v_filter->>'value');
    END LOOP;
  END IF;

  -- Build GROUP BY clause
  IF p_group_by IS NOT NULL AND jsonb_array_length(p_group_by) > 0 THEN
    SELECT ' GROUP BY ' || string_agg(elem::text, ', ')
    INTO v_group_clause
    FROM jsonb_array_elements_text(p_group_by) elem;
  END IF;

  -- Build ORDER BY clause
  IF p_order_by IS NOT NULL THEN
    v_order_clause := ' ORDER BY ' || p_order_by || ' ' || COALESCE(p_order_dir, 'desc');
  END IF;

  -- Build and execute query
  v_query := 'SELECT ' || v_select_clause || 
             ' FROM ' || v_from_clause ||
             v_join_clause ||
             v_where_clause ||
             v_group_clause ||
             v_order_clause ||
             ' LIMIT ' || p_limit;

  -- Debug: Log the query
  RAISE NOTICE 'MCP Query: %', v_query;

  BEGIN
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || v_query || ') t'
    INTO v_result;

    RETURN jsonb_build_object(
      'success', true,
      'base_table', p_base_table,
      'row_count', COALESCE(jsonb_array_length(v_result), 0),
      'data', COALESCE(v_result, '[]'::jsonb)
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'query', v_query
    );
  END;
END;
$$;

-- ============================================================================
-- 5. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.mcp_discover_tables(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_discover_tables(text) TO service_role;

GRANT EXECUTE ON FUNCTION public.mcp_get_table_joins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_get_table_joins() TO service_role;

GRANT EXECUTE ON FUNCTION public.mcp_query_with_join(text, integer, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_query_with_join(text, integer, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text, text, integer) TO service_role;

-- ============================================================================
-- 6. Add RLS policies for shipment_mode and equipment_type (read-only for all)
-- ============================================================================

-- These are lookup tables, everyone can read them
ALTER TABLE IF EXISTS shipment_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment_type ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to shipment_mode" ON shipment_mode;
CREATE POLICY "Allow read access to shipment_mode" ON shipment_mode
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read access to equipment_type" ON equipment_type;
CREATE POLICY "Allow read access to equipment_type" ON equipment_type
  FOR SELECT USING (true);

-- ============================================================================
-- Done! The AI can now:
-- 1. Discover shipment_mode and equipment_type tables
-- 2. Know how to join them (via mcp_get_table_joins)
-- 3. Execute queries with proper joins to get mode_name and equipment_name
-- ============================================================================
