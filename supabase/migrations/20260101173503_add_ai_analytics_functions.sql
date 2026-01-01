/*
  # AI Analytics Helper Functions

  1. New Functions
    - `get_period_comparison`: Compares volume and spend between current period and previous period
      - Returns current/previous volume, spend, and percentage changes
    - `get_carrier_concentration`: Analyzes carrier usage concentration for a customer
      - Returns total shipments, carrier count, and top carrier details

  2. Security
    - Both functions use SECURITY DEFINER with explicit search_path
    - Granted to authenticated users only

  3. Usage
    - These functions support the AI's proactive insights feature
    - Used by the generate-report edge function for anomaly detection
*/

CREATE OR REPLACE FUNCTION get_period_comparison(
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
  v_current_volume INTEGER;
  v_prev_volume INTEGER;
  v_current_spend NUMERIC;
  v_prev_spend NUMERIC;
BEGIN
  v_period_days := p_end_date - p_start_date;
  v_prev_end := p_start_date - 1;
  v_prev_start := v_prev_end - v_period_days;

  SELECT COUNT(*)::INTEGER, COALESCE(SUM(retail), 0)::NUMERIC
  INTO v_current_volume, v_current_spend
  FROM shipment_report_view
  WHERE customer_id = p_customer_id::INTEGER
    AND pickup_date BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(*)::INTEGER, COALESCE(SUM(retail), 0)::NUMERIC
  INTO v_prev_volume, v_prev_spend
  FROM shipment_report_view
  WHERE customer_id = p_customer_id::INTEGER
    AND pickup_date BETWEEN v_prev_start AND v_prev_end;

  RETURN jsonb_build_object(
    'current_volume', v_current_volume,
    'previous_volume', v_prev_volume,
    'volume_change_percent', CASE
      WHEN v_prev_volume = 0 THEN 0
      ELSE ROUND(((v_current_volume - v_prev_volume)::NUMERIC / v_prev_volume) * 100, 1)
    END,
    'current_spend', ROUND(v_current_spend, 2),
    'previous_spend', ROUND(v_prev_spend, 2),
    'spend_change_percent', CASE
      WHEN v_prev_spend = 0 THEN 0
      ELSE ROUND(((v_current_spend - v_prev_spend) / v_prev_spend) * 100, 1)
    END,
    'period_days', v_period_days,
    'current_start', p_start_date,
    'current_end', p_end_date,
    'previous_start', v_prev_start,
    'previous_end', v_prev_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_period_comparison(TEXT, DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION get_carrier_concentration(
  p_customer_id TEXT,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_carrier_count INTEGER;
  v_top_name TEXT;
  v_top_count INTEGER;
  v_top_carriers JSONB;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM shipment_report_view
  WHERE customer_id = p_customer_id::INTEGER
    AND pickup_date BETWEEN p_start_date AND p_end_date;

  IF v_total = 0 THEN
    RETURN jsonb_build_object(
      'total_shipments', 0,
      'carrier_count', 0,
      'concentration_index', 0,
      'top_carriers', '[]'::jsonb
    );
  END IF;

  SELECT COUNT(DISTINCT carrier_name)::INTEGER
  INTO v_carrier_count
  FROM shipment_report_view
  WHERE customer_id = p_customer_id::INTEGER
    AND pickup_date BETWEEN p_start_date AND p_end_date
    AND carrier_name IS NOT NULL;

  SELECT carrier_name, COUNT(*)::INTEGER
  INTO v_top_name, v_top_count
  FROM shipment_report_view
  WHERE customer_id = p_customer_id::INTEGER
    AND pickup_date BETWEEN p_start_date AND p_end_date
    AND carrier_name IS NOT NULL
  GROUP BY carrier_name
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT jsonb_agg(
    jsonb_build_object(
      'carrier_name', carrier_name,
      'shipment_count', cnt,
      'percent', ROUND((cnt::NUMERIC / v_total) * 100, 1)
    )
  )
  INTO v_top_carriers
  FROM (
    SELECT carrier_name, COUNT(*)::INTEGER as cnt
    FROM shipment_report_view
    WHERE customer_id = p_customer_id::INTEGER
      AND pickup_date BETWEEN p_start_date AND p_end_date
      AND carrier_name IS NOT NULL
    GROUP BY carrier_name
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) top5;

  RETURN jsonb_build_object(
    'total_shipments', v_total,
    'carrier_count', v_carrier_count,
    'top_carrier_name', v_top_name,
    'top_carrier_count', v_top_count,
    'top_carrier_percent', ROUND((v_top_count::NUMERIC / v_total) * 100, 1),
    'top_carriers', COALESCE(v_top_carriers, '[]'::jsonb),
    'concentration_index', CASE
      WHEN v_carrier_count <= 1 THEN 100
      ELSE ROUND((v_top_count::NUMERIC / v_total) * 100, 1)
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_carrier_concentration(TEXT, DATE, DATE) TO authenticated;
