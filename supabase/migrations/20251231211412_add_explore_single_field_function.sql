/*
  # Add explore_single_field function for AI tools
  
  1. Functions
    - `explore_single_field` - Explores a field's data distribution
      - Returns data type, counts, sample values, numeric stats, date ranges
      - Used by AI to understand field quality before building reports
*/

CREATE OR REPLACE FUNCTION explore_single_field(
  p_customer_id TEXT,
  p_field_name TEXT,
  p_sample_size INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_count INTEGER;
  v_populated_count INTEGER;
  v_unique_count INTEGER;
  v_sample_values TEXT[];
  v_numeric_stats JSONB;
  v_date_range JSONB;
  v_data_type TEXT;
BEGIN
  SELECT data_type INTO v_data_type
  FROM schema_columns
  WHERE view_name = 'shipment_report_view'
    AND column_name = p_field_name;

  IF v_data_type IS NULL THEN
    RETURN jsonb_build_object('error', 'Field not found');
  END IF;

  EXECUTE format(
    'SELECT COUNT(*) FROM shipment_report_view WHERE customer_id = $1'
  ) INTO v_total_count USING p_customer_id::INTEGER;

  EXECUTE format(
    'SELECT COUNT(*) FROM shipment_report_view 
     WHERE customer_id = $1 
     AND %I IS NOT NULL 
     AND CAST(%I AS TEXT) != ''''',
    p_field_name, p_field_name
  ) INTO v_populated_count USING p_customer_id::INTEGER;

  EXECUTE format(
    'SELECT COUNT(DISTINCT %I) FROM shipment_report_view 
     WHERE customer_id = $1 AND %I IS NOT NULL',
    p_field_name, p_field_name
  ) INTO v_unique_count USING p_customer_id::INTEGER;

  EXECUTE format(
    'SELECT ARRAY_AGG(DISTINCT CAST(%I AS TEXT)) 
     FROM (
       SELECT %I FROM shipment_report_view 
       WHERE customer_id = $1 AND %I IS NOT NULL
       LIMIT %s
     ) t',
    p_field_name, p_field_name, p_field_name, p_sample_size
  ) INTO v_sample_values USING p_customer_id::INTEGER;

  IF v_data_type IN ('numeric', 'integer', 'bigint', 'double precision', 'real') THEN
    EXECUTE format(
      'SELECT jsonb_build_object(
         ''min'', MIN(%I),
         ''max'', MAX(%I),
         ''avg'', ROUND(AVG(%I)::numeric, 2),
         ''sum'', SUM(%I)
       )
       FROM shipment_report_view 
       WHERE customer_id = $1 AND %I IS NOT NULL',
      p_field_name, p_field_name, p_field_name, p_field_name, p_field_name
    ) INTO v_numeric_stats USING p_customer_id::INTEGER;
  END IF;

  IF v_data_type IN ('date', 'timestamp', 'timestamptz') THEN
    EXECUTE format(
      'SELECT jsonb_build_object(
         ''min'', MIN(%I)::TEXT,
         ''max'', MAX(%I)::TEXT
       )
       FROM shipment_report_view 
       WHERE customer_id = $1 AND %I IS NOT NULL',
      p_field_name, p_field_name, p_field_name
    ) INTO v_date_range USING p_customer_id::INTEGER;
  END IF;

  v_result := jsonb_build_object(
    'field_name', p_field_name,
    'data_type', v_data_type,
    'total_count', v_total_count,
    'populated_count', v_populated_count,
    'populated_percent', CASE WHEN v_total_count > 0 
      THEN ROUND((v_populated_count::NUMERIC / v_total_count) * 100, 1) 
      ELSE 0 END,
    'unique_count', v_unique_count,
    'sample_values', to_jsonb(v_sample_values)
  );

  IF v_numeric_stats IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('numeric_stats', v_numeric_stats);
  END IF;

  IF v_date_range IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('date_range', v_date_range);
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION explore_single_field TO authenticated;
