/*
  # Fix Top Carriers to Use shipment_carrier Table

  The carrier data was incorrectly coming from shipment.rate_carrier_id (the quoting carrier).
  The ACTUAL carrier who hauled the shipment is in the shipment_carrier table.

  Changes:
  - Join through shipment_carrier table instead of rate_carrier_id
  - Join chain: shipment.load_id -> shipment_carrier.load_id -> carrier.carrier_id
*/

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
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();

  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT verify_customer_access(calling_user_id, p_customer_id) THEN
    RAISE EXCEPTION 'Access denied to customer %', p_customer_id;
  END IF;

  SELECT COUNT(*) INTO total_shipments
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date;

  RETURN QUERY
  SELECT
    COALESCE(c.carrier_name, 'Unassigned')::TEXT as carrier_name,
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
  LEFT JOIN shipment_carrier sc ON s.load_id = sc.load_id
  LEFT JOIN carrier c ON sc.carrier_id = c.carrier_id
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= p_start_date
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= p_end_date
  GROUP BY c.carrier_name
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;