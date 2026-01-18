/*
  # Create Admin Unified Insights Functions
  
  1. New Functions
    - `get_admin_metrics` - Returns portfolio-wide metrics with period-over-period comparisons
    - `get_admin_anomaly_summary` - Returns summary of anomalies across all customers
  
  2. Features
    - Total spend, shipments, active customers metrics
    - Average cost per shipment calculations
    - Top carrier identification
    - Period-over-period change percentages
    - Critical and warning anomaly aggregation
*/

-- Function to get admin-wide metrics with comparisons
CREATE OR REPLACE FUNCTION get_admin_metrics(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_days INTEGER;
  v_prev_start DATE;
  v_prev_end DATE;
  v_result jsonb;
  
  -- Current period metrics
  v_total_spend NUMERIC;
  v_total_shipments INTEGER;
  v_active_customers INTEGER;
  v_avg_cost NUMERIC;
  v_top_carrier TEXT;
  v_top_carrier_percent NUMERIC;
  
  -- Previous period metrics
  v_prev_spend NUMERIC;
  v_prev_shipments INTEGER;
  v_prev_customers INTEGER;
  v_prev_avg_cost NUMERIC;
BEGIN
  -- Calculate period length
  v_period_days := p_end_date - p_start_date + 1;
  v_prev_end := p_start_date - 1;
  v_prev_start := v_prev_end - v_period_days + 1;
  
  -- Get current period metrics
  SELECT 
    COALESCE(SUM(retail), 0),
    COUNT(*),
    COUNT(DISTINCT customer_id),
    CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(retail), 0) / COUNT(*) ELSE 0 END
  INTO v_total_spend, v_total_shipments, v_active_customers, v_avg_cost
  FROM shipment
  WHERE pickup_date >= p_start_date
    AND pickup_date <= p_end_date;
  
  -- Get previous period metrics
  SELECT 
    COALESCE(SUM(retail), 0),
    COUNT(*),
    COUNT(DISTINCT customer_id),
    CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(retail), 0) / COUNT(*) ELSE 0 END
  INTO v_prev_spend, v_prev_shipments, v_prev_customers, v_prev_avg_cost
  FROM shipment
  WHERE pickup_date >= v_prev_start
    AND pickup_date <= v_prev_end;
  
  -- Get top carrier
  SELECT 
    c.carrier_name,
    ROUND((COUNT(*)::NUMERIC / NULLIF(v_total_shipments, 0) * 100), 1)
  INTO v_top_carrier, v_top_carrier_percent
  FROM shipment s
  JOIN shipment_carrier sc ON s.load_id = sc.load_id
  JOIN carrier c ON sc.carrier_id = c.carrier_id
  WHERE s.pickup_date >= p_start_date
    AND s.pickup_date <= p_end_date
    AND c.carrier_name IS NOT NULL
    AND c.carrier_name != ''
  GROUP BY c.carrier_name
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Build result
  v_result := jsonb_build_object(
    'total_spend', ROUND(v_total_spend, 2),
    'total_shipments', v_total_shipments,
    'active_customers', v_active_customers,
    'avg_cost_per_shipment', ROUND(v_avg_cost, 2),
    'top_carrier', COALESCE(v_top_carrier, 'N/A'),
    'top_carrier_percent', COALESCE(v_top_carrier_percent, 0),
    'spend_change_percent', CASE 
      WHEN v_prev_spend > 0 THEN ROUND(((v_total_spend - v_prev_spend) / v_prev_spend * 100), 1)
      ELSE 0 
    END,
    'volume_change_percent', CASE 
      WHEN v_prev_shipments > 0 THEN ROUND(((v_total_shipments - v_prev_shipments)::NUMERIC / v_prev_shipments * 100), 1)
      ELSE 0 
    END,
    'customer_change_percent', CASE 
      WHEN v_prev_customers > 0 THEN ROUND(((v_active_customers - v_prev_customers)::NUMERIC / v_prev_customers * 100), 1)
      ELSE 0 
    END,
    'avg_cost_change_percent', CASE 
      WHEN v_prev_avg_cost > 0 THEN ROUND(((v_avg_cost - v_prev_avg_cost) / v_prev_avg_cost * 100), 1)
      ELSE 0 
    END,
    'period', jsonb_build_object(
      'start', p_start_date,
      'end', p_end_date,
      'days', v_period_days
    ),
    'previous_period', jsonb_build_object(
      'start', v_prev_start,
      'end', v_prev_end
    )
  );
  
  RETURN v_result;
END;
$$;

-- Function to get admin anomaly summary across all customers
CREATE OR REPLACE FUNCTION get_admin_anomaly_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_critical_count INTEGER;
  v_warning_count INTEGER;
  v_info_count INTEGER;
  v_customers_affected INTEGER;
  v_recent_critical jsonb;
BEGIN
  -- Count anomalies by severity (only new ones)
  SELECT 
    COUNT(*) FILTER (WHERE severity = 'critical'),
    COUNT(*) FILTER (WHERE severity = 'warning'),
    COUNT(*) FILTER (WHERE severity = 'info'),
    COUNT(DISTINCT customer_id)
  INTO v_critical_count, v_warning_count, v_info_count, v_customers_affected
  FROM detected_anomalies
  WHERE status = 'new'
    AND detection_date > NOW() - INTERVAL '30 days';
  
  -- Get recent critical/warning anomalies with customer names
  SELECT COALESCE(jsonb_agg(anomaly_data ORDER BY severity_order, detection_date DESC), '[]'::jsonb)
  INTO v_recent_critical
  FROM (
    SELECT 
      jsonb_build_object(
        'id', da.id,
        'customer_id', da.customer_id,
        'customer_name', c.customer_name,
        'type', da.anomaly_type,
        'severity', da.severity,
        'title', da.title,
        'description', da.description,
        'change_percent', da.change_percent,
        'detection_date', da.detection_date
      ) as anomaly_data,
      CASE da.severity 
        WHEN 'critical' THEN 1 
        WHEN 'warning' THEN 2 
        ELSE 3 
      END as severity_order,
      da.detection_date
    FROM detected_anomalies da
    LEFT JOIN customer c ON da.customer_id = c.customer_id
    WHERE da.status = 'new'
      AND da.detection_date > NOW() - INTERVAL '30 days'
    ORDER BY severity_order, da.detection_date DESC
    LIMIT 20
  ) sub;
  
  v_result := jsonb_build_object(
    'total_new', v_critical_count + v_warning_count + v_info_count,
    'critical_count', v_critical_count,
    'warning_count', v_warning_count,
    'info_count', v_info_count,
    'customers_affected', v_customers_affected,
    'recent_critical', v_recent_critical
  );
  
  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_anomaly_summary TO authenticated;
