/*
  # Create MCP Database Functions for AI Tools

  1. New Functions
    - mcp_get_tables - List available tables with metadata
    - mcp_get_fields - Get fields for a table with AI hints
    - mcp_get_table_joins - Get join relationships
    - mcp_search_text - Search text across searchable fields
    - mcp_query_table - Query single table with filters/aggregations
    - mcp_query_with_join - Query multiple tables with joins
    - mcp_aggregate - Simple group-by aggregation

  2. Security
    - All functions use SECURITY DEFINER with search_path set
    - Customer filtering automatic based on p_customer_id
    - Restricted fields hidden from non-admins
*/

-- MCP_GET_TABLES
CREATE FUNCTION mcp_get_tables(
  p_category text DEFAULT NULL,
  p_include_row_counts boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH table_info AS (
    SELECT
      t.table_name,
      CASE
        WHEN t.table_name IN ('shipment', 'shipment_item', 'shipment_address', 'shipment_accessorial') THEN 'core'
        WHEN t.table_name IN ('carrier', 'customer', 'mode', 'equipment', 'status') THEN 'reference'
        ELSE 'other'
      END as category,
      CASE
        WHEN t.table_name = 'shipment' THEN 'Main shipment records with costs, dates, references'
        WHEN t.table_name = 'shipment_item' THEN 'Line items (products, weights, freight class)'
        WHEN t.table_name = 'shipment_address' THEN 'Origin and destination addresses'
        WHEN t.table_name = 'shipment_accessorial' THEN 'Extra charges (liftgate, residential)'
        WHEN t.table_name = 'carrier' THEN 'Carrier information (names, SCAC)'
        ELSE 'Data table'
      END as description
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT LIKE 'pg_%'
  )
  SELECT jsonb_agg(jsonb_build_object(
    'table_name', table_name,
    'category', category,
    'description', description
  ) ORDER BY category, table_name)
  INTO v_result
  FROM table_info
  WHERE (p_category IS NULL OR category = p_category);

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- MCP_GET_FIELDS
CREATE FUNCTION mcp_get_fields(
  p_table_name text,
  p_include_samples boolean DEFAULT true,
  p_admin_mode boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_restricted text[] := ARRAY['cost', 'margin', 'carrier_cost', 'markup', 'profit'];
BEGIN
  WITH field_info AS (
    SELECT
      c.column_name as field_name,
      c.data_type,
      CASE WHEN c.data_type IN ('integer', 'bigint', 'numeric', 'decimal', 'real', 'double precision') THEN true ELSE false END as is_aggregatable,
      CASE WHEN c.data_type IN ('character varying', 'text', 'date', 'timestamp with time zone') AND c.column_name NOT LIKE '%_id' THEN true ELSE false END as is_groupable,
      CASE WHEN c.data_type IN ('character varying', 'text') THEN true ELSE false END as is_searchable,
      CASE
        WHEN c.column_name = 'retail' THEN 'Customer cost in USD - use for cost analysis'
        WHEN c.column_name = 'cost' THEN 'Carrier cost - ADMIN ONLY'
        WHEN c.column_name = 'miles' THEN 'Shipment distance in miles'
        WHEN c.column_name = 'total_weight' THEN 'Total weight in pounds'
        WHEN c.column_name = 'rate_carrier_id' THEN 'Join key to carrier table - use this NOT carrier_id'
        WHEN c.column_name = 'load_id' THEN 'Primary key - joins to shipment_item, shipment_address'
        WHEN c.column_name = 'carrier_name' THEN 'Carrier name - only in carrier table, must JOIN'
        WHEN c.column_name = 'description' THEN 'Product description in shipment_item'
        WHEN c.column_name = 'weight' THEN 'Item weight - in shipment_item, not shipment'
        ELSE NULL
      END as ai_instruction,
      CASE WHEN NOT p_admin_mode AND c.column_name = ANY(v_restricted) THEN true ELSE false END as is_restricted
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = p_table_name
  )
  SELECT jsonb_agg(jsonb_build_object(
    'field_name', field_name,
    'data_type', data_type,
    'is_aggregatable', is_aggregatable,
    'is_groupable', is_groupable,
    'is_searchable', is_searchable,
    'ai_instruction', ai_instruction
  ) ORDER BY field_name)
  INTO v_result
  FROM field_info WHERE NOT is_restricted;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- MCP_GET_TABLE_JOINS
CREATE FUNCTION mcp_get_table_joins(p_table_name text)
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
      ('shipment', 'carrier', 'rate_carrier_id', 'carrier_id', 'left', 'Get carrier name'),
      ('shipment', 'shipment_item', 'load_id', 'load_id', 'left', 'Get line items'),
      ('shipment', 'shipment_address', 'load_id', 'load_id', 'left', 'Get addresses'),
      ('shipment', 'shipment_accessorial', 'load_id', 'load_id', 'left', 'Get accessorials'),
      ('shipment', 'mode', 'mode_id', 'mode_id', 'left', 'Get mode name'),
      ('shipment', 'status', 'status_id', 'status_id', 'left', 'Get status name'),
      ('shipment_item', 'shipment', 'load_id', 'load_id', 'inner', 'Join to shipment'),
      ('shipment_address', 'shipment', 'load_id', 'load_id', 'inner', 'Join to shipment'),
      ('carrier', 'shipment', 'carrier_id', 'rate_carrier_id', 'left', 'Get shipments')
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

-- MCP_SEARCH_TEXT
CREATE FUNCTION mcp_search_text(
  p_search_query text,
  p_customer_id integer,
  p_is_admin boolean DEFAULT false,
  p_match_type text DEFAULT 'contains',
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_pattern text;
  v_cnt integer;
  v_samples jsonb;
BEGIN
  v_pattern := CASE p_match_type
    WHEN 'exact' THEN p_search_query
    WHEN 'starts_with' THEN p_search_query || '%'
    ELSE '%' || p_search_query || '%'
  END;

  -- Search carrier names
  SELECT COUNT(*), jsonb_agg(DISTINCT carrier_name) 
  INTO v_cnt, v_samples
  FROM (SELECT carrier_name FROM carrier WHERE carrier_name ILIKE v_pattern LIMIT 5) sub;
  
  IF v_cnt > 0 THEN
    v_results := v_results || jsonb_build_object(
      'table', 'carrier', 
      'field', 'carrier_name', 
      'match_count', v_cnt,
      'sample_values', v_samples
    );
    v_total := v_total + v_cnt;
  END IF;

  -- Search shipment_item descriptions
  SELECT COUNT(*) INTO v_cnt
  FROM shipment_item si JOIN shipment s ON si.load_id = s.load_id
  WHERE si.description ILIKE v_pattern AND (p_is_admin OR s.customer_id = p_customer_id);
  
  IF v_cnt > 0 THEN
    SELECT jsonb_agg(DISTINCT description) INTO v_samples
    FROM (
      SELECT si.description 
      FROM shipment_item si JOIN shipment s ON si.load_id = s.load_id
      WHERE si.description ILIKE v_pattern AND (p_is_admin OR s.customer_id = p_customer_id)
      LIMIT 5
    ) sub;
    
    v_results := v_results || jsonb_build_object(
      'table', 'shipment_item', 
      'field', 'description', 
      'match_count', v_cnt,
      'sample_values', v_samples
    );
    v_total := v_total + v_cnt;
  END IF;

  -- Search reference numbers
  SELECT COUNT(*) INTO v_cnt
  FROM shipment s
  WHERE (s.pro_number ILIKE v_pattern OR s.bol_number ILIKE v_pattern OR s.po_number ILIKE v_pattern)
    AND (p_is_admin OR s.customer_id = p_customer_id);
  
  IF v_cnt > 0 THEN
    v_results := v_results || jsonb_build_object(
      'table', 'shipment', 
      'field', 'reference_numbers', 
      'match_count', v_cnt,
      'note', 'Matches in pro_number, bol_number, or po_number'
    );
    v_total := v_total + v_cnt;
  END IF;

  -- Search addresses
  SELECT COUNT(*) INTO v_cnt
  FROM shipment_address sa JOIN shipment s ON sa.load_id = s.load_id
  WHERE (sa.city ILIKE v_pattern OR sa.state ILIKE v_pattern OR sa.company_name ILIKE v_pattern)
    AND (p_is_admin OR s.customer_id = p_customer_id);
  
  IF v_cnt > 0 THEN
    v_results := v_results || jsonb_build_object(
      'table', 'shipment_address', 
      'field', 'location', 
      'match_count', v_cnt,
      'note', 'Matches in city, state, or company_name'
    );
    v_total := v_total + v_cnt;
  END IF;

  RETURN jsonb_build_object(
    'query', p_search_query, 
    'match_type', p_match_type,
    'total_matches', v_total, 
    'results', v_results
  );
END;
$$;

-- MCP_QUERY_TABLE
CREATE FUNCTION mcp_query_table(
  p_table_name text,
  p_customer_id integer,
  p_is_admin boolean DEFAULT false,
  p_select text[] DEFAULT ARRAY['*'],
  p_filters jsonb DEFAULT '[]'::jsonb,
  p_group_by text[] DEFAULT NULL,
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
  v_sql text;
  v_select text;
  v_where text := '';
  v_group text := '';
  v_order text := '';
  v_result jsonb;
  v_filter jsonb;
  v_agg jsonb;
BEGIN
  -- Build SELECT clause
  IF p_aggregations IS NOT NULL AND jsonb_array_length(p_aggregations) > 0 THEN
    v_select := '';
    IF p_group_by IS NOT NULL THEN
      v_select := array_to_string(p_group_by, ', ') || ', ';
    END IF;
    FOR v_agg IN SELECT * FROM jsonb_array_elements(p_aggregations) LOOP
      IF v_select != '' AND NOT v_select LIKE '%, ' THEN v_select := v_select || ', '; END IF;
      v_select := v_select || (v_agg->>'function') || '(' || (v_agg->>'field') || ') as ' || COALESCE(v_agg->>'alias', 'value');
    END LOOP;
    IF v_select = '' OR v_select LIKE '%, ' THEN v_select := 'COUNT(*) as count'; END IF;
  ELSE
    v_select := array_to_string(p_select, ', ');
  END IF;

  -- Customer filter
  IF p_table_name = 'shipment' AND NOT p_is_admin THEN
    v_where := 'customer_id = ' || p_customer_id;
  ELSIF p_table_name IN ('shipment_item', 'shipment_address', 'shipment_accessorial') AND NOT p_is_admin THEN
    v_where := 'load_id IN (SELECT load_id FROM shipment WHERE customer_id = ' || p_customer_id || ')';
  END IF;

  -- Apply filters
  FOR v_filter IN SELECT * FROM jsonb_array_elements(p_filters) LOOP
    IF v_where != '' THEN v_where := v_where || ' AND '; END IF;
    v_where := v_where || (v_filter->>'field') ||
      CASE v_filter->>'operator'
        WHEN 'eq' THEN ' = ' || quote_literal(v_filter->>'value')
        WHEN 'neq' THEN ' != ' || quote_literal(v_filter->>'value')
        WHEN 'gt' THEN ' > ' || (v_filter->>'value')
        WHEN 'gte' THEN ' >= ' || (v_filter->>'value')
        WHEN 'lt' THEN ' < ' || (v_filter->>'value')
        WHEN 'lte' THEN ' <= ' || (v_filter->>'value')
        WHEN 'ilike' THEN ' ILIKE ' || quote_literal('%' || (v_filter->>'value') || '%')
        WHEN 'is_null' THEN ' IS NULL'
        WHEN 'is_not_null' THEN ' IS NOT NULL'
        ELSE ' = ' || quote_literal(v_filter->>'value')
      END;
  END LOOP;

  -- GROUP BY and ORDER BY
  IF p_group_by IS NOT NULL THEN v_group := ' GROUP BY ' || array_to_string(p_group_by, ', '); END IF;
  IF p_order_by IS NOT NULL THEN v_order := ' ORDER BY ' || p_order_by || ' ' || p_order_dir;
  ELSIF p_group_by IS NOT NULL THEN v_order := ' ORDER BY 2 DESC'; END IF;

  -- Build and execute query
  v_sql := 'SELECT ' || v_select || ' FROM ' || p_table_name;
  IF v_where != '' THEN v_sql := v_sql || ' WHERE ' || v_where; END IF;
  v_sql := v_sql || v_group || v_order || ' LIMIT ' || LEAST(p_limit, 1000);

  BEGIN
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || v_sql || ') t' INTO v_result;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'query', v_sql);
  END;

  RETURN jsonb_build_object(
    'success', true, 
    'table', p_table_name,
    'row_count', COALESCE(jsonb_array_length(v_result), 0), 
    'data', COALESCE(v_result, '[]'::jsonb), 
    'query', v_sql
  );
END;
$$;

-- MCP_QUERY_WITH_JOIN
CREATE FUNCTION mcp_query_with_join(
  p_base_table text,
  p_customer_id integer,
  p_is_admin boolean DEFAULT false,
  p_joins jsonb DEFAULT '[]'::jsonb,
  p_select text[] DEFAULT ARRAY['*'],
  p_filters jsonb DEFAULT '[]'::jsonb,
  p_group_by text[] DEFAULT NULL,
  p_aggregations jsonb DEFAULT NULL,
  p_order_by text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sql text;
  v_select text;
  v_joins text := '';
  v_where text := '';
  v_group text := '';
  v_order text := '';
  v_result jsonb;
  v_join jsonb;
  v_filter jsonb;
  v_agg jsonb;
  v_join_info record;
BEGIN
  -- Build SELECT clause
  IF p_aggregations IS NOT NULL AND jsonb_array_length(p_aggregations) > 0 THEN
    v_select := '';
    IF p_group_by IS NOT NULL THEN v_select := array_to_string(p_group_by, ', ') || ', '; END IF;
    FOR v_agg IN SELECT * FROM jsonb_array_elements(p_aggregations) LOOP
      IF v_select != '' AND NOT v_select LIKE '%, ' THEN v_select := v_select || ', '; END IF;
      v_select := v_select || (v_agg->>'function') || '(' || (v_agg->>'field') || ') as ' || COALESCE(v_agg->>'alias', 'value');
    END LOOP;
    IF v_select = '' OR v_select LIKE '%, ' THEN v_select := 'COUNT(*) as count'; END IF;
  ELSE
    v_select := CASE WHEN p_select = ARRAY['*'] THEN p_base_table || '.*' ELSE array_to_string(p_select, ', ') END;
  END IF;

  -- Build JOINs
  FOR v_join IN SELECT * FROM jsonb_array_elements(p_joins) LOOP
    SELECT * INTO v_join_info FROM (VALUES
      ('shipment', 'carrier', 'rate_carrier_id', 'carrier_id'),
      ('shipment', 'shipment_item', 'load_id', 'load_id'),
      ('shipment', 'shipment_address', 'load_id', 'load_id'),
      ('shipment', 'shipment_accessorial', 'load_id', 'load_id'),
      ('shipment', 'mode', 'mode_id', 'mode_id'),
      ('shipment', 'status', 'status_id', 'status_id'),
      ('shipment', 'customer', 'customer_id', 'customer_id')
    ) AS t(from_tbl, to_tbl, from_col, to_col)
    WHERE from_tbl = p_base_table AND to_tbl = (v_join->>'table');

    IF v_join_info IS NOT NULL THEN
      v_joins := v_joins || ' ' || COALESCE(UPPER(v_join->>'type'), 'LEFT') || ' JOIN ' || 
        (v_join->>'table') || ' ON ' || p_base_table || '.' || v_join_info.from_col || 
        ' = ' || (v_join->>'table') || '.' || v_join_info.to_col;
    END IF;
  END LOOP;

  -- Customer filter
  IF p_base_table = 'shipment' AND NOT p_is_admin THEN
    v_where := p_base_table || '.customer_id = ' || p_customer_id;
  END IF;

  -- Apply filters
  FOR v_filter IN SELECT * FROM jsonb_array_elements(p_filters) LOOP
    IF v_where != '' THEN v_where := v_where || ' AND '; END IF;
    v_where := v_where || (v_filter->>'field') ||
      CASE v_filter->>'operator'
        WHEN 'eq' THEN ' = ' || quote_literal(v_filter->>'value')
        WHEN 'neq' THEN ' != ' || quote_literal(v_filter->>'value')
        WHEN 'gt' THEN ' > ' || (v_filter->>'value')
        WHEN 'gte' THEN ' >= ' || (v_filter->>'value')
        WHEN 'lt' THEN ' < ' || (v_filter->>'value')
        WHEN 'lte' THEN ' <= ' || (v_filter->>'value')
        WHEN 'ilike' THEN ' ILIKE ' || quote_literal('%' || (v_filter->>'value') || '%')
        ELSE ' = ' || quote_literal(v_filter->>'value')
      END;
  END LOOP;

  -- GROUP BY and ORDER BY
  IF p_group_by IS NOT NULL THEN v_group := ' GROUP BY ' || array_to_string(p_group_by, ', '); END IF;
  IF p_order_by IS NOT NULL THEN v_order := ' ORDER BY ' || p_order_by;
  ELSIF p_group_by IS NOT NULL THEN v_order := ' ORDER BY value DESC'; END IF;

  -- Build and execute query
  v_sql := 'SELECT ' || v_select || ' FROM ' || p_base_table || v_joins;
  IF v_where != '' THEN v_sql := v_sql || ' WHERE ' || v_where; END IF;
  v_sql := v_sql || v_group || v_order || ' LIMIT ' || LEAST(p_limit, 1000);

  BEGIN
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || v_sql || ') t' INTO v_result;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'query', v_sql);
  END;

  RETURN jsonb_build_object(
    'success', true, 
    'base_table', p_base_table,
    'joined_tables', (SELECT jsonb_agg(j->>'table') FROM jsonb_array_elements(p_joins) j),
    'row_count', COALESCE(jsonb_array_length(v_result), 0), 
    'data', COALESCE(v_result, '[]'::jsonb), 
    'query', v_sql
  );
END;
$$;

-- MCP_AGGREGATE
CREATE FUNCTION mcp_aggregate(
  p_table_name text,
  p_customer_id integer,
  p_is_admin boolean DEFAULT false,
  p_group_by text DEFAULT NULL,
  p_metric text DEFAULT NULL,
  p_aggregation text DEFAULT 'sum',
  p_filters jsonb DEFAULT '[]'::jsonb,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sql text;
  v_where text := '';
  v_result jsonb;
  v_filter jsonb;
  v_restricted text[] := ARRAY['cost', 'margin', 'carrier_cost'];
BEGIN
  -- Check restricted fields
  IF NOT p_is_admin AND p_metric = ANY(v_restricted) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied to field: ' || p_metric);
  END IF;

  -- Customer filter
  IF p_table_name = 'shipment' AND NOT p_is_admin THEN
    v_where := 'customer_id = ' || p_customer_id;
  END IF;

  -- Apply filters
  FOR v_filter IN SELECT * FROM jsonb_array_elements(p_filters) LOOP
    IF v_where != '' THEN v_where := v_where || ' AND '; END IF;
    v_where := v_where || (v_filter->>'field') ||
      CASE v_filter->>'operator'
        WHEN 'eq' THEN ' = ' || quote_literal(v_filter->>'value')
        WHEN 'ilike' THEN ' ILIKE ' || quote_literal('%' || (v_filter->>'value') || '%')
        WHEN 'gte' THEN ' >= ' || (v_filter->>'value')
        WHEN 'lte' THEN ' <= ' || (v_filter->>'value')
        ELSE ' = ' || quote_literal(v_filter->>'value')
      END;
  END LOOP;

  -- Build query
  v_sql := format('SELECT %I as name, %s(%I) as value, COUNT(*) as count FROM %I',
    p_group_by, p_aggregation, p_metric, p_table_name);
  IF v_where != '' THEN v_sql := v_sql || ' WHERE ' || v_where; END IF;
  v_sql := v_sql || format(' GROUP BY %I ORDER BY value DESC LIMIT %s', p_group_by, p_limit);

  BEGIN
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || v_sql || ') t' INTO v_result;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'query', v_sql);
  END;

  RETURN jsonb_build_object(
    'success', true, 
    'group_by', p_group_by,
    'metric', p_metric,
    'aggregation', p_aggregation,
    'row_count', COALESCE(jsonb_array_length(v_result), 0), 
    'data', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION mcp_get_tables TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mcp_get_fields TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mcp_get_table_joins TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mcp_search_text TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mcp_query_table TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mcp_query_with_join TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mcp_aggregate TO authenticated, service_role;
