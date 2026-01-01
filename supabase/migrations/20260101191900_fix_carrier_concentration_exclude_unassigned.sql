/*
  # Fix Carrier Concentration to Exclude Unassigned

  1. Changes
    - Updates get_carrier_concentration function to exclude 'Unassigned' from carrier analysis
    - 'Unassigned' is a placeholder in shipment_report_view when carrier data is missing
    - This ensures only real carriers are counted in concentration metrics

  2. Security
    - SECURITY DEFINER with explicit search_path maintained
    - Granted to authenticated users only
*/

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
    AND COALESCE(pickup_date, delivery_date) BETWEEN p_start_date AND p_end_date;

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
    AND COALESCE(pickup_date, delivery_date) BETWEEN p_start_date AND p_end_date
    AND carrier_name IS NOT NULL
    AND carrier_name <> 'Unassigned';

  SELECT carrier_name, COUNT(*)::INTEGER
  INTO v_top_name, v_top_count
  FROM shipment_report_view
  WHERE customer_id = p_customer_id::INTEGER
    AND COALESCE(pickup_date, delivery_date) BETWEEN p_start_date AND p_end_date
    AND carrier_name IS NOT NULL
    AND carrier_name <> 'Unassigned'
  GROUP BY carrier_name
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  IF v_top_name IS NULL THEN
    RETURN jsonb_build_object(
      'total_shipments', v_total,
      'carrier_count', 0,
      'top_carrier_name', NULL,
      'top_carrier_count', 0,
      'top_carrier_percent', 0,
      'top_carriers', '[]'::jsonb,
      'concentration_index', 0
    );
  END IF;

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
      AND COALESCE(pickup_date, delivery_date) BETWEEN p_start_date AND p_end_date
      AND carrier_name IS NOT NULL
      AND carrier_name <> 'Unassigned'
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
