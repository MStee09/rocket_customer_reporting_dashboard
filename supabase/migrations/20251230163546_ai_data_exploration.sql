/*
  # AI Data Exploration Functions
  
  1. New Functions
    - `get_date_range_bounds(p_date_range_type)` - Helper to get date range based on type
    - `explore_fields_for_ai(p_customer_id, p_field_names, p_date_range_type)` - Main exploration function
    - `preview_categorization_for_ai(p_customer_id, p_field, p_rules, p_default_category, p_date_range_type)` - Preview categorization results
  
  2. Purpose
    - Enable AI to verify data exists before building reports
    - Provide field coverage analysis
    - Show sample values for informed decision making
    - Preview categorization logic before execution
  
  3. Security
    - SECURITY DEFINER for proper RLS handling
    - Grants execute to authenticated users only
    - Uses proper search_path
*/

-- Helper function to get date range
CREATE OR REPLACE FUNCTION get_date_range_bounds(p_date_range_type TEXT)
RETURNS TABLE(start_date DATE, end_date DATE)
LANGUAGE plpgsql
AS $$
BEGIN
  end_date := CURRENT_DATE;
  
  CASE p_date_range_type
    WHEN 'last30' THEN start_date := CURRENT_DATE - INTERVAL '30 days';
    WHEN 'last90' THEN start_date := CURRENT_DATE - INTERVAL '90 days';
    WHEN 'last6months' THEN start_date := CURRENT_DATE - INTERVAL '6 months';
    WHEN 'lastyear' THEN start_date := CURRENT_DATE - INTERVAL '1 year';
    ELSE start_date := CURRENT_DATE - INTERVAL '90 days';
  END CASE;
  
  RETURN NEXT;
END;
$$;

-- Main exploration function
CREATE OR REPLACE FUNCTION explore_fields_for_ai(
  p_customer_id TEXT,
  p_field_names TEXT[],
  p_date_range_type TEXT DEFAULT 'last90'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_total_rows INTEGER;
  v_fields JSONB := '[]'::JSONB;
  v_field TEXT;
  v_field_data JSONB;
  v_populated INTEGER;
  v_sample_values TEXT[];
  v_unique_count INTEGER;
  v_sum NUMERIC;
  v_avg NUMERIC;
  v_min NUMERIC;
  v_max NUMERIC;
  v_data_type TEXT;
  v_display_name TEXT;
BEGIN
  SELECT dr.start_date, dr.end_date INTO v_start_date, v_end_date
  FROM get_date_range_bounds(p_date_range_type) dr;

  SELECT COUNT(*)::INTEGER INTO v_total_rows
  FROM shipment_report_view
  WHERE customer_id = p_customer_id::INTEGER
    AND pickup_date >= v_start_date
    AND pickup_date <= v_end_date;

  IF v_total_rows = 0 THEN
    RETURN jsonb_build_object(
      'total_rows', 0,
      'fields', '[]'::JSONB
    );
  END IF;

  FOREACH v_field IN ARRAY p_field_names
  LOOP
    SELECT data_type INTO v_data_type
    FROM schema_columns
    WHERE view_name = 'shipment_report_view'
      AND column_name = v_field;

    IF v_data_type IS NULL THEN
      SELECT data_type INTO v_data_type
      FROM information_schema.columns
      WHERE table_name = 'shipment_report_view'
        AND column_name = v_field;
        
      IF v_data_type IS NULL THEN
        CONTINUE;
      END IF;
    END IF;

    v_display_name := INITCAP(REPLACE(v_field, '_', ' '));

    EXECUTE format(
      'SELECT COUNT(*)::INTEGER FROM shipment_report_view 
       WHERE customer_id = $1 
         AND pickup_date >= $2 AND pickup_date <= $3
         AND %I IS NOT NULL 
         AND COALESCE(%I::TEXT, '''') != ''''',
      v_field, v_field
    ) INTO v_populated USING p_customer_id::INTEGER, v_start_date, v_end_date;

    IF v_data_type IN ('integer', 'numeric', 'double precision', 'real', 'bigint', 'smallint') THEN
      EXECUTE format(
        'SELECT 
           COALESCE(SUM(%I), 0)::NUMERIC,
           COALESCE(AVG(%I), 0)::NUMERIC,
           COALESCE(MIN(%I), 0)::NUMERIC,
           COALESCE(MAX(%I), 0)::NUMERIC
         FROM shipment_report_view 
         WHERE customer_id = $1 
           AND pickup_date >= $2 AND pickup_date <= $3
           AND %I IS NOT NULL',
        v_field, v_field, v_field, v_field, v_field
      ) INTO v_sum, v_avg, v_min, v_max 
      USING p_customer_id::INTEGER, v_start_date, v_end_date;

      v_field_data := jsonb_build_object(
        'fieldName', v_field,
        'displayName', v_display_name,
        'dataType', 'number',
        'populatedCount', v_populated,
        'totalCount', v_total_rows,
        'populatedPercent', CASE WHEN v_total_rows > 0 
          THEN ROUND((v_populated::NUMERIC / v_total_rows) * 100)::INTEGER 
          ELSE 0 END,
        'numericStats', jsonb_build_object(
          'sum', ROUND(v_sum::NUMERIC, 2),
          'avg', ROUND(v_avg::NUMERIC, 2),
          'min', ROUND(v_min::NUMERIC, 2),
          'max', ROUND(v_max::NUMERIC, 2)
        )
      );
    ELSE
      EXECUTE format(
        'SELECT COUNT(DISTINCT %I)::INTEGER 
         FROM shipment_report_view 
         WHERE customer_id = $1 
           AND pickup_date >= $2 AND pickup_date <= $3
           AND %I IS NOT NULL
           AND COALESCE(%I::TEXT, '''') != ''''',
        v_field, v_field, v_field
      ) INTO v_unique_count 
      USING p_customer_id::INTEGER, v_start_date, v_end_date;

      EXECUTE format(
        'SELECT ARRAY_AGG(val ORDER BY cnt DESC) FROM (
           SELECT %I::TEXT as val, COUNT(*) as cnt
           FROM shipment_report_view 
           WHERE customer_id = $1 
             AND pickup_date >= $2 AND pickup_date <= $3
             AND %I IS NOT NULL
             AND COALESCE(%I::TEXT, '''') != ''''
           GROUP BY %I::TEXT
           ORDER BY cnt DESC
           LIMIT 10
         ) sub',
        v_field, v_field, v_field, v_field
      ) INTO v_sample_values 
      USING p_customer_id::INTEGER, v_start_date, v_end_date;

      v_field_data := jsonb_build_object(
        'fieldName', v_field,
        'displayName', v_display_name,
        'dataType', 'text',
        'populatedCount', v_populated,
        'totalCount', v_total_rows,
        'populatedPercent', CASE WHEN v_total_rows > 0 
          THEN ROUND((v_populated::NUMERIC / v_total_rows) * 100)::INTEGER 
          ELSE 0 END,
        'uniqueCount', v_unique_count,
        'sampleValues', COALESCE(to_jsonb(v_sample_values), '[]'::JSONB)
      );
    END IF;

    v_fields := v_fields || v_field_data;
  END LOOP;

  RETURN jsonb_build_object(
    'total_rows', v_total_rows,
    'fields', v_fields
  );
END;
$$;

GRANT EXECUTE ON FUNCTION explore_fields_for_ai(TEXT, TEXT[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_date_range_bounds(TEXT) TO authenticated;

-- Categorization preview function
CREATE OR REPLACE FUNCTION preview_categorization_for_ai(
  p_customer_id TEXT,
  p_field TEXT,
  p_rules JSONB,
  p_default_category TEXT DEFAULT 'OTHER',
  p_date_range_type TEXT DEFAULT 'last90'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_result JSONB := '[]'::JSONB;
  v_rule JSONB;
  v_contains TEXT[];
  v_category TEXT;
  v_like_conditions TEXT[];
  v_like_condition TEXT;
  v_count INTEGER;
  v_spend NUMERIC;
  v_samples TEXT[];
  v_matched_ids INTEGER[] := ARRAY[]::INTEGER[];
  v_rule_ids INTEGER[];
BEGIN
  SELECT dr.start_date, dr.end_date INTO v_start_date, v_end_date
  FROM get_date_range_bounds(p_date_range_type) dr;

  FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rules)
  LOOP
    v_category := v_rule->>'category';

    IF jsonb_typeof(v_rule->'contains') = 'array' THEN
      SELECT ARRAY_AGG(elem::TEXT) INTO v_contains
      FROM jsonb_array_elements_text(v_rule->'contains') elem;
    ELSE
      v_contains := ARRAY[v_rule->>'contains'];
    END IF;

    v_like_conditions := ARRAY[]::TEXT[];
    FOREACH v_like_condition IN ARRAY v_contains
    LOOP
      v_like_conditions := v_like_conditions || format(
        'LOWER(%I) LIKE ''%%%s%%''', 
        p_field, 
        LOWER(TRIM(v_like_condition))
      );
    END LOOP;

    EXECUTE format(
      'SELECT 
         COUNT(*)::INTEGER,
         COALESCE(SUM(retail), 0)::NUMERIC,
         ARRAY_AGG(load_id)
       FROM shipment_report_view 
       WHERE customer_id = $1 
         AND pickup_date >= $2 AND pickup_date <= $3
         AND (%s)
         AND load_id != ALL($4)',
      array_to_string(v_like_conditions, ' OR ')
    ) INTO v_count, v_spend, v_rule_ids 
    USING p_customer_id::INTEGER, v_start_date, v_end_date, v_matched_ids;

    EXECUTE format(
      'SELECT ARRAY_AGG(DISTINCT %I::TEXT) FROM (
         SELECT %I FROM shipment_report_view 
         WHERE customer_id = $1 
           AND pickup_date >= $2 AND pickup_date <= $3
           AND (%s)
         LIMIT 5
       ) sub',
      p_field, p_field, array_to_string(v_like_conditions, ' OR ')
    ) INTO v_samples 
    USING p_customer_id::INTEGER, v_start_date, v_end_date;

    v_matched_ids := v_matched_ids || COALESCE(v_rule_ids, ARRAY[]::INTEGER[]);

    v_result := v_result || jsonb_build_object(
      'category', v_category,
      'count', v_count,
      'totalSpend', ROUND(v_spend, 2),
      'sampleValues', COALESCE(to_jsonb(v_samples), '[]'::JSONB)
    );
  END LOOP;

  EXECUTE format(
    'SELECT 
       COUNT(*)::INTEGER,
       COALESCE(SUM(retail), 0)::NUMERIC
     FROM shipment_report_view 
     WHERE customer_id = $1 
       AND pickup_date >= $2 AND pickup_date <= $3
       AND load_id != ALL($4)'
  ) INTO v_count, v_spend 
  USING p_customer_id::INTEGER, v_start_date, v_end_date, v_matched_ids;

  v_result := v_result || jsonb_build_object(
    'category', p_default_category,
    'count', v_count,
    'totalSpend', ROUND(v_spend, 2),
    'sampleValues', '[]'::JSONB
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION preview_categorization_for_ai(TEXT, TEXT, JSONB, TEXT, TEXT) TO authenticated;
