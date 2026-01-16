/*
  # Fix Active Carriers Count to Use shipment_carrier Table

  The active_carriers count was using rate_carrier_id (the quoting carrier).
  The ACTUAL carrier who hauled the shipment is in the shipment_carrier table.

  Changes:
  - Count distinct carriers from shipment_carrier table instead of rate_carrier_id
  - Uses subquery to get carrier_id from shipment_carrier for each shipment
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
  prev_start DATE;
  prev_end DATE;
  period_days INTEGER;
  calling_user_id UUID;
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
  prev_start := prev_end - period_days;

  -- Current period metrics
  SELECT
    COUNT(*)::INTEGER as total_shipments,
    ROUND(COALESCE(SUM(s.retail), 0)::NUMERIC, 2) as total_spend,
    ROUND(COALESCE(AVG(s.retail), 0)::NUMERIC, 2) as avg_cost,
    (SELECT COUNT(DISTINCT sc.carrier_id)
     FROM shipment_carrier sc
     WHERE sc.load_id IN (
       SELECT s2.load_id FROM shipment s2
       WHERE s2.customer_id = p_customer_id
         AND COALESCE(s2.pickup_date::DATE, s2.created_date::DATE) >= p_start_date
         AND COALESCE(s2.pickup_date::DATE, s2.created_date::DATE) <= p_end_date
     )
    )::INTEGER as active_carriers
  INTO current_metrics
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date;

  -- Previous period metrics
  SELECT
    COUNT(*)::INTEGER as total_shipments,
    ROUND(COALESCE(SUM(s.retail), 0)::NUMERIC, 2) as total_spend,
    ROUND(COALESCE(AVG(s.retail), 0)::NUMERIC, 2) as avg_cost,
    (SELECT COUNT(DISTINCT sc.carrier_id)
     FROM shipment_carrier sc
     WHERE sc.load_id IN (
       SELECT s2.load_id FROM shipment s2
       WHERE s2.customer_id = p_customer_id
         AND COALESCE(s2.pickup_date::DATE, s2.created_date::DATE) >= prev_start
         AND COALESCE(s2.pickup_date::DATE, s2.created_date::DATE) <= prev_end
     )
    )::INTEGER as active_carriers
  INTO previous_metrics
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= prev_start
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= prev_end;

  result := json_build_object(
    'current', json_build_object(
      'totalShipments', current_metrics.total_shipments,
      'totalSpend', current_metrics.total_spend,
      'avgCost', current_metrics.avg_cost,
      'activeCarriers', current_metrics.active_carriers
    ),
    'previous', json_build_object(
      'totalShipments', previous_metrics.total_shipments,
      'totalSpend', previous_metrics.total_spend,
      'avgCost', previous_metrics.avg_cost,
      'activeCarriers', previous_metrics.active_carriers
    ),
    'period', json_build_object(
      'startDate', p_start_date,
      'endDate', p_end_date,
      'days', period_days
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
