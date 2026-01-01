/*
  # Fix Carrier Cost Changes to Exclude Unassigned

  1. Changes
    - Updates get_carrier_cost_changes function to exclude 'Unassigned' carriers
    - Ensures only real carriers are analyzed for cost changes

  2. Security
    - SECURITY DEFINER with explicit search_path maintained
    - Granted to authenticated users only
*/

CREATE OR REPLACE FUNCTION get_carrier_cost_changes(
  p_customer_id TEXT,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_days INTEGER;
  v_prev_start DATE;
  v_prev_end DATE;
  v_results JSONB;
BEGIN
  v_period_days := p_end_date - p_start_date;
  v_prev_end := p_start_date - 1;
  v_prev_start := v_prev_end - v_period_days;

  SELECT jsonb_agg(carrier_data ORDER BY abs_change DESC)
  INTO v_results
  FROM (
    SELECT jsonb_build_object(
      'carrier_name', curr.carrier_name,
      'current_avg_cost', ROUND(curr.avg_cost, 2),
      'previous_avg_cost', ROUND(COALESCE(prev.avg_cost, 0), 2),
      'cost_change_percent', ROUND(
        CASE WHEN COALESCE(prev.avg_cost, 0) = 0 THEN 0
        ELSE ((curr.avg_cost - prev.avg_cost) / prev.avg_cost) * 100 END, 1),
      'current_volume', curr.volume
    ) as carrier_data,
    ABS(CASE WHEN COALESCE(prev.avg_cost, 0) = 0 THEN 0
      ELSE ((curr.avg_cost - prev.avg_cost) / prev.avg_cost) * 100 END) as abs_change
    FROM (
      SELECT carrier_name, AVG(retail) as avg_cost, COUNT(*) as volume
      FROM shipment_report_view
      WHERE customer_id = p_customer_id::INTEGER
        AND COALESCE(pickup_date, delivery_date)::date BETWEEN p_start_date AND p_end_date
        AND carrier_name IS NOT NULL 
        AND carrier_name <> 'Unassigned'
        AND retail IS NOT NULL
      GROUP BY carrier_name HAVING COUNT(*) >= 5
    ) curr
    LEFT JOIN (
      SELECT carrier_name, AVG(retail) as avg_cost
      FROM shipment_report_view
      WHERE customer_id = p_customer_id::INTEGER
        AND COALESCE(pickup_date, delivery_date)::date BETWEEN v_prev_start AND v_prev_end
        AND carrier_name IS NOT NULL 
        AND carrier_name <> 'Unassigned'
        AND retail IS NOT NULL
      GROUP BY carrier_name
    ) prev ON curr.carrier_name = prev.carrier_name
    WHERE ABS(CASE WHEN COALESCE(prev.avg_cost, 0) = 0 THEN 0
      ELSE ((curr.avg_cost - prev.avg_cost) / prev.avg_cost) * 100 END) > 5
    LIMIT 10
  ) sub;

  RETURN COALESCE(v_results, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_carrier_cost_changes(TEXT, DATE, DATE) TO authenticated;
