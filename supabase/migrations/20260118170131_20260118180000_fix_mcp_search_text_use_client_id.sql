/*
  # Fix MCP Search Text Function
  
  Updates the mcp_search_text function to:
  1. Use client_id instead of customer_id for data access
  2. Fix pro_number search (it's in shipment_carrier, not shipment)
  3. Improve customer filtering across all searches
  4. Add better hints for using results
  
  ## Changes
  - Map customer_id to client_id using get_client_id_for_customer()
  - Fix reference number search to check shipment_carrier.pro_number
  - Apply client_id filtering to all customer-scoped searches
  - Improve result hints
*/

CREATE OR REPLACE FUNCTION mcp_search_text(
  p_search_query TEXT,
  p_customer_id INTEGER,
  p_is_admin BOOLEAN DEFAULT FALSE,
  p_match_type TEXT DEFAULT 'contains',
  p_limit INTEGER DEFAULT 10
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

  -- FIXED: Search reference numbers - pro_number is in shipment_carrier, not shipment
  SELECT COUNT(*) INTO v_cnt
  FROM shipment s
  LEFT JOIN shipment_carrier sc ON s.load_id = sc.load_id
  WHERE (sc.pro_number ILIKE v_pattern OR s.customer_ref ILIKE v_pattern OR s.po_number ILIKE v_pattern)
  AND (p_is_admin OR s.client_id = v_client_id);

  IF v_cnt > 0 THEN
    v_results := v_results || jsonb_build_object(
      'table', 'shipment', 
      'field', 'reference_numbers', 
      'match_count', v_cnt,
      'hint', 'Filter shipment by customer_ref or po_number. For pro_number, join to shipment_carrier.'
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

GRANT EXECUTE ON FUNCTION mcp_search_text TO authenticated, service_role;
