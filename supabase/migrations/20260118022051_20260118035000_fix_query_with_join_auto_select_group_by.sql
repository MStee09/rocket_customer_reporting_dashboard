/*
  # Fix mcp_query_with_join to Auto-Include GROUP BY Fields in SELECT
  
  ## Problem
  When the AI calls query_with_join with group_by but without explicit select fields,
  the grouped column doesn't appear in results. This causes issues like:
  - "Total Spend by Mode" returning spend values but no mode names
  - AI having to make a second call to get the dimension labels
  
  ## Solution
  Automatically include all GROUP BY fields in the SELECT clause if they're not
  already present. This ensures dimension labels always appear in results.
  
  ## Changes
  1. Drop existing function
  2. Recreate with auto-select logic for GROUP BY fields
  3. Maintain all existing functionality
*/

-- Drop existing function
DROP FUNCTION IF EXISTS mcp_query_with_join(TEXT, INTEGER, BOOLEAN, JSONB, JSONB, JSONB, TEXT[], JSONB);

-- Recreate with auto-select GROUP BY fields
CREATE OR REPLACE FUNCTION mcp_query_with_join(
  p_base_table TEXT,
  p_customer_id INTEGER,
  p_is_admin BOOLEAN DEFAULT false,
  p_joins JSONB DEFAULT '[]'::JSONB,
  p_filters JSONB DEFAULT '[]'::JSONB,
  p_group_by JSONB DEFAULT '[]'::JSONB,
  p_select_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_aggregations JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
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
  v_agg jsonb;
  v_filter jsonb;
  v_client_id INTEGER;
  v_group_field text;
  v_effective_select TEXT[];
BEGIN
  -- Map customer_id to client_id
  v_client_id := get_client_id_for_customer(p_customer_id);

  -- Validate base table
  IF p_base_table NOT IN ('shipment', 'shipment_report_view', 'shipment_accessorial', 'shipment_address', 'shipment_item') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid base table: ' || p_base_table);
  END IF;

  v_from_clause := quote_ident(p_base_table);

  -- Build JOIN clause
  IF p_joins IS NOT NULL AND jsonb_array_length(p_joins) > 0 THEN
    FOR v_join IN SELECT * FROM jsonb_array_elements(p_joins)
    LOOP
      DECLARE
        v_join_table text := v_join->>'table';
        v_join_type text := COALESCE(v_join->>'type', 'LEFT');
        v_join_on text;
      BEGIN
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

  -- ============================================================================
  -- FIX: Auto-include GROUP BY fields in SELECT
  -- This ensures dimension labels (mode_name, carrier_name, etc.) always appear
  -- in results even if the AI forgets to explicitly select them
  -- ============================================================================
  v_effective_select := COALESCE(p_select_fields, ARRAY[]::TEXT[]);
  
  IF p_group_by IS NOT NULL AND jsonb_array_length(p_group_by) > 0 THEN
    FOR v_group_field IN SELECT jsonb_array_elements_text(p_group_by)
    LOOP
      -- Add group field to select if not already present
      IF NOT v_group_field = ANY(v_effective_select) THEN
        v_effective_select := array_append(v_effective_select, v_group_field);
      END IF;
    END LOOP;
  END IF;

  -- Build SELECT clause from effective select fields
  IF array_length(v_effective_select, 1) > 0 THEN
    v_select_clause := array_to_string(v_effective_select, ', ');
  END IF;

  -- Add aggregations to SELECT
  IF p_aggregations IS NOT NULL AND jsonb_array_length(p_aggregations) > 0 THEN
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

  -- WHERE clause - USE client_id for shipment tables
  IF p_base_table IN ('shipment', 'shipment_report_view') THEN
    v_where_clause := ' WHERE ' || quote_ident(p_base_table) || '.client_id = ' || v_client_id;
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

  -- GROUP BY clause from JSONB array
  IF p_group_by IS NOT NULL AND jsonb_array_length(p_group_by) > 0 THEN
    v_group_clause := ' GROUP BY ';
    FOR v_group_field IN SELECT jsonb_array_elements_text(p_group_by)
    LOOP
      IF v_group_clause != ' GROUP BY ' THEN
        v_group_clause := v_group_clause || ', ';
      END IF;
      v_group_clause := v_group_clause || v_group_field;
    END LOOP;
  END IF;

  -- Build and execute
  v_query := 'SELECT ' || v_select_clause || 
    ' FROM ' || v_from_clause ||
    v_join_clause ||
    v_where_clause ||
    v_group_clause ||
    ' LIMIT 100';

  BEGIN
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || v_query || ') t'
    INTO v_result;

    RETURN jsonb_build_object(
      'success', true,
      'base_table', p_base_table,
      'row_count', COALESCE(jsonb_array_length(v_result), 0),
      'data', COALESCE(v_result, '[]'::jsonb),
      'query', v_query
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION mcp_query_with_join(TEXT, INTEGER, BOOLEAN, JSONB, JSONB, JSONB, TEXT[], JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION mcp_query_with_join(TEXT, INTEGER, BOOLEAN, JSONB, JSONB, JSONB, TEXT[], JSONB) TO service_role;

-- Add comment explaining the fix
COMMENT ON FUNCTION mcp_query_with_join IS 'Query across tables with joins. Auto-includes GROUP BY fields in SELECT to ensure dimension labels always appear in results.';