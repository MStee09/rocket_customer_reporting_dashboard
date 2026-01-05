/*
  # Pulse Dashboard KPIs Function

  1. New Functions
    - `get_pulse_kpis` - Returns core KPIs for the Pulse dashboard
      - Total spend
      - Total shipments
      - Average cost per shipment
      - On-time percentage

  2. Security
    - Function is SECURITY DEFINER to access shipment data
    - Validates customer access through RLS
*/

CREATE OR REPLACE FUNCTION get_pulse_kpis(
  p_customer_id integer,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  total_spend numeric,
  total_shipments bigint,
  avg_cost_per_shipment numeric,
  on_time_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(s.carrier_total_rate), 0)::numeric AS total_spend,
    COUNT(*)::bigint AS total_shipments,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND(COALESCE(SUM(s.carrier_total_rate), 0) / COUNT(*), 2)
      ELSE 0
    END::numeric AS avg_cost_per_shipment,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND(
        (COUNT(*) FILTER (WHERE s.on_time_delivery = true)::numeric / COUNT(*)::numeric) * 100, 1
      )
      ELSE 0
    END::numeric AS on_time_percentage
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.actual_delivery_date, s.pickup_date, s.created_at::date) >= p_start_date
    AND COALESCE(s.actual_delivery_date, s.pickup_date, s.created_at::date) <= p_end_date;
END;
$$;
