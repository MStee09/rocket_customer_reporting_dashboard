/*
  # Recreate MCP Aggregate Function for Widget Builder
  
  1. Changes
    - Drop existing function and recreate with updated logic
    - Better error handling
    - Improved column sanitization
  
  2. Function Details
    - `mcp_aggregate` - Flexible aggregation for widget builder
      - p_table_name: Currently only supports 'shipment'
      - p_customer_id: Customer to filter by (0 for all)
      - p_is_admin: Whether user has admin access
      - p_group_by: Column to group by
      - p_metric: Column to aggregate
      - p_aggregation: sum, avg, count, min, max
      - p_filters: JSON array of filter objects
      - p_limit: Max rows to return
*/

-- Drop existing function
DROP FUNCTION IF EXISTS mcp_aggregate(TEXT, INTEGER, BOOLEAN, TEXT, TEXT, TEXT, JSONB, INTEGER);

-- Create new function
CREATE OR REPLACE FUNCTION mcp_aggregate(
  p_table_name TEXT,
  p_customer_id INTEGER,
  p_is_admin BOOLEAN,
  p_group_by TEXT,
  p_metric TEXT,
  p_aggregation TEXT,
  p_filters JSONB DEFAULT '[]'::JSONB,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query TEXT;
  v_result JSONB;
  v_where_clause TEXT := '';
  v_filter JSONB;
  v_agg_func TEXT;
  v_safe_group_by TEXT;
  v_safe_metric TEXT;
BEGIN
  -- Validate aggregation type
  v_agg_func := CASE LOWER(p_aggregation)
    WHEN 'sum' THEN 'SUM'
    WHEN 'avg' THEN 'AVG'
    WHEN 'count' THEN 'COUNT'
    WHEN 'min' THEN 'MIN'
    WHEN 'max' THEN 'MAX'
    ELSE 'SUM'
  END;

  -- Sanitize column names (basic protection against injection)
  v_safe_group_by := regexp_replace(p_group_by, '[^a-zA-Z0-9_]', '', 'g');
  v_safe_metric := regexp_replace(p_metric, '[^a-zA-Z0-9_]', '', 'g');

  -- Build WHERE clause from filters
  IF p_filters IS NOT NULL AND jsonb_array_length(p_filters) > 0 THEN
    FOR v_filter IN SELECT * FROM jsonb_array_elements(p_filters)
    LOOP
      IF v_where_clause != '' THEN
        v_where_clause := v_where_clause || ' AND ';
      END IF;
      
      v_where_clause := v_where_clause || format(
        '%I %s %L',
        regexp_replace(v_filter->>'field', '[^a-zA-Z0-9_]', '', 'g'),
        CASE v_filter->>'operator'
          WHEN 'eq' THEN '='
          WHEN 'neq' THEN '!='
          WHEN 'gt' THEN '>'
          WHEN 'gte' THEN '>='
          WHEN 'lt' THEN '<'
          WHEN 'lte' THEN '<='
          WHEN 'like' THEN 'ILIKE'
          WHEN 'ilike' THEN 'ILIKE'
          ELSE '='
        END,
        CASE 
          WHEN v_filter->>'operator' IN ('like', 'ilike') THEN '%' || (v_filter->>'value') || '%'
          ELSE v_filter->>'value'
        END
      );
    END LOOP;
  END IF;

  -- Add customer filter for non-admin queries
  IF NOT p_is_admin AND p_customer_id > 0 THEN
    IF v_where_clause != '' THEN
      v_where_clause := v_where_clause || ' AND ';
    END IF;
    v_where_clause := v_where_clause || format('customer_id = %s', p_customer_id);
  END IF;

  -- Build the query
  v_query := format(
    'SELECT jsonb_build_object(''data'', COALESCE(jsonb_agg(row_data), ''[]''::jsonb))
     FROM (
       SELECT jsonb_build_object(
         ''label'', COALESCE(%I::TEXT, ''Unknown''),
         ''value'', COALESCE(%s(CASE WHEN %I IS NULL THEN 0 ELSE %I END), 0)
       ) as row_data
       FROM shipment_report_view
       %s
       GROUP BY %I
       ORDER BY %s(CASE WHEN %I IS NULL THEN 0 ELSE %I END) DESC
       LIMIT %s
     ) subq',
    v_safe_group_by,
    v_agg_func,
    v_safe_metric,
    v_safe_metric,
    CASE WHEN v_where_clause != '' THEN 'WHERE ' || v_where_clause ELSE '' END,
    v_safe_group_by,
    v_agg_func,
    v_safe_metric,
    v_safe_metric,
    p_limit
  );

  -- Execute the query
  EXECUTE v_query INTO v_result;

  RETURN COALESCE(v_result, '{"data": []}'::JSONB);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'data', '[]'::JSONB
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION mcp_aggregate TO authenticated;

COMMENT ON FUNCTION mcp_aggregate IS 'Flexible aggregation function for the visual widget builder. Supports dynamic grouping and multiple aggregation types.';
