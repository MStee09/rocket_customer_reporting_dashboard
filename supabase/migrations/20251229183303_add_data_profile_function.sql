/*
  # Add Customer Data Profile Function for AI Suggestions

  1. New Functions
    - `get_customer_data_profile(p_customer_id TEXT)` - Returns JSON with customer data characteristics:
      - totalShipments: Total shipment count
      - stateCount: Number of unique destination states
      - carrierCount: Number of unique carriers
      - monthsOfData: Approximate months of shipping history
      - hasCanadaData: Boolean if customer ships to Canadian provinces
      - topStates: Array of top 5 destination states
      - topCarriers: Array of top 3 carriers
      - avgShipmentsPerDay: Average daily shipping volume

  2. Purpose
    - Enables AI to make data-driven visualization suggestions
    - Allows personalized prompts based on actual customer data characteristics
    - Supports proactive recommendation of relevant chart/map types

  3. Security
    - SECURITY DEFINER with explicit search_path for safety
*/

CREATE OR REPLACE FUNCTION get_customer_data_profile(p_customer_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_customer_id INTEGER;
BEGIN
  v_customer_id := p_customer_id::INTEGER;
  
  WITH stats AS (
    SELECT
      COUNT(*) as total_shipments,
      COUNT(DISTINCT destination_state) as state_count,
      COUNT(DISTINCT carrier_id) as carrier_count,
      MIN(pickup_date) as min_date,
      MAX(pickup_date) as max_date
    FROM shipment_report_view
    WHERE customer_id = v_customer_id
  ),
  top_states AS (
    SELECT COALESCE(
      json_agg(destination_state ORDER BY cnt DESC),
      '[]'::json
    ) as states
    FROM (
      SELECT destination_state, COUNT(*) as cnt
      FROM shipment_report_view
      WHERE customer_id = v_customer_id
        AND destination_state IS NOT NULL
      GROUP BY destination_state
      ORDER BY cnt DESC
      LIMIT 5
    ) t
  ),
  top_carriers AS (
    SELECT COALESCE(
      json_agg(carrier_name ORDER BY cnt DESC),
      '[]'::json
    ) as carriers
    FROM (
      SELECT carrier_name, COUNT(*) as cnt
      FROM shipment_report_view
      WHERE customer_id = v_customer_id
        AND carrier_name IS NOT NULL
      GROUP BY carrier_name
      ORDER BY cnt DESC
      LIMIT 3
    ) t
  ),
  canada_check AS (
    SELECT EXISTS(
      SELECT 1 FROM shipment_report_view 
      WHERE customer_id = v_customer_id 
        AND destination_state IN ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')
    ) as has_canada
  )
  SELECT json_build_object(
    'totalShipments', COALESCE(s.total_shipments, 0),
    'stateCount', COALESCE(s.state_count, 0),
    'carrierCount', COALESCE(s.carrier_count, 0),
    'monthsOfData', COALESCE(
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (s.max_date - s.min_date)) / (30 * 24 * 60 * 60)))::INTEGER,
      0
    ),
    'hasCanadaData', COALESCE(cc.has_canada, false),
    'topStates', ts.states,
    'topCarriers', tc.carriers,
    'avgShipmentsPerDay', COALESCE(
      CASE 
        WHEN s.max_date = s.min_date THEN s.total_shipments::FLOAT
        ELSE s.total_shipments::FLOAT / NULLIF(EXTRACT(DAY FROM (s.max_date - s.min_date)), 0)
      END,
      0
    )
  ) INTO result
  FROM stats s
  CROSS JOIN top_states ts
  CROSS JOIN top_carriers tc
  CROSS JOIN canada_check cc;
  
  RETURN COALESCE(result, json_build_object(
    'totalShipments', 0,
    'stateCount', 0,
    'carrierCount', 0,
    'monthsOfData', 0,
    'hasCanadaData', false,
    'topStates', '[]'::json,
    'topCarriers', '[]'::json,
    'avgShipmentsPerDay', 0
  ));
END;
$$;