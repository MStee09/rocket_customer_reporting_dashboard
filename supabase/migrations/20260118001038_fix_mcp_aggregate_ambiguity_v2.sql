/*
  # Fix mcp_aggregate Function Ambiguity v2
  
  ## Problem
  There are multiple versions of mcp_aggregate with different signatures causing ambiguity.
  
  ## Solution
  Drop ALL versions and recreate only the complete version with p_order_dir parameter.
*/

-- Drop ALL versions of mcp_aggregate
DROP FUNCTION IF EXISTS public.mcp_aggregate(text, integer, boolean, text, text, text, jsonb, integer);
DROP FUNCTION IF EXISTS public.mcp_aggregate(text, integer, boolean, text, text, text, jsonb, text, integer);

-- Recreate the complete version with all parameters
CREATE OR REPLACE FUNCTION public.mcp_aggregate(
  p_table_name text,
  p_customer_id integer,
  p_is_admin boolean,
  p_group_by text,
  p_metric text,
  p_aggregation text,
  p_filters jsonb DEFAULT '[]'::jsonb,
  p_order_dir text DEFAULT 'desc',
  p_limit integer DEFAULT 20
)
RETURNS jsonb
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
BEGIN
  -- Validate order direction
  v_order_direction := CASE 
    WHEN lower(p_order_dir) IN ('asc', 'ascending') THEN 'ASC'
    ELSE 'DESC'
  END;

  -- Build base query
  v_query := format(
    'SELECT %I as label, %s(%I) as value FROM %I',
    p_group_by,
    upper(p_aggregation),
    p_metric,
    p_table_name
  );

  -- Always filter by customer_id for shipment table
  IF p_table_name = 'shipment' THEN
    v_where_clauses := array_append(v_where_clauses, format('customer_id = %L', p_customer_id));
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

  -- Add GROUP BY, ORDER BY, and LIMIT
  v_query := v_query || format(' GROUP BY %I ORDER BY value %s LIMIT %s', 
    p_group_by, 
    v_order_direction, 
    p_limit
  );

  -- Execute and return
  EXECUTE format('SELECT jsonb_build_object(
    ''success'', true,
    ''query'', %L,
    ''group_by'', %L,
    ''metric'', %L,
    ''aggregation'', %L,
    ''row_count'', (SELECT COUNT(*) FROM (%s) t),
    ''data'', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (%s) t), ''[]''::jsonb)
  )', v_query, p_group_by, p_metric, p_aggregation, v_query, v_query)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.mcp_aggregate(text, integer, boolean, text, text, text, jsonb, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_aggregate(text, integer, boolean, text, text, text, jsonb, text, integer) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.mcp_aggregate IS 'MCP tool for aggregating data with grouping. Supports SUM, AVG, COUNT, MIN, MAX aggregations with optional filters and ordering.';
