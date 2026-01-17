/*
  # Add Advanced AI Analytics Functions (v2)

  1. New Functions
    - `detect_anomalies_v2` - Statistical anomaly detection for metrics grouped by dimension
      - Uses standard deviation-based outlier detection
      - Supports configurable sensitivity thresholds
      - Returns anomalies with deviation scores and directions
    
    - `investigate_root_cause` - Multi-dimensional drill-down for root cause analysis
      - Analyzes data across carrier, state, and mode dimensions
      - Returns top contributors and concentration metrics
      - Provides distribution breakdowns for each dimension

  2. Purpose
    - Support the expanded 20-tool AI Investigator system
    - Enable automated anomaly detection in shipping data
    - Provide root cause investigation capabilities

  3. Security
    - Functions use SECURITY DEFINER for consistent access
    - Search path set to public for security
    - Customer ID filtering enforced on all queries
*/

DROP FUNCTION IF EXISTS detect_anomalies_v2(integer, text, text, text, integer);
DROP FUNCTION IF EXISTS investigate_root_cause(integer, text, integer);

CREATE OR REPLACE FUNCTION detect_anomalies_v2(
  p_customer_id integer,
  p_metric text,
  p_group_by text DEFAULT NULL,
  p_sensitivity text DEFAULT 'medium',
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  threshold numeric;
  result jsonb;
BEGIN
  IF p_sensitivity = 'high' THEN
    threshold := 1.5;
  ELSIF p_sensitivity = 'low' THEN
    threshold := 3.0;
  ELSE
    threshold := 2.0;
  END IF;

  IF p_group_by IS NOT NULL THEN
    WITH grouped_data AS (
      SELECT 
        CASE p_group_by
          WHEN 'carrier_name' THEN carrier_name
          WHEN 'destination_state' THEN destination_state
          WHEN 'origin_state' THEN origin_state
          WHEN 'mode_name' THEN mode_name
          ELSE carrier_name
        END as group_name,
        CASE p_metric
          WHEN 'retail' THEN AVG(retail)
          WHEN 'cost' THEN AVG(cost)
          WHEN 'actual_weight' THEN AVG(actual_weight)
          WHEN 'billed_weight' THEN AVG(billed_weight)
          ELSE AVG(retail)
        END as avg_value,
        COUNT(*) as record_count
      FROM shipment_report_view
      WHERE customer_id = p_customer_id
      GROUP BY 1
      HAVING COUNT(*) >= 5
    ),
    stats AS (
      SELECT 
        AVG(avg_value) as mean_val,
        STDDEV(avg_value) as std_val
      FROM grouped_data
    )
    SELECT jsonb_build_object(
      'metric', p_metric,
      'group_by', p_group_by,
      'sensitivity', p_sensitivity,
      'threshold', threshold,
      'statistics', jsonb_build_object(
        'mean', ROUND((SELECT mean_val FROM stats)::numeric, 2),
        'std_dev', ROUND(COALESCE((SELECT std_val FROM stats), 0)::numeric, 2)
      ),
      'anomalies', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', group_name,
            'value', ROUND(avg_value::numeric, 2),
            'count', record_count,
            'deviation', ROUND(
              CASE 
                WHEN (SELECT std_val FROM stats) > 0 
                THEN (avg_value - (SELECT mean_val FROM stats)) / (SELECT std_val FROM stats)
                ELSE 0
              END::numeric, 2
            ),
            'direction', CASE 
              WHEN avg_value > (SELECT mean_val FROM stats) THEN 'high'
              ELSE 'low'
            END
          ) ORDER BY ABS(avg_value - (SELECT mean_val FROM stats)) DESC
        )
        FROM grouped_data
        WHERE (SELECT std_val FROM stats) > 0
          AND ABS(avg_value - (SELECT mean_val FROM stats)) > threshold * (SELECT std_val FROM stats)
        LIMIT p_limit
      ), '[]'::jsonb),
      'anomaly_count', (
        SELECT COUNT(*)
        FROM grouped_data
        WHERE (SELECT std_val FROM stats) > 0
          AND ABS(avg_value - (SELECT mean_val FROM stats)) > threshold * (SELECT std_val FROM stats)
      )
    ) INTO result;
  ELSE
    WITH metric_stats AS (
      SELECT 
        CASE p_metric
          WHEN 'retail' THEN AVG(retail)
          WHEN 'cost' THEN AVG(cost)
          WHEN 'actual_weight' THEN AVG(actual_weight)
          WHEN 'billed_weight' THEN AVG(billed_weight)
          ELSE AVG(retail)
        END as mean_val,
        CASE p_metric
          WHEN 'retail' THEN STDDEV(retail)
          WHEN 'cost' THEN STDDEV(cost)
          WHEN 'actual_weight' THEN STDDEV(actual_weight)
          WHEN 'billed_weight' THEN STDDEV(billed_weight)
          ELSE STDDEV(retail)
        END as std_val,
        CASE p_metric
          WHEN 'retail' THEN MIN(retail)
          WHEN 'cost' THEN MIN(cost)
          WHEN 'actual_weight' THEN MIN(actual_weight)
          WHEN 'billed_weight' THEN MIN(billed_weight)
          ELSE MIN(retail)
        END as min_val,
        CASE p_metric
          WHEN 'retail' THEN MAX(retail)
          WHEN 'cost' THEN MAX(cost)
          WHEN 'actual_weight' THEN MAX(actual_weight)
          WHEN 'billed_weight' THEN MAX(billed_weight)
          ELSE MAX(retail)
        END as max_val,
        COUNT(*) as total_count
      FROM shipment_report_view
      WHERE customer_id = p_customer_id
    )
    SELECT jsonb_build_object(
      'metric', p_metric,
      'sensitivity', p_sensitivity,
      'threshold', threshold,
      'statistics', jsonb_build_object(
        'mean', ROUND(mean_val::numeric, 2),
        'std_dev', ROUND(COALESCE(std_val, 0)::numeric, 2),
        'min', ROUND(min_val::numeric, 2),
        'max', ROUND(max_val::numeric, 2),
        'count', total_count
      ),
      'note', 'For detailed anomaly detection, specify a group_by parameter'
    ) INTO result
    FROM metric_stats;
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION investigate_root_cause(
  p_customer_id integer,
  p_metric text,
  p_max_depth integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  dimensions text[] := ARRAY['carrier_name', 'destination_state', 'origin_state', 'mode_name'];
  dim text;
  dim_result jsonb;
  findings jsonb := '[]'::jsonb;
  i integer := 0;
BEGIN
  FOREACH dim IN ARRAY dimensions LOOP
    EXIT WHEN i >= p_max_depth;
    i := i + 1;

    WITH grouped AS (
      SELECT 
        CASE dim
          WHEN 'carrier_name' THEN carrier_name
          WHEN 'destination_state' THEN destination_state
          WHEN 'origin_state' THEN origin_state
          WHEN 'mode_name' THEN mode_name
        END as group_name,
        CASE p_metric
          WHEN 'retail' THEN SUM(retail)
          WHEN 'cost' THEN SUM(cost)
          WHEN 'actual_weight' THEN SUM(actual_weight)
          WHEN 'billed_weight' THEN SUM(billed_weight)
          WHEN 'shipment_count' THEN COUNT(*)::numeric
          ELSE SUM(retail)
        END as total_value,
        COUNT(*) as record_count
      FROM shipment_report_view
      WHERE customer_id = p_customer_id
        AND CASE dim
          WHEN 'carrier_name' THEN carrier_name IS NOT NULL
          WHEN 'destination_state' THEN destination_state IS NOT NULL
          WHEN 'origin_state' THEN origin_state IS NOT NULL
          WHEN 'mode_name' THEN mode_name IS NOT NULL
        END
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 5
    ),
    totals AS (
      SELECT SUM(total_value) as grand_total FROM grouped
    )
    SELECT jsonb_build_object(
      'dimension', dim,
      'insights', jsonb_build_object(
        'top_contributor', (SELECT group_name FROM grouped LIMIT 1),
        'top_value', ROUND((SELECT total_value FROM grouped LIMIT 1)::numeric, 2),
        'concentration_percent', ROUND(
          ((SELECT total_value FROM grouped LIMIT 1) / NULLIF((SELECT grand_total FROM totals), 0) * 100)::numeric, 
          1
        ),
        'distribution', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'name', group_name,
              'value', ROUND(total_value::numeric, 2),
              'count', record_count,
              'percent', ROUND((total_value / NULLIF((SELECT grand_total FROM totals), 0) * 100)::numeric, 1)
            )
          )
          FROM grouped
        )
      )
    ) INTO dim_result;

    findings := findings || dim_result;
  END LOOP;

  WITH top_finding AS (
    SELECT 
      f->>'dimension' as dimension,
      f->'insights'->>'top_contributor' as top_contributor,
      f->'insights'->>'concentration_percent' as concentration
    FROM jsonb_array_elements(findings) f
    ORDER BY (f->'insights'->>'concentration_percent')::numeric DESC NULLS LAST
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'metric', p_metric,
    'investigation_depth', p_max_depth,
    'findings', findings,
    'summary', COALESCE(
      (SELECT 'Primary driver: ' || dimension || ' - ' || top_contributor || ' accounts for ' || concentration || '% of the total' FROM top_finding),
      'No significant patterns found'
    ),
    'suggested_actions', (
      SELECT jsonb_agg(action)
      FROM (
        SELECT 
          'Review concentration risk in ' || (f->>'dimension') || ' (' || 
          (f->'insights'->>'top_contributor') || ': ' || 
          (f->'insights'->>'concentration_percent') || '%)' as action
        FROM jsonb_array_elements(findings) f
        WHERE (f->'insights'->>'concentration_percent')::numeric > 50
      ) actions
    )
  ) INTO result;

  IF result->'suggested_actions' IS NULL THEN
    result := jsonb_set(result, '{suggested_actions}', '["No immediate actions required - distribution appears healthy"]'::jsonb);
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION detect_anomalies_v2(integer, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_anomalies_v2(integer, text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION investigate_root_cause(integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION investigate_root_cause(integer, text, integer) TO service_role;
