/*
  # Fix Active Carriers NULL Handling

  The previous migration caused NULL values when no carriers exist.
  This fix adds COALESCE to handle NULL cases.
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
  current_active_carriers INTEGER;
  previous_active_carriers INTEGER;
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

  -- Get current period active carriers from shipment_carrier
  SELECT COALESCE(COUNT(DISTINCT sc.carrier_id), 0)::INTEGER
  INTO current_active_carriers
  FROM shipment_carrier sc
  INNER JOIN shipment s ON sc.load_id = s.load_id
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date;

  -- Get previous period active carriers from shipment_carrier
  SELECT COALESCE(COUNT(DISTINCT sc.carrier_id), 0)::INTEGER
  INTO previous_active_carriers
  FROM shipment_carrier sc
  INNER JOIN shipment s ON sc.load_id = s.load_id
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= prev_start
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= prev_end;

  -- Current period metrics
  SELECT
    COALESCE(COUNT(*), 0)::INTEGER as total_shipments,
    ROUND(COALESCE(SUM(s.retail), 0)::NUMERIC, 2) as total_spend,
    ROUND(COALESCE(AVG(s.retail), 0)::NUMERIC, 2) as avg_cost
  INTO current_metrics
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date;

  -- Previous period metrics
  SELECT
    COALESCE(COUNT(*), 0)::INTEGER as total_shipments,
    ROUND(COALESCE(SUM(s.retail), 0)::NUMERIC, 2) as total_spend,
    ROUND(COALESCE(AVG(s.retail), 0)::NUMERIC, 2) as avg_cost
  INTO previous_metrics
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= prev_start
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= prev_end;

  result := json_build_object(
    'current', json_build_object(
      'totalShipments', COALESCE(current_metrics.total_shipments, 0),
      'totalSpend', COALESCE(current_metrics.total_spend, 0),
      'avgCost', COALESCE(current_metrics.avg_cost, 0),
      'activeCarriers', COALESCE(current_active_carriers, 0)
    ),
    'previous', json_build_object(
      'totalShipments', COALESCE(previous_metrics.total_shipments, 0),
      'totalSpend', COALESCE(previous_metrics.total_spend, 0),
      'avgCost', COALESCE(previous_metrics.avg_cost, 0),
      'activeCarriers', COALESCE(previous_active_carriers, 0)
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
