/*
  # Fix Executive Metrics - Restore Original Structure

  The previous migrations broke the response structure.
  The frontend expects a flat JSON object, not nested current/previous.

  This restores the original structure while using shipment_carrier for active_carriers.
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
  calling_user_id UUID;
  current_active_carriers INTEGER;
BEGIN
  calling_user_id := auth.uid();

  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT verify_customer_access(calling_user_id, p_customer_id) THEN
    RAISE EXCEPTION 'Access denied to customer %', p_customer_id;
  END IF;

  period_days := p_end_date - p_start_date;
  prev_end := p_start_date - INTERVAL '1 day';
  prev_start := (prev_end - (period_days || ' days')::INTERVAL)::DATE;

  -- Get active carriers from shipment_carrier (the FIX)
  SELECT COALESCE(COUNT(DISTINCT sc.carrier_id), 0)::INTEGER
  INTO current_active_carriers
  FROM shipment_carrier sc
  INNER JOIN shipment s ON sc.load_id = s.load_id
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date;

  -- Current period metrics
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
    ) as on_time_pct,
    COALESCE(
      ROUND(
        AVG(EXTRACT(EPOCH FROM (s.delivery_date - s.pickup_date)) / 86400)
        FILTER (WHERE s.delivery_date IS NOT NULL AND s.pickup_date IS NOT NULL)
      ::NUMERIC, 1),
      0
    ) as avg_transit_days
  INTO current_metrics
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date;

  -- Previous period metrics
  SELECT
    COUNT(*) as total_shipments,
    COALESCE(SUM(s.retail), 0) as total_spend,
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
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= prev_start
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= prev_end;

  -- Build result with FLAT structure (matching original)
  result := json_build_object(
    'totalShipments', current_metrics.total_shipments,
    'totalSpend', current_metrics.total_spend,
    'avgCostPerShipment', current_metrics.avg_cost,
    'onTimePercentage', current_metrics.on_time_pct,
    'avgTransitDays', current_metrics.avg_transit_days,
    'activeCarriers', current_active_carriers,
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
        ROUND((current_metrics.on_time_pct - previous_metrics.on_time_pct)::NUMERIC, 1)
      ELSE 0
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;