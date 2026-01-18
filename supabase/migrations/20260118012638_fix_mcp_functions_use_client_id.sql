-- ============================================================================
-- Migration: Fix MCP functions to use client_id instead of customer_id
-- 
-- Problem: The shipment table uses client_id for customer filtering, but
-- the MCP functions were using customer_id (which is a different field).
-- This caused queries to return 0 rows for valid customers.
--
-- customer table:
--   customer_id = 4586648 (the ID in customer table)
--   client_id = 4522769 (the ID used in shipment table)
--
-- The AI passes customer_id (4586648) but shipment.client_id contains 4522769
-- ============================================================================

-- ============================================================================
-- OPTION 1: Create a lookup function (RECOMMENDED)
-- This allows MCP functions to receive customer_id but internally use client_id
-- ============================================================================

CREATE OR REPLACE FUNCTION get_client_id_for_customer(p_customer_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id INTEGER;
BEGIN
  SELECT client_id INTO v_client_id
  FROM customer
  WHERE customer_id = p_customer_id;
  
  -- If not found, maybe p_customer_id IS the client_id already
  IF v_client_id IS NULL THEN
    -- Check if it exists as a client_id directly
    IF EXISTS (SELECT 1 FROM shipment WHERE client_id = p_customer_id LIMIT 1) THEN
      RETURN p_customer_id;
    END IF;
  END IF;
  
  RETURN COALESCE(v_client_id, p_customer_id);
END;
$$;

-- ============================================================================
-- Fix mcp_aggregate
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
BEGIN
  -- CRITICAL FIX: Map customer_id to client_id
  v_client_id := get_client_id_for_customer(p_customer_id);

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

  -- Always filter by client_id for shipment table
  IF p_table_name = 'shipment' THEN
    v_where_clauses := array_append(v_where_clauses, format('client_id = %L', v_client_id));
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

-- ============================================================================
-- Fix mcp_get_lanes
-- ============================================================================

CREATE OR REPLACE FUNCTION mcp_get_lanes(
  p_customer_id INTEGER,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_client_id INTEGER;
BEGIN
  -- CRITICAL FIX: Map customer_id to client_id
  v_client_id := get_client_id_for_customer(p_customer_id);

  SELECT jsonb_build_object(
    'success', true,
    'data', COALESCE(jsonb_agg(lane_data), '[]'::jsonb)
  )
  INTO v_result
  FROM (
    SELECT 
      jsonb_build_object(
        'origin_city', o.city,
        'origin_state', o.state,
        'destination_city', d.city,
        'destination_state', d.state,
        'lane', o.city || ', ' || o.state || ' → ' || d.city || ', ' || d.state,
        'shipment_count', COUNT(*),
        'total_spend', ROUND(SUM(s.retail)::numeric, 2)
      ) as lane_data
    FROM shipment s
    JOIN shipment_address o ON s.load_id = o.load_id AND o.address_type = 1
    JOIN shipment_address d ON s.load_id = d.load_id AND d.address_type = 0
    WHERE s.client_id = v_client_id
    GROUP BY o.city, o.state, d.city, d.state
    ORDER BY COUNT(*) DESC
    LIMIT p_limit
  ) lanes;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- Fix mcp_query_table
-- ============================================================================

CREATE OR REPLACE FUNCTION mcp_query_table(
  p_table_name TEXT,
  p_customer_id INTEGER,
  p_is_admin BOOLEAN,
  p_select TEXT[] DEFAULT ARRAY['*'],
  p_filters JSONB DEFAULT '[]'::JSONB,
  p_group_by TEXT[] DEFAULT NULL,
  p_aggregations JSONB DEFAULT NULL,
  p_order_by TEXT DEFAULT NULL,
  p_order_dir TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restricted_fields TEXT[] := ARRAY[
    'cost', 'cost_amount', 'cost_per_mile', 'margin', 'margin_percent',
    'profit', 'markup', 'carrier_cost', 'carrier_pay', 'carrier_rate',
    'target_rate', 'buy_rate', 'net_revenue', 'commission', 'cost_without_tax'
  ];
  v_field TEXT;
  v_sql TEXT;
  v_select_clause TEXT;
  v_where_clause TEXT := '';
  v_group_clause TEXT := '';
  v_order_clause TEXT := '';
  v_result JSONB;
  v_filter JSONB;
  v_agg JSONB;
  v_customer_column TEXT;
  v_safe_select TEXT[];
  v_client_id INTEGER;
BEGIN
  -- CRITICAL FIX: Map customer_id to client_id
  v_client_id := get_client_id_for_customer(p_customer_id);

  -- CRITICAL: Handle restricted fields for non-admins
  IF NOT p_is_admin THEN
    -- Check if selecting *
    IF '*' = ANY(p_select) THEN
      -- Replace * with safe fields (excluding restricted)
      SELECT array_agg(column_name::TEXT)
      INTO v_safe_select
      FROM information_schema.columns
      WHERE table_name = p_table_name
        AND table_schema = 'public'
        AND column_name != ALL(v_restricted_fields);
      p_select := v_safe_select;
    ELSE
      -- Check each selected field
      FOREACH v_field IN ARRAY p_select LOOP
        IF v_field = ANY(v_restricted_fields) THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Access denied: Field "' || v_field || '" is restricted for customer users',
            'suggestion', 'Use "retail" to see your shipping costs'
          );
        END IF;
      END LOOP;
    END IF;

    -- Check aggregation fields
    IF p_aggregations IS NOT NULL THEN
      FOR i IN 0..jsonb_array_length(p_aggregations) - 1 LOOP
        v_field := p_aggregations->i->>'field';
        IF v_field IS NOT NULL AND v_field != '*' AND v_field = ANY(v_restricted_fields) THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Access denied: Cannot aggregate on restricted field "' || v_field || '"',
            'suggestion', 'Use "retail" instead of "' || v_field || '"'
          );
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Determine which column to filter by - USE client_id for shipment tables
  IF p_table_name IN ('shipment', 'shipment_report_view') THEN
    v_customer_column := 'client_id';
  ELSIF p_table_name IN ('shipment_address', 'shipment_carrier', 'shipment_item', 'shipment_accessorial', 'shipment_note') THEN
    v_customer_column := 'customer_id';  -- These still use customer_id through joins
  ELSE
    v_customer_column := NULL;
  END IF;

  -- Build SELECT clause
  IF p_aggregations IS NOT NULL AND jsonb_array_length(p_aggregations) > 0 THEN
    v_select_clause := '';
    -- Add group by fields first
    IF p_group_by IS NOT NULL THEN
      v_select_clause := array_to_string(p_group_by, ', ') || ', ';
    END IF;
    -- Add aggregations
    FOR v_agg IN SELECT * FROM jsonb_array_elements(p_aggregations) LOOP
      IF v_select_clause != '' AND NOT v_select_clause LIKE '%, ' THEN
        v_select_clause := v_select_clause || ', ';
      END IF;
      v_select_clause := v_select_clause || format(
        '%s(%s) AS %s',
        upper(v_agg->>'function'),
        COALESCE(v_agg->>'field', '*'),
        COALESCE(v_agg->>'alias', lower(v_agg->>'function') || '_result')
      );
    END LOOP;
  ELSE
    v_select_clause := array_to_string(p_select, ', ');
  END IF;

  -- Build WHERE clause with customer filter
  IF v_customer_column IS NOT NULL THEN
    v_where_clause := format(' WHERE %I = %s', v_customer_column, v_client_id);
  END IF;

  -- Add additional filters
  IF jsonb_array_length(p_filters) > 0 THEN
    FOR v_filter IN SELECT * FROM jsonb_array_elements(p_filters) LOOP
      IF v_where_clause = '' THEN
        v_where_clause := ' WHERE ';
      ELSE
        v_where_clause := v_where_clause || ' AND ';
      END IF;
      
      v_where_clause := v_where_clause || format(
        '%I %s %L',
        v_filter->>'field',
        COALESCE(v_filter->>'operator', '='),
        v_filter->>'value'
      );
    END LOOP;
  END IF;

  -- Build GROUP BY clause
  IF p_group_by IS NOT NULL AND array_length(p_group_by, 1) > 0 THEN
    v_group_clause := ' GROUP BY ' || array_to_string(p_group_by, ', ');
  END IF;

  -- Build ORDER BY clause
  IF p_order_by IS NOT NULL THEN
    v_order_clause := format(' ORDER BY %I %s', p_order_by, COALESCE(p_order_dir, 'desc'));
  ELSIF p_aggregations IS NOT NULL AND jsonb_array_length(p_aggregations) > 0 THEN
    -- Default order by first aggregation result
    v_order_clause := ' ORDER BY ' || COALESCE(p_aggregations->0->>'alias', 'result') || ' DESC';
  END IF;

  -- Build final query
  v_sql := format(
    'SELECT %s FROM %I%s%s%s LIMIT %s',
    v_select_clause,
    p_table_name,
    v_where_clause,
    v_group_clause,
    v_order_clause,
    p_limit
  );

  -- Execute and return
  EXECUTE format(
    'SELECT jsonb_build_object(''success'', true, ''query'', %L, ''row_count'', COUNT(*), ''data'', COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb)) FROM (%s) t',
    v_sql,
    v_sql
  ) INTO v_result;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'query', v_sql
  );
END;
$$;

-- ============================================================================
-- Fix mcp_search_text
-- ============================================================================

CREATE OR REPLACE FUNCTION mcp_search_text(
  p_search_query TEXT,
  p_customer_id INTEGER,
  p_is_admin BOOLEAN DEFAULT false,
  p_match_type TEXT DEFAULT 'contains',
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
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
  v_client_id INTEGER;
BEGIN
  -- CRITICAL FIX: Map customer_id to client_id
  v_client_id := get_client_id_for_customer(p_customer_id);

  -- Sanitize and build pattern
  v_pattern := CASE p_match_type
    WHEN 'exact' THEN p_search_query
    WHEN 'starts_with' THEN p_search_query || '%'
    ELSE '%' || p_search_query || '%'
  END;

  -- Search carrier names (no customer filter - reference table)
  SELECT COUNT(*), jsonb_agg(DISTINCT carrier_name) 
  INTO v_cnt, v_samples
  FROM (
    SELECT carrier_name 
    FROM carrier 
    WHERE carrier_name ILIKE v_pattern 
    LIMIT 5
  ) sub;
  
  IF v_cnt > 0 THEN
    v_results := v_results || jsonb_build_object(
      'table', 'carrier', 
      'field', 'carrier_name', 
      'match_count', v_cnt,
      'sample_values', v_samples,
      'hint', 'Use query_with_join to get shipments for this carrier'
    );
    v_total := v_total + v_cnt;
  END IF;

  -- Search shipment_item descriptions (with customer filter via client_id)
  SELECT COUNT(*) INTO v_cnt
  FROM shipment_item si 
  JOIN shipment s ON si.load_id = s.load_id
  WHERE si.description ILIKE v_pattern 
    AND (p_is_admin OR s.client_id = v_client_id);
  
  IF v_cnt > 0 THEN
    SELECT jsonb_agg(DISTINCT description) INTO v_samples
    FROM (
      SELECT si.description 
      FROM shipment_item si 
      JOIN shipment s ON si.load_id = s.load_id
      WHERE si.description ILIKE v_pattern 
        AND (p_is_admin OR s.client_id = v_client_id)
      LIMIT 5
    ) sub;
    
    v_results := v_results || jsonb_build_object(
      'table', 'shipment_item', 
      'field', 'description', 
      'match_count', v_cnt,
      'sample_values', v_samples,
      'hint', 'Use query_with_join with shipment_item to get details'
    );
    v_total := v_total + v_cnt;
  END IF;

  -- Search reference numbers in shipment (use client_id)
  SELECT COUNT(*) INTO v_cnt
  FROM shipment
  WHERE (pro_number ILIKE v_pattern OR customer_ref ILIKE v_pattern OR po_number ILIKE v_pattern)
    AND (p_is_admin OR client_id = v_client_id);
  
  IF v_cnt > 0 THEN
    v_results := v_results || jsonb_build_object(
      'table', 'shipment', 
      'field', 'reference_numbers', 
      'match_count', v_cnt,
      'hint', 'Filter shipment by pro_number, customer_ref, or po_number'
    );
    v_total := v_total + v_cnt;
  END IF;

  -- Search origin/destination cities (use client_id)
  SELECT COUNT(*) INTO v_cnt
  FROM shipment_address sa
  JOIN shipment s ON sa.load_id = s.load_id
  WHERE sa.city ILIKE v_pattern
    AND (p_is_admin OR s.client_id = v_client_id);
  
  IF v_cnt > 0 THEN
    SELECT jsonb_agg(DISTINCT city) INTO v_samples
    FROM (
      SELECT sa.city
      FROM shipment_address sa
      JOIN shipment s ON sa.load_id = s.load_id
      WHERE sa.city ILIKE v_pattern
        AND (p_is_admin OR s.client_id = v_client_id)
      LIMIT 5
    ) sub;
    
    v_results := v_results || jsonb_build_object(
      'table', 'shipment_address', 
      'field', 'city', 
      'match_count', v_cnt,
      'sample_values', v_samples,
      'hint', 'Use query_with_join with shipment_address to get shipments for this city'
    );
    v_total := v_total + v_cnt;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'query', p_search_query,
    'match_type', p_match_type,
    'total_matches', v_total,
    'results', v_results,
    'hint', CASE 
      WHEN v_total = 0 THEN 'No matches found. Try different spelling or search terms.'
      ELSE 'Use query_with_join to get full details for matching records.'
    END
  );
END;
$$;

-- ============================================================================
-- Fix mcp_query_with_join (drop old version, keep the one that uses client_id)
-- ============================================================================

-- First, drop all versions
DROP FUNCTION IF EXISTS mcp_query_with_join(text, integer, boolean, jsonb, jsonb, jsonb, text[], jsonb);
DROP FUNCTION IF EXISTS mcp_query_with_join(text, integer, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text, text, integer);

-- Recreate single unified version that uses client_id
CREATE OR REPLACE FUNCTION mcp_query_with_join(
  p_base_table TEXT,
  p_customer_id INTEGER,
  p_is_admin BOOLEAN DEFAULT false,
  p_joins JSONB DEFAULT NULL,
  p_select JSONB DEFAULT NULL,
  p_filters JSONB DEFAULT NULL,
  p_group_by JSONB DEFAULT NULL,
  p_aggregations JSONB DEFAULT NULL,
  p_order_by TEXT DEFAULT NULL,
  p_order_dir TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 100
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
  v_field text;
  v_agg jsonb;
  v_filter jsonb;
  v_client_id INTEGER;
BEGIN
  -- CRITICAL FIX: Map customer_id to client_id
  v_client_id := get_client_id_for_customer(p_customer_id);

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

  -- Build WHERE clause for customer filtering - USE client_id!
  IF p_base_table IN ('shipment', 'shipment_report_view') THEN
    IF NOT p_is_admin THEN
      v_where_clause := ' WHERE ' || quote_ident(p_base_table) || '.client_id = ' || v_client_id;
    ELSIF v_client_id IS NOT NULL THEN
      v_where_clause := ' WHERE ' || quote_ident(p_base_table) || '.client_id = ' || v_client_id;
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
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_client_id_for_customer(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_id_for_customer(INTEGER) TO service_role;

-- ============================================================================
-- Add comment explaining the fix
-- ============================================================================

COMMENT ON FUNCTION get_client_id_for_customer(INTEGER) IS 
'Maps customer_id (from customer table) to client_id (used in shipment table).
The customer table has both customer_id (PK) and client_id (FK to shipment).
MCP functions receive customer_id but need to filter shipments by client_id.';