/*
  # Fix MCP Functions to Use shipment_carrier Table

  1. Changes
    - Updates mcp_get_fields to correct the hint for rate_carrier_id
    - Updates mcp_get_table_joins to show proper carrier join path via shipment_carrier
    - Updates mcp_query_with_join to handle carrier joins through shipment_carrier table

  2. Background
    - rate_carrier_id is the QUOTING carrier (who quoted the rate)
    - shipment_carrier table contains the ACTUAL hauling carrier
    - All carrier analytics should use shipment_carrier, not rate_carrier_id

  3. Join Path for Carrier
    - shipment.load_id -> shipment_carrier.load_id
    - shipment_carrier.carrier_id -> carrier.carrier_id
*/

-- Drop and recreate mcp_get_fields with corrected hint
CREATE OR REPLACE FUNCTION mcp_get_fields(
  p_table_name text,
  p_include_samples boolean DEFAULT false,
  p_admin_mode boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH field_info AS (
    SELECT
      c.column_name,
      c.data_type,
      c.is_nullable = 'YES' as nullable,
      CASE 
        WHEN c.data_type IN ('integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision') THEN true
        ELSE false
      END as is_aggregatable,
      CASE
        WHEN c.data_type IN ('character varying', 'text', 'integer', 'bigint', 'date', 'boolean') THEN true
        ELSE false
      END as is_groupable,
      CASE
        WHEN c.data_type IN ('character varying', 'text') THEN true
        ELSE false
      END as is_searchable,
      CASE
        WHEN c.column_name = 'retail' THEN 'Customer cost in USD - use for cost analysis'
        WHEN c.column_name = 'cost' THEN 'Carrier cost - ADMIN ONLY'
        WHEN c.column_name = 'miles' THEN 'Shipment distance in miles'
        WHEN c.column_name = 'total_weight' THEN 'Total weight in pounds'
        WHEN c.column_name = 'rate_carrier_id' THEN 'Quoting carrier ID - for actual hauling carrier use shipment_carrier table'
        WHEN c.column_name = 'load_id' THEN 'Primary key - joins to shipment_item, shipment_address, shipment_carrier'
        WHEN c.column_name = 'carrier_name' THEN 'Carrier name - only in carrier table, must JOIN via shipment_carrier'
        WHEN c.column_name = 'description' THEN 'Product description in shipment_item'
        WHEN c.column_name = 'weight' THEN 'Item weight - in shipment_item, not shipment'
        ELSE NULL
      END as ai_hint
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = p_table_name
  )
  SELECT jsonb_agg(jsonb_build_object(
    'field_name', column_name,
    'data_type', data_type,
    'nullable', nullable,
    'is_aggregatable', is_aggregatable,
    'is_groupable', is_groupable,
    'is_searchable', is_searchable,
    'ai_hint', ai_hint
  ) ORDER BY column_name)
  INTO v_result
  FROM field_info
  WHERE p_admin_mode OR column_name NOT IN ('cost', 'target_rate', 'margin');

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Drop and recreate mcp_get_table_joins with shipment_carrier path
CREATE OR REPLACE FUNCTION mcp_get_table_joins(p_table_name text)
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
      ('shipment', 'shipment_carrier', 'load_id', 'load_id', 'left', 'Get actual hauling carrier - then join to carrier table'),
      ('shipment', 'shipment_item', 'load_id', 'load_id', 'left', 'Get line items'),
      ('shipment', 'shipment_address', 'load_id', 'load_id', 'left', 'Get addresses'),
      ('shipment', 'shipment_accessorial', 'load_id', 'load_id', 'left', 'Get accessorials'),
      ('shipment', 'mode', 'mode_id', 'mode_id', 'left', 'Get mode name'),
      ('shipment', 'status', 'status_id', 'status_id', 'left', 'Get status name'),
      ('shipment_carrier', 'carrier', 'carrier_id', 'carrier_id', 'left', 'Get carrier details (name, SCAC)'),
      ('shipment_carrier', 'shipment', 'load_id', 'load_id', 'inner', 'Join to shipment'),
      ('shipment_item', 'shipment', 'load_id', 'load_id', 'inner', 'Join to shipment'),
      ('shipment_address', 'shipment', 'load_id', 'load_id', 'inner', 'Join to shipment'),
      ('carrier', 'shipment_carrier', 'carrier_id', 'carrier_id', 'left', 'Get shipments via shipment_carrier')
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

-- Drop and recreate mcp_query_with_join with proper carrier join handling
CREATE OR REPLACE FUNCTION mcp_query_with_join(
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
  v_select text := '';
  v_joins text := '';
  v_where text := '';
  v_group text := '';
  v_order text := '';
  v_result jsonb;
  v_join record;
  v_join_info record;
  v_agg record;
  v_filter record;
  v_joined_tables text[] := ARRAY[]::text[];
  v_needs_carrier_join boolean := false;
BEGIN
  IF p_base_table NOT IN ('shipment', 'carrier', 'customer', 'shipment_item', 'shipment_address', 'shipment_accessorial', 'mode', 'status', 'shipment_carrier') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Table not allowed: ' || p_base_table);
  END IF;

  -- Build SELECT
  IF p_aggregations IS NOT NULL AND jsonb_array_length(p_aggregations) > 0 THEN
    IF p_group_by IS NOT NULL THEN
      v_select := array_to_string(p_group_by, ', ');
    END IF;
    FOR v_agg IN SELECT * FROM jsonb_array_elements(p_aggregations) LOOP
      IF v_select != '' AND NOT v_select LIKE '%, ' THEN v_select := v_select || ', '; END IF;
      v_select := v_select || (v_agg->>'function') || '(' || (v_agg->>'field') || ') as ' || COALESCE(v_agg->>'alias', 'value');
    END LOOP;
    IF v_select = '' OR v_select LIKE '%, ' THEN v_select := 'COUNT(*) as count'; END IF;
  ELSE
    v_select := CASE WHEN p_select = ARRAY['*'] THEN p_base_table || '.*' ELSE array_to_string(p_select, ', ') END;
  END IF;

  -- Check if carrier join is requested
  FOR v_join IN SELECT * FROM jsonb_array_elements(p_joins) LOOP
    IF (v_join->>'table') = 'carrier' THEN
      v_needs_carrier_join := true;
    END IF;
  END LOOP;

  -- Build JOINs
  FOR v_join IN SELECT * FROM jsonb_array_elements(p_joins) LOOP
    -- Special handling for carrier join - must go through shipment_carrier
    IF (v_join->>'table') = 'carrier' AND p_base_table = 'shipment' THEN
      -- First join to shipment_carrier if not already joined
      IF NOT 'shipment_carrier' = ANY(v_joined_tables) THEN
        v_joins := v_joins || ' LEFT JOIN shipment_carrier ON shipment.load_id = shipment_carrier.load_id';
        v_joined_tables := array_append(v_joined_tables, 'shipment_carrier');
      END IF;
      -- Then join carrier to shipment_carrier
      v_joins := v_joins || ' ' || COALESCE(UPPER(v_join->>'type'), 'LEFT') || ' JOIN carrier ON shipment_carrier.carrier_id = carrier.carrier_id';
      v_joined_tables := array_append(v_joined_tables, 'carrier');
    ELSE
      -- Standard join handling
      SELECT * INTO v_join_info FROM (VALUES
        ('shipment', 'shipment_carrier', 'load_id', 'load_id'),
        ('shipment', 'shipment_item', 'load_id', 'load_id'),
        ('shipment', 'shipment_address', 'load_id', 'load_id'),
        ('shipment', 'shipment_accessorial', 'load_id', 'load_id'),
        ('shipment', 'mode', 'mode_id', 'mode_id'),
        ('shipment', 'status', 'status_id', 'status_id'),
        ('shipment', 'customer', 'customer_id', 'customer_id'),
        ('shipment_carrier', 'carrier', 'carrier_id', 'carrier_id'),
        ('shipment_carrier', 'shipment', 'load_id', 'load_id')
      ) AS t(from_tbl, to_tbl, from_col, to_col)
      WHERE from_tbl = p_base_table AND to_tbl = (v_join->>'table');

      IF v_join_info IS NOT NULL THEN
        v_joins := v_joins || ' ' || COALESCE(UPPER(v_join->>'type'), 'LEFT') || ' JOIN ' || 
          (v_join->>'table') || ' ON ' || p_base_table || '.' || v_join_info.from_col || 
          ' = ' || (v_join->>'table') || '.' || v_join_info.to_col;
        v_joined_tables := array_append(v_joined_tables, v_join->>'table');
      END IF;
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
        WHEN 'in' THEN ' IN (' || (v_filter->>'value') || ')'
        WHEN 'is_null' THEN ' IS NULL'
        WHEN 'is_not_null' THEN ' IS NOT NULL'
        ELSE ' = ' || quote_literal(v_filter->>'value')
      END;
  END LOOP;

  -- GROUP BY
  IF p_group_by IS NOT NULL AND array_length(p_group_by, 1) > 0 THEN
    v_group := ' GROUP BY ' || array_to_string(p_group_by, ', ');
  END IF;

  -- ORDER BY
  IF p_order_by IS NOT NULL THEN
    v_order := ' ORDER BY ' || p_order_by || ' DESC';
  ELSIF p_aggregations IS NOT NULL THEN
    v_order := ' ORDER BY value DESC';
  END IF;

  -- Build and execute query
  v_sql := 'SELECT ' || v_select || ' FROM ' || p_base_table || v_joins;
  IF v_where != '' THEN v_sql := v_sql || ' WHERE ' || v_where; END IF;
  v_sql := v_sql || v_group || v_order || ' LIMIT ' || p_limit;

  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || v_sql || ') t' INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'base_table', p_base_table,
    'joined_tables', v_joined_tables,
    'row_count', COALESCE(jsonb_array_length(v_result), 0),
    'data', COALESCE(v_result, '[]'::jsonb),
    'query', v_sql
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'query', v_sql);
END;
$$;