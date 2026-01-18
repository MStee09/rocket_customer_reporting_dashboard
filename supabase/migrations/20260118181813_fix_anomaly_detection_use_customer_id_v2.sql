/*
  # Fix Anomaly Detection - Use customer_id directly
  
  1. Changes
    - Drop unnecessary helper function `get_client_id_for_customer`
    - Recreate `run_anomaly_scan_for_customer` using customer_id directly
    - Shipments are already linked via shipment.customer_id, no mapping needed
  
  2. Impact
    - Anomaly detection will now work correctly
    - Scans will properly detect spend/volume changes
    - Carrier concentration and lane detection will function
*/

-- Drop the unnecessary helper function
DROP FUNCTION IF EXISTS get_client_id_for_customer(INTEGER);

-- ============================================================================
-- RECREATE: run_anomaly_scan_for_customer using customer_id directly
-- ============================================================================

CREATE OR REPLACE FUNCTION run_anomaly_scan_for_customer(
  p_customer_id INTEGER,
  p_force_scan BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_baseline_start DATE;
  v_baseline_end DATE;
  v_current_start DATE;
  v_current_end DATE;
  v_anomalies_found INTEGER := 0;
  v_rows_affected INTEGER;
  
  -- Baseline metrics
  v_baseline_spend NUMERIC;
  v_baseline_spend_stddev NUMERIC;
  v_baseline_volume NUMERIC;
  v_baseline_volume_stddev NUMERIC;
  
  -- Current metrics
  v_current_spend NUMERIC;
  v_current_volume NUMERIC;
  
  -- Calculated values
  v_spend_deviation NUMERIC;
  v_volume_deviation NUMERIC;
  v_severity TEXT;
  v_change_percent NUMERIC;
  
  -- Customer validation
  v_customer_exists BOOLEAN;
BEGIN
  -- Validate customer exists
  SELECT EXISTS(SELECT 1 FROM customer WHERE customer_id = p_customer_id) INTO v_customer_exists;
  
  IF NOT v_customer_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Get customer's config (or system defaults)
  SELECT * INTO v_config
  FROM anomaly_detection_config
  WHERE customer_id = p_customer_id OR customer_id IS NULL
  ORDER BY customer_id NULLS LAST
  LIMIT 1;
  
  -- Use defaults if no config found
  IF v_config IS NULL THEN
    v_config := ROW(
      0, NULL, true, true, true, true,
      2.0, 3.0, 2.0, 3.0, 60.0, 30, 7,
      true, NULL, 24, NOW(), NOW()
    )::anomaly_detection_config;
  END IF;
  
  -- Check if scan is needed
  IF NOT p_force_scan AND v_config.last_scan_at IS NOT NULL THEN
    IF v_config.last_scan_at > NOW() - (v_config.scan_frequency_hours || ' hours')::INTERVAL THEN
      RETURN jsonb_build_object(
        'success', true,
        'skipped', true,
        'reason', 'Scan not due yet',
        'next_scan_at', v_config.last_scan_at + (v_config.scan_frequency_hours || ' hours')::INTERVAL
      );
    END IF;
  END IF;
  
  -- Calculate date ranges
  v_current_end := CURRENT_DATE;
  v_current_start := v_current_end - v_config.comparison_period_days;
  v_baseline_end := v_current_start - 1;
  v_baseline_start := v_baseline_end - v_config.baseline_period_days;
  
  -- ========================================================================
  -- SPEND ANOMALY DETECTION
  -- ========================================================================
  IF v_config.detect_spend_anomalies THEN
    -- Calculate baseline spend statistics (using customer_id directly)
    WITH daily_spend AS (
      SELECT DATE(pickup_date) as day, SUM(retail) as daily_total
      FROM shipment
      WHERE customer_id = p_customer_id
        AND pickup_date >= v_baseline_start
        AND pickup_date < v_baseline_end
      GROUP BY DATE(pickup_date)
    )
    SELECT COALESCE(AVG(daily_total), 0), COALESCE(STDDEV(daily_total), 0)
    INTO v_baseline_spend, v_baseline_spend_stddev
    FROM daily_spend;
    
    -- Calculate current period average daily spend
    SELECT COALESCE(SUM(retail) / NULLIF(v_config.comparison_period_days, 0), 0)
    INTO v_current_spend
    FROM shipment
    WHERE customer_id = p_customer_id
      AND pickup_date >= v_current_start
      AND pickup_date <= v_current_end;
    
    -- Check for spend anomaly
    IF v_baseline_spend_stddev > 0 AND v_baseline_spend > 0 THEN
      v_spend_deviation := (v_current_spend - v_baseline_spend) / v_baseline_spend_stddev;
      v_change_percent := ROUND(((v_current_spend - v_baseline_spend) / NULLIF(v_baseline_spend, 0)) * 100, 1);
      
      IF ABS(v_spend_deviation) >= v_config.spend_critical_threshold THEN
        v_severity := 'critical';
      ELSIF ABS(v_spend_deviation) >= v_config.spend_warning_threshold THEN
        v_severity := 'warning';
      ELSE
        v_severity := NULL;
      END IF;
      
      IF v_severity IS NOT NULL THEN
        -- Check if similar anomaly already exists (within last 7 days)
        IF NOT EXISTS (
          SELECT 1 FROM detected_anomalies 
          WHERE customer_id = p_customer_id 
            AND anomaly_type = CASE WHEN v_spend_deviation > 0 THEN 'spend_spike' ELSE 'spend_drop' END
            AND status = 'new'
            AND detection_date > NOW() - INTERVAL '7 days'
        ) THEN
          INSERT INTO detected_anomalies (
            customer_id, anomaly_type, severity, title, description,
            metric, current_value, baseline_value, change_percent,
            suggested_actions, status
          ) VALUES (
            p_customer_id,
            CASE WHEN v_spend_deviation > 0 THEN 'spend_spike' ELSE 'spend_drop' END,
            v_severity,
            CASE WHEN v_spend_deviation > 0 
              THEN 'Spending Spike Detected'
              ELSE 'Spending Drop Detected'
            END,
            CASE WHEN v_spend_deviation > 0
              THEN format('Daily spend increased to $%s (%.1f%% above your 30-day average of $%s)', 
                          ROUND(v_current_spend::NUMERIC, 0), ABS(v_change_percent), ROUND(v_baseline_spend::NUMERIC, 0))
              ELSE format('Daily spend decreased to $%s (%.1f%% below your 30-day average of $%s)',
                          ROUND(v_current_spend::NUMERIC, 0), ABS(v_change_percent), ROUND(v_baseline_spend::NUMERIC, 0))
            END,
            'daily_spend',
            ROUND(v_current_spend, 2),
            ROUND(v_baseline_spend, 2),
            v_change_percent,
            jsonb_build_array(
              jsonb_build_object(
                'action', CASE WHEN v_spend_deviation > 0 
                  THEN 'Review recent shipments for unusual activity or rate changes'
                  ELSE 'Investigate potential lost business or seasonal factors'
                END,
                'priority', 'high'
              )
            ),
            'new'
          );
          
          v_anomalies_found := v_anomalies_found + 1;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- ========================================================================
  -- VOLUME ANOMALY DETECTION
  -- ========================================================================
  IF v_config.detect_volume_anomalies THEN
    -- Calculate baseline volume statistics
    WITH daily_volume AS (
      SELECT DATE(pickup_date) as day, COUNT(*) as daily_count
      FROM shipment
      WHERE customer_id = p_customer_id
        AND pickup_date >= v_baseline_start
        AND pickup_date < v_baseline_end
      GROUP BY DATE(pickup_date)
    )
    SELECT COALESCE(AVG(daily_count), 0), COALESCE(STDDEV(daily_count), 0)
    INTO v_baseline_volume, v_baseline_volume_stddev
    FROM daily_volume;
    
    -- Calculate current period average daily volume
    SELECT COALESCE(COUNT(*)::NUMERIC / NULLIF(v_config.comparison_period_days, 0), 0)
    INTO v_current_volume
    FROM shipment
    WHERE customer_id = p_customer_id
      AND pickup_date >= v_current_start
      AND pickup_date <= v_current_end;
    
    -- Check for volume anomaly
    IF v_baseline_volume_stddev > 0 AND v_baseline_volume > 0 THEN
      v_volume_deviation := (v_current_volume - v_baseline_volume) / v_baseline_volume_stddev;
      v_change_percent := ROUND(((v_current_volume - v_baseline_volume) / NULLIF(v_baseline_volume, 0)) * 100, 1);
      
      IF ABS(v_volume_deviation) >= v_config.volume_critical_threshold THEN
        v_severity := 'critical';
      ELSIF ABS(v_volume_deviation) >= v_config.volume_warning_threshold THEN
        v_severity := 'warning';
      ELSE
        v_severity := NULL;
      END IF;
      
      IF v_severity IS NOT NULL THEN
        -- Check if similar anomaly already exists
        IF NOT EXISTS (
          SELECT 1 FROM detected_anomalies 
          WHERE customer_id = p_customer_id 
            AND anomaly_type = CASE WHEN v_volume_deviation > 0 THEN 'volume_spike' ELSE 'volume_drop' END
            AND status = 'new'
            AND detection_date > NOW() - INTERVAL '7 days'
        ) THEN
          INSERT INTO detected_anomalies (
            customer_id, anomaly_type, severity, title, description,
            metric, current_value, baseline_value, change_percent,
            suggested_actions, status
          ) VALUES (
            p_customer_id,
            CASE WHEN v_volume_deviation > 0 THEN 'volume_spike' ELSE 'volume_drop' END,
            v_severity,
            CASE WHEN v_volume_deviation > 0 
              THEN 'Shipment Volume Spike'
              ELSE 'Shipment Volume Drop'
            END,
            CASE WHEN v_volume_deviation > 0
              THEN format('Daily shipments increased to %s (%.1f%% above your 30-day average of %s)', 
                          ROUND(v_current_volume), ABS(v_change_percent), ROUND(v_baseline_volume))
              ELSE format('Daily shipments decreased to %s (%.1f%% below your 30-day average of %s)',
                          ROUND(v_current_volume), ABS(v_change_percent), ROUND(v_baseline_volume))
            END,
            'daily_volume',
            ROUND(v_current_volume),
            ROUND(v_baseline_volume),
            v_change_percent,
            jsonb_build_array(
              jsonb_build_object(
                'action', CASE WHEN v_volume_deviation > 0 
                  THEN 'Verify this volume increase is expected'
                  ELSE 'Check for operational issues or market changes'
                END,
                'priority', 'medium'
              )
            ),
            'new'
          );
          
          v_anomalies_found := v_anomalies_found + 1;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- ========================================================================
  -- CARRIER CONCENTRATION RISK
  -- ========================================================================
  IF v_config.detect_concentration_risk THEN
    WITH carrier_spend AS (
      SELECT 
        c.carrier_name,
        SUM(s.retail) as carrier_total,
        SUM(SUM(s.retail)) OVER () as grand_total
      FROM shipment s
      JOIN shipment_carrier sc ON s.load_id = sc.load_id
      JOIN carrier c ON sc.carrier_id = c.carrier_id
      WHERE s.customer_id = p_customer_id
        AND s.pickup_date >= v_current_start
        AND s.pickup_date <= v_current_end
        AND c.carrier_name IS NOT NULL
        AND c.carrier_name != ''
      GROUP BY c.carrier_name
    ),
    top_carrier AS (
      SELECT 
        carrier_name,
        carrier_total,
        grand_total,
        ROUND((carrier_total / NULLIF(grand_total, 0) * 100)::NUMERIC, 1) as concentration_pct
      FROM carrier_spend
      WHERE grand_total > 0
      ORDER BY carrier_total DESC
      LIMIT 1
    )
    INSERT INTO detected_anomalies (
      customer_id, anomaly_type, severity, title, description,
      metric, current_value, baseline_value, change_percent,
      affected_dimension, affected_value,
      suggested_actions, status
    )
    SELECT
      p_customer_id,
      'concentration_risk',
      CASE WHEN concentration_pct >= 80 THEN 'critical' ELSE 'warning' END,
      'Carrier Concentration Risk',
      format('%s accounts for %.0f%% of your shipping spend', carrier_name, concentration_pct),
      'carrier_concentration',
      concentration_pct,
      v_config.concentration_risk_threshold,
      concentration_pct - v_config.concentration_risk_threshold,
      'carrier',
      carrier_name,
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Consider diversifying carrier mix to reduce risk',
          'priority', 'medium'
        )
      ),
      'new'
    FROM top_carrier
    WHERE concentration_pct >= v_config.concentration_risk_threshold
      AND NOT EXISTS (
        SELECT 1 FROM detected_anomalies 
        WHERE customer_id = p_customer_id 
          AND anomaly_type = 'concentration_risk'
          AND status = 'new'
          AND detection_date > NOW() - INTERVAL '30 days'
      );
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    v_anomalies_found := v_anomalies_found + v_rows_affected;
  END IF;
  
  -- ========================================================================
  -- NEW LANE DETECTION (informational)
  -- ========================================================================
  IF v_config.detect_lane_anomalies THEN
    WITH new_lanes AS (
      SELECT DISTINCT
        origin_state,
        dest_state
      FROM shipment_report_view
      WHERE customer_id = p_customer_id
        AND pickup_date >= v_current_start
        AND pickup_date <= v_current_end
        AND origin_state IS NOT NULL
        AND dest_state IS NOT NULL
      EXCEPT
      SELECT DISTINCT
        origin_state,
        dest_state
      FROM shipment_report_view
      WHERE customer_id = p_customer_id
        AND pickup_date >= v_baseline_start
        AND pickup_date < v_baseline_end
        AND origin_state IS NOT NULL
        AND dest_state IS NOT NULL
    )
    INSERT INTO detected_anomalies (
      customer_id, anomaly_type, severity, title, description,
      metric, current_value, baseline_value, change_percent,
      affected_dimension, affected_value,
      suggested_actions, status
    )
    SELECT
      p_customer_id,
      'new_lane',
      'info',
      'New Shipping Lane Detected',
      format('First shipments detected on lane: %s → %s', origin_state, dest_state),
      'lane_count',
      1,
      0,
      100,
      'lane',
      origin_state || ' → ' || dest_state,
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Review rate competitiveness for this new lane',
          'priority', 'low'
        )
      ),
      'new'
    FROM new_lanes
    WHERE NOT EXISTS (
      SELECT 1 FROM detected_anomalies 
      WHERE customer_id = p_customer_id 
        AND anomaly_type = 'new_lane'
        AND affected_value = new_lanes.origin_state || ' → ' || new_lanes.dest_state
        AND detection_date > NOW() - INTERVAL '30 days'
    )
    LIMIT 3;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    v_anomalies_found := v_anomalies_found + v_rows_affected;
  END IF;
  
  -- Update last scan timestamp
  INSERT INTO anomaly_detection_config (customer_id, last_scan_at)
  VALUES (p_customer_id, NOW())
  ON CONFLICT (customer_id) DO UPDATE SET last_scan_at = NOW(), updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'anomalies_found', v_anomalies_found,
    'scan_period', jsonb_build_object(
      'baseline_start', v_baseline_start,
      'baseline_end', v_baseline_end,
      'current_start', v_current_start,
      'current_end', v_current_end
    ),
    'scanned_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION run_anomaly_scan_for_customer TO service_role;
GRANT EXECUTE ON FUNCTION run_anomaly_scan_for_customer TO authenticated;

COMMENT ON FUNCTION run_anomaly_scan_for_customer IS 'Scans a single customer for anomalies using customer_id directly';
