-- ============================================================================
-- Migration: Improve mcp_aggregate to resolve IDs to names
-- 
-- Problem: When grouping by mode_id, equipment_type_id, etc., the chart shows
-- numeric IDs instead of human-readable names like "LTL" or "Van/Dry Van"
--
-- Solution: Automatically JOIN to lookup tables when grouping by ID fields
-- ============================================================================

CREATE OR REPLACE FUNCTION mcp_aggregate(
  p_table_name TEXT,
  p_customer_id INTEGER,
  p_is_admin BOOLEAN,
  p_group_by TEXT,
  p_metric TEXT,
  p_aggregation TEXT,
  p_filters JSONB DEFAULT '[]'::JSONB,
  p_order_dir TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query text;
  v_result jsonb;
  v_where_clauses text[] := ARRAY[]::text[];
  v_filter jsonb;
  v_field text;
  v_operator text;
  v_value text;
  v_order_direction text;
  v_client_id INTEGER;
  v_label_field text;
  v_join_clause text := '';
  v_group_by_resolved text;
BEGIN
  -- CRITICAL FIX: Map customer_id to client_id
  v_client_id := get_client_id_for_customer(p_customer_id);

  -- Validate order direction
  v_order_direction := CASE 
    WHEN lower(p_order_dir) IN ('asc', 'ascending') THEN 'ASC'
    ELSE 'DESC'
  END;

  -- ============================================================
  -- SMART LABEL RESOLUTION: Convert *_id fields to *_name
  -- ============================================================
  v_label_field := p_group_by;
  v_group_by_resolved := p_group_by;
  
  IF p_table_name = 'shipment' THEN
    CASE p_group_by
      WHEN 'mode_id' THEN
        v_join_clause := ' LEFT JOIN shipment_mode sm ON shipment.mode_id = sm.mode_id';
        v_label_field := 'sm.mode_name';
        v_group_by_resolved := 'sm.mode_name';
      WHEN 'equipment_type_id' THEN
        v_join_clause := ' LEFT JOIN equipment_type et ON shipment.equipment_type_id = et.equipment_type_id';
        v_label_field := 'et.equipment_name';
        v_group_by_resolved := 'et.equipment_name';
      WHEN 'status_id' THEN
        v_join_clause := ' LEFT JOIN shipment_status ss ON shipment.status_id = ss.status_id';
        v_label_field := 'ss.status_name';
        v_group_by_resolved := 'ss.status_name';
      WHEN 'rate_carrier_id', 'carrier_id' THEN
        v_join_clause := ' LEFT JOIN carrier c ON shipment.rate_carrier_id = c.carrier_id';
        v_label_field := 'c.carrier_name';
        v_group_by_resolved := 'c.carrier_name';
      ELSE
        -- Keep original field if not a known ID field
        NULL;
    END CASE;
  END IF;

  -- Build base query with smart label
  v_query := format(
    'SELECT %s as label, %s(%I) as value FROM %I',
    v_label_field,
    upper(p_aggregation),
    p_metric,
    p_table_name
  );

  -- Add JOIN if we're resolving an ID to a name
  IF v_join_clause != '' THEN
    v_query := v_query || v_join_clause;
  END IF;

  -- Always filter by client_id for shipment table
  IF p_table_name = 'shipment' THEN
    v_where_clauses := array_append(v_where_clauses, format('shipment.client_id = %L', v_client_id));
  END IF;

  -- Process filters
  IF p_filters IS NOT NULL AND jsonb_array_length(p_filters) > 0 THEN
    FOR v_filter IN SELECT * FROM jsonb_array_elements(p_filters)
    LOOP
      v_field := v_filter->>'field';
      v_operator := COALESCE(v_filter->>'operator', 'eq');
      v_value := v_filter->>'value';

      -- Skip restricted fields for non-admins
      IF NOT p_is_admin AND v_field IN ('cost', 'margin', 'carrier_cost', 'profit', 'commission') THEN
        CONTINUE;
      END IF;

      CASE v_operator
        WHEN 'eq' THEN
          v_where_clauses := array_append(v_where_clauses, format('%I = %L', v_field, v_value));
        WHEN 'neq' THEN
          v_where_clauses := array_append(v_where_clauses, format('%I != %L', v_field, v_value));
        WHEN 'gt' THEN
          v_where_clauses := array_append(v_where_clauses, format('%I > %L', v_field, v_value));
        WHEN 'gte' THEN
          v_where_clauses := array_append(v_where_clauses, format('%I >= %L', v_field, v_value));
        WHEN 'lt' THEN
          v_where_clauses := array_append(v_where_clauses, format('%I < %L', v_field, v_value));
        WHEN 'lte' THEN
          v_where_clauses := array_append(v_where_clauses, format('%I <= %L', v_field, v_value));
        WHEN 'like', 'ilike' THEN
          v_where_clauses := array_append(v_where_clauses, format('%I ILIKE %L', v_field, '%' || v_value || '%'));
        WHEN 'in' THEN
          v_where_clauses := array_append(v_where_clauses, format('%I = ANY(%L::text[])', v_field, v_value));
        ELSE
          v_where_clauses := array_append(v_where_clauses, format('%I = %L', v_field, v_value));
      END CASE;
    END LOOP;
  END IF;

  -- Add WHERE clause if we have conditions
  IF array_length(v_where_clauses, 1) > 0 THEN
    v_query := v_query || ' WHERE ' || array_to_string(v_where_clauses, ' AND ');
  END IF;

  -- Add GROUP BY (using resolved name field), ORDER BY, and LIMIT
  v_query := v_query || format(' GROUP BY %s ORDER BY value %s LIMIT %s', 
    v_group_by_resolved, 
    v_order_direction, 
    p_limit
  );

  -- Execute and return
  EXECUTE format('SELECT jsonb_build_object(
    ''success'', true,
    ''query'', %L,
    ''group_by'', %L,
    ''group_by_resolved'', %L,
    ''metric'', %L,
    ''aggregation'', %L,
    ''row_count'', (SELECT COUNT(*) FROM (%s) t),
    ''data'', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (%s) t), ''[]''::jsonb)
  )', v_query, p_group_by, v_group_by_resolved, p_metric, p_aggregation, v_query, v_query)
  INTO v_result;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'query', v_query
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION mcp_aggregate(TEXT, INTEGER, BOOLEAN, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION mcp_aggregate(TEXT, INTEGER, BOOLEAN, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION mcp_aggregate(TEXT, INTEGER, BOOLEAN, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER) IS 
'Aggregates data with automatic ID-to-name resolution for better visualization labels.
When grouping by mode_id, equipment_type_id, etc., automatically JOINs to lookup tables
to return human-readable names like "LTL" or "Van/Dry Van" instead of numeric IDs.';