/*
  # Pulse Dashboard Executive Metrics Functions

  1. New Functions
    - `get_pulse_executive_metrics` - Returns comprehensive executive metrics with period comparison
    - `get_pulse_spend_trend` - Returns daily spend data for trend charts
    - `get_pulse_top_carriers` - Returns top carriers with performance metrics
    - `get_pulse_performance_summary` - Returns volume breakdown and top lane info

  2. Metrics Calculated
    - Total shipments and spend
    - Average cost per shipment
    - On-time delivery percentage
    - Average transit days
    - Active carrier count
    - Period-over-period changes
*/

CREATE OR REPLACE FUNCTION get_pulse_executive_metrics(
  p_customer_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_metrics RECORD;
  previous_metrics RECORD;
  period_days INTEGER;
  prev_start DATE;
  prev_end DATE;
BEGIN
  period_days := p_end_date - p_start_date;
  prev_end := p_start_date - INTERVAL '1 day';
  prev_start := (prev_end - (period_days || ' days')::INTERVAL)::DATE;
  
  SELECT 
    COUNT(*) as total_shipments,
    COALESCE(SUM(s.retail), 0) as total_spend,
    CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(s.retail) / COUNT(*))::NUMERIC, 2) ELSE 0 END as avg_cost,
    CASE WHEN SUM(s.miles) > 0 THEN ROUND((SUM(s.retail) / SUM(s.miles))::NUMERIC, 2) ELSE 0 END as cost_per_mile,
    COALESCE(
      ROUND(
        (COUNT(*) FILTER (
          WHERE s.delivery_date IS NOT NULL 
          AND s.expected_delivery_date IS NOT NULL 
          AND s.delivery_date <= s.expected_delivery_date
        ))::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE s.delivery_date IS NOT NULL), 0) * 100
      , 1),
      0
    ) as on_time_pct,
    COALESCE(
      ROUND(
        AVG(EXTRACT(EPOCH FROM (s.delivery_date - s.pickup_date)) / 86400) 
        FILTER (WHERE s.delivery_date IS NOT NULL AND s.pickup_date IS NOT NULL)
      ::NUMERIC, 1),
      0
    ) as avg_transit_days,
    COUNT(DISTINCT s.rate_carrier_id) FILTER (WHERE s.rate_carrier_id IS NOT NULL) as active_carriers
  INTO current_metrics
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date, s.created_at::DATE) >= p_start_date
    AND COALESCE(s.pickup_date, s.created_at::DATE) <= p_end_date;
  
  SELECT 
    COUNT(*) as total_shipments,
    COALESCE(SUM(s.retail), 0) as total_spend,
    CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(s.retail) / COUNT(*))::NUMERIC, 2) ELSE 0 END as avg_cost,
    COALESCE(
      ROUND(
        (COUNT(*) FILTER (
          WHERE s.delivery_date IS NOT NULL 
          AND s.expected_delivery_date IS NOT NULL 
          AND s.delivery_date <= s.expected_delivery_date
        ))::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE s.delivery_date IS NOT NULL), 0) * 100
      , 1),
      0
    ) as on_time_pct
  INTO previous_metrics
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date, s.created_at::DATE) >= prev_start
    AND COALESCE(s.pickup_date, s.created_at::DATE) <= prev_end;
  
  result := json_build_object(
    'totalShipments', current_metrics.total_shipments,
    'totalSpend', current_metrics.total_spend,
    'avgCostPerShipment', current_metrics.avg_cost,
    'costPerMile', current_metrics.cost_per_mile,
    'onTimePercentage', current_metrics.on_time_pct,
    'avgTransitDays', current_metrics.avg_transit_days,
    'activeCarriers', current_metrics.active_carriers,
    'shipmentsChange', CASE 
      WHEN previous_metrics.total_shipments > 0 THEN 
        ROUND(((current_metrics.total_shipments - previous_metrics.total_shipments)::NUMERIC / previous_metrics.total_shipments * 100), 1)
      ELSE 0 
    END,
    'spendChange', CASE 
      WHEN previous_metrics.total_spend > 0 THEN 
        ROUND(((current_metrics.total_spend - previous_metrics.total_spend) / previous_metrics.total_spend * 100)::NUMERIC, 1)
      ELSE 0 
    END,
    'onTimeChange', CASE 
      WHEN previous_metrics.on_time_pct > 0 THEN 
        ROUND(((current_metrics.on_time_pct - previous_metrics.on_time_pct))::NUMERIC, 1)
      ELSE 0 
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_pulse_spend_trend(
  p_customer_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  spend NUMERIC,
  shipments BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.pickup_date, s.created_at::DATE)::DATE as date,
    COALESCE(SUM(s.retail), 0)::NUMERIC as spend,
    COUNT(*)::BIGINT as shipments
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date, s.created_at::DATE) >= p_start_date
    AND COALESCE(s.pickup_date, s.created_at::DATE) <= p_end_date
  GROUP BY COALESCE(s.pickup_date, s.created_at::DATE)::DATE
  ORDER BY COALESCE(s.pickup_date, s.created_at::DATE)::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_pulse_top_carriers(
  p_customer_id INTEGER,
  p_start_date DATE,
  p_end_date DATE,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  carrier_name TEXT,
  shipment_count BIGINT,
  total_spend NUMERIC,
  on_time_pct NUMERIC,
  volume_share_pct NUMERIC
) AS $$
DECLARE
  total_shipments BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_shipments
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date, s.created_at::DATE) >= p_start_date
    AND COALESCE(s.pickup_date, s.created_at::DATE) <= p_end_date;
  
  RETURN QUERY
  SELECT 
    COALESCE(c.carrier_name, 'Unknown')::TEXT as carrier_name,
    COUNT(*)::BIGINT as shipment_count,
    ROUND(COALESCE(SUM(s.retail), 0)::NUMERIC, 2) as total_spend,
    ROUND(
      COALESCE(
        (COUNT(*) FILTER (
          WHERE s.delivery_date IS NOT NULL 
          AND s.expected_delivery_date IS NOT NULL 
          AND s.delivery_date <= s.expected_delivery_date
        ))::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE s.delivery_date IS NOT NULL), 0) * 100
      , 0)
    , 1) as on_time_pct,
    ROUND((COUNT(*)::NUMERIC / NULLIF(total_shipments, 0) * 100), 1) as volume_share_pct
  FROM shipment s
  LEFT JOIN carrier c ON c.carrier_id = s.rate_carrier_id
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date, s.created_at::DATE) >= p_start_date
    AND COALESCE(s.pickup_date, s.created_at::DATE) <= p_end_date
  GROUP BY c.carrier_name
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_pulse_performance_summary(
  p_customer_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  volume_stats RECORD;
  lane_stats RECORD;
  weight_stats RECORD;
BEGIN
  SELECT 
    COUNT(*) as total_shipments,
    COUNT(*) FILTER (WHERE st.is_completed = true) as completed,
    COUNT(*) FILTER (WHERE st.is_completed = false AND st.is_cancelled = false) as in_progress,
    COUNT(*) FILTER (WHERE st.is_cancelled = true) as cancelled
  INTO volume_stats
  FROM shipment s
  LEFT JOIN shipment_status st ON st.status_id = s.status_id
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date, s.created_at::DATE) >= p_start_date
    AND COALESCE(s.pickup_date, s.created_at::DATE) <= p_end_date;
  
  SELECT 
    origin.state as origin_state,
    dest.state as dest_state,
    COUNT(*) as lane_count
  INTO lane_stats
  FROM shipment s
  JOIN shipment_address origin ON origin.load_id = s.load_id AND origin.address_type = 1
  JOIN shipment_address dest ON dest.load_id = s.load_id AND dest.address_type = 2
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date, s.created_at::DATE) >= p_start_date
    AND COALESCE(s.pickup_date, s.created_at::DATE) <= p_end_date
  GROUP BY origin.state, dest.state
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  SELECT 
    COALESCE(SUM(si.weight), 0) as total_weight
  INTO weight_stats
  FROM shipment s
  JOIN shipment_item si ON si.load_id = s.load_id
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date, s.created_at::DATE) >= p_start_date
    AND COALESCE(s.pickup_date, s.created_at::DATE) <= p_end_date;
  
  result := json_build_object(
    'totalShipments', volume_stats.total_shipments,
    'completedShipments', COALESCE(volume_stats.completed, 0),
    'inProgressShipments', COALESCE(volume_stats.in_progress, 0),
    'cancelledShipments', COALESCE(volume_stats.cancelled, 0),
    'completionRate', CASE 
      WHEN volume_stats.total_shipments > 0 
      THEN ROUND((COALESCE(volume_stats.completed, 0)::NUMERIC / volume_stats.total_shipments * 100), 1)
      ELSE 0 
    END,
    'topOriginState', COALESCE(lane_stats.origin_state, 'N/A'),
    'topDestState', COALESCE(lane_stats.dest_state, 'N/A'),
    'topLaneCount', COALESCE(lane_stats.lane_count, 0),
    'totalWeight', ROUND(weight_stats.total_weight::NUMERIC, 0)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
