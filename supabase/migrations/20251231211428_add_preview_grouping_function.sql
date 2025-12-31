/*
  # Add preview_grouping function for AI tools
  
  1. Functions
    - `preview_grouping` - Previews grouping operation results
      - Returns aggregated data preview and total group count
      - Used by AI to validate groupBy + metric combinations
*/

CREATE OR REPLACE FUNCTION preview_grouping(
  p_customer_id TEXT,
  p_group_by TEXT,
  p_metric TEXT,
  p_aggregation TEXT,
  p_limit INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_results JSONB;
  v_total_groups INTEGER;
  v_agg_expr TEXT;
  v_sql TEXT;
BEGIN
  IF p_aggregation NOT IN ('sum', 'avg', 'count', 'countDistinct', 'min', 'max') THEN
    RETURN jsonb_build_object('error', 'Invalid aggregation type');
  END IF;

  CASE p_aggregation
    WHEN 'sum' THEN v_agg_expr := format('SUM(%I)', p_metric);
    WHEN 'avg' THEN v_agg_expr := format('ROUND(AVG(%I)::numeric, 2)', p_metric);
    WHEN 'count' THEN v_agg_expr := 'COUNT(*)';
    WHEN 'countDistinct' THEN v_agg_expr := format('COUNT(DISTINCT %I)', p_metric);
    WHEN 'min' THEN v_agg_expr := format('MIN(%I)', p_metric);
    WHEN 'max' THEN v_agg_expr := format('MAX(%I)', p_metric);
  END CASE;

  EXECUTE format(
    'SELECT COUNT(DISTINCT %I) FROM shipment_report_view WHERE customer_id = $1',
    p_group_by
  ) INTO v_total_groups USING p_customer_id::INTEGER;

  v_sql := format(
    'SELECT jsonb_agg(row_data ORDER BY value DESC)
     FROM (
       SELECT jsonb_build_object(
         ''name'', COALESCE(CAST(%I AS TEXT), ''Unknown''),
         ''value'', %s,
         ''count'', COUNT(*)
       ) as row_data,
       %s as value
       FROM shipment_report_view
       WHERE customer_id = $1
       GROUP BY %I
       ORDER BY %s DESC
       LIMIT $2
     ) t',
    p_group_by, v_agg_expr, v_agg_expr, p_group_by, v_agg_expr
  );

  EXECUTE v_sql INTO v_results USING p_customer_id::INTEGER, p_limit;

  v_result := jsonb_build_object(
    'group_by', p_group_by,
    'metric', p_metric,
    'aggregation', p_aggregation,
    'total_groups', v_total_groups,
    'results', COALESCE(v_results, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION preview_grouping TO authenticated;
