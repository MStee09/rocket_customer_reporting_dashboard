-- ============================================================================
-- PROACTIVE ANOMALY DETECTION SYSTEM
-- Version: 1.1
-- Date: 2026-01-18
-- 
-- This migration creates an automated anomaly detection system that:
-- 1. Scans customer shipping data for statistical anomalies
-- 2. Automatically populates the detected_anomalies table
-- 3. Provides configurable thresholds per customer
-- 4. Supports both customer-facing and admin views
--
-- Anomaly Types (all customer-visible):
-- - spend_spike: Daily spend significantly above baseline
-- - spend_drop: Daily spend significantly below baseline
-- - volume_spike: Shipment count spike
-- - volume_drop: Shipment count drop
-- - concentration_risk: >60% spend with single carrier
-- - new_lane: First shipment to new origin/dest
-- ============================================================================

-- ============================================================================
-- 0. HELPER FUNCTION: Get client_id for a customer
-- The shipment table uses client_id, not customer_id directly
-- ============================================================================

CREATE OR REPLACE FUNCTION get_client_id_for_customer(p_customer_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id INTEGER;
BEGIN
  -- Get client_id from the customer table
  SELECT client_id INTO v_client_id
  FROM customer
  WHERE customer_id = p_customer_id;
  
  RETURN v_client_id;
END;
$$;

-- ============================================================================
-- 1. ANOMALY DETECTION CONFIGURATION TABLE
-- Allows per-customer threshold customization
-- ============================================================================

CREATE TABLE IF NOT EXISTS anomaly_detection_config (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customer(customer_id) ON DELETE CASCADE,
  
  -- Detection toggles
  detect_spend_anomalies BOOLEAN DEFAULT true,
  detect_volume_anomalies BOOLEAN DEFAULT true,
  detect_concentration_risk BOOLEAN DEFAULT true,
  detect_lane_anomalies BOOLEAN DEFAULT true,
  
  -- Threshold settings (standard deviations)
  spend_warning_threshold NUMERIC DEFAULT 2.0,
  spend_critical_threshold NUMERIC DEFAULT 3.0,
  volume_warning_threshold NUMERIC DEFAULT 2.0,
  volume_critical_threshold NUMERIC DEFAULT 3.0,
  
  -- Percentage thresholds
  concentration_risk_threshold NUMERIC DEFAULT 60.0,      -- 60% with one carrier
  
  -- Lookback periods (days)
  baseline_period_days INTEGER DEFAULT 30,
  comparison_period_days INTEGER DEFAULT 7,
  
  -- Scheduling
  is_active BOOLEAN DEFAULT true,
  last_scan_at TIMESTAMPTZ,
  scan_frequency_hours INTEGER DEFAULT 24,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customer_id)
);

-- Create default config for NULL customer_id (system defaults)
INSERT INTO anomaly_detection_config (customer_id) VALUES (NULL)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_anomaly_config_customer ON anomaly_detection_config(customer_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_config_active ON anomaly_detection_config(is_active) WHERE is_active = true;

-- ============================================================================
-- 2. CORE ANOMALY DETECTION FUNCTION
-- Scans a single customer for all anomaly types
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
  v_client_id INTEGER;
  v_baseline_start DATE;
  v_baseline_end DATE;
  v_current_start DATE;
  v_current_end DATE;
  v_anomalies_found INTEGER := 0;
  
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
BEGIN
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
  
  -- Get client_id for this customer
  v_client_id := get_client_id_for_customer(p_customer_id);
  
  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found or no client_id');
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
    -- Calculate baseline spend statistics
    WITH daily_spend AS (
      SELECT DATE(pickup_date) as day, SUM(retail) as daily_total
      FROM shipment
      WHERE client_id = v_client_id
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
    WHERE client_id = v_client_id
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
      WHERE client_id = v_client_id
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
    WHERE client_id = v_client_id
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
      WHERE s.client_id = v_client_id
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
    
    IF FOUND THEN
      v_anomalies_found := v_anomalies_found + 1;
    END IF;
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
    LIMIT 3;  -- Cap at 3 new lanes per scan
    
    GET DIAGNOSTICS v_anomalies_found = v_anomalies_found + ROW_COUNT;
  END IF;
  
  -- Update last scan timestamp
  UPDATE anomaly_detection_config
  SET last_scan_at = NOW(), updated_at = NOW()
  WHERE customer_id = p_customer_id;
  
  -- If no customer-specific config, don't update the default
  IF NOT FOUND THEN
    -- Create customer-specific config tracking
    INSERT INTO anomaly_detection_config (customer_id, last_scan_at)
    VALUES (p_customer_id, NOW())
    ON CONFLICT (customer_id) DO UPDATE SET last_scan_at = NOW(), updated_at = NOW();
  END IF;
  
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

-- ============================================================================
-- 3. BATCH SCAN FUNCTION
-- Scans all active customers
-- ============================================================================

CREATE OR REPLACE FUNCTION run_anomaly_scan_all_customers(
  p_force_scan BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_results jsonb := '[]'::jsonb;
  v_result jsonb;
  v_total_anomalies INTEGER := 0;
  v_customers_scanned INTEGER := 0;
BEGIN
  -- Get all active customers with recent shipment data
  FOR v_customer IN
    SELECT DISTINCT c.customer_id
    FROM customer c
    JOIN shipment s ON s.customer_id = c.customer_id
    WHERE c.is_active = true
      AND s.pickup_date >= CURRENT_DATE - INTERVAL '90 days'
    ORDER BY c.customer_id
  LOOP
    v_result := run_anomaly_scan_for_customer(v_customer.customer_id, p_force_scan);
    
    IF (v_result->>'skipped')::boolean IS NOT TRUE THEN
      v_customers_scanned := v_customers_scanned + 1;
      v_total_anomalies := v_total_anomalies + COALESCE((v_result->>'anomalies_found')::integer, 0);
    END IF;
    
    v_results := v_results || jsonb_build_object(
      'customer_id', v_customer.customer_id,
      'result', v_result
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'customers_scanned', v_customers_scanned,
    'total_anomalies_found', v_total_anomalies,
    'scan_completed_at', NOW(),
    'details', v_results
  );
END;
$$;

-- ============================================================================
-- 4. CUSTOMER ANOMALY SUMMARY (for customer dashboard)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_anomaly_dashboard_summary(p_customer_id INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_new', COUNT(*) FILTER (WHERE status = 'new'),
    'total_acknowledged', COUNT(*) FILTER (WHERE status = 'acknowledged'),
    'critical_count', COUNT(*) FILTER (WHERE status = 'new' AND severity = 'critical'),
    'warning_count', COUNT(*) FILTER (WHERE status = 'new' AND severity = 'warning'),
    'info_count', COUNT(*) FILTER (WHERE status = 'new' AND severity = 'info'),
    'by_type', COALESCE((
      SELECT jsonb_object_agg(anomaly_type, cnt)
      FROM (
        SELECT anomaly_type, COUNT(*) as cnt
        FROM detected_anomalies
        WHERE customer_id = p_customer_id AND status = 'new'
        GROUP BY anomaly_type
      ) t
    ), '{}'::jsonb),
    'recent_anomalies', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'type', anomaly_type,
          'severity', severity,
          'title', title,
          'description', description,
          'change_percent', change_percent,
          'detected_at', detection_date
        ) ORDER BY 
          CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
          detection_date DESC
      )
      FROM (
        SELECT id, anomaly_type, severity, title, description, change_percent, detection_date
        FROM detected_anomalies
        WHERE customer_id = p_customer_id AND status = 'new'
        ORDER BY 
          CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
          detection_date DESC
        LIMIT 10
      ) recent
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM detected_anomalies
  WHERE customer_id = p_customer_id;
  
  RETURN COALESCE(v_result, jsonb_build_object(
    'total_new', 0,
    'total_acknowledged', 0,
    'critical_count', 0,
    'warning_count', 0,
    'info_count', 0,
    'by_type', '{}'::jsonb,
    'recent_anomalies', '[]'::jsonb
  ));
END;
$$;

-- ============================================================================
-- 5. ADMIN ANOMALY SUMMARY (for admin dashboard - ALL customers)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_anomaly_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_new', COUNT(*) FILTER (WHERE status = 'new'),
    'total_acknowledged', COUNT(*) FILTER (WHERE status = 'acknowledged'),
    'critical_count', COUNT(*) FILTER (WHERE status = 'new' AND severity = 'critical'),
    'warning_count', COUNT(*) FILTER (WHERE status = 'new' AND severity = 'warning'),
    'info_count', COUNT(*) FILTER (WHERE status = 'new' AND severity = 'info'),
    'customers_affected', (
      SELECT COUNT(DISTINCT customer_id) 
      FROM detected_anomalies 
      WHERE status = 'new'
    ),
    'by_type', COALESCE((
      SELECT jsonb_object_agg(anomaly_type, cnt)
      FROM (
        SELECT anomaly_type, COUNT(*) as cnt
        FROM detected_anomalies
        WHERE status = 'new'
        GROUP BY anomaly_type
      ) t
    ), '{}'::jsonb),
    'anomalies_by_customer', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'customer_id', customer_id,
          'customer_name', customer_name,
          'critical_count', critical_count,
          'warning_count', warning_count,
          'info_count', info_count,
          'total', total_count
        ) ORDER BY critical_count DESC, warning_count DESC, total_count DESC
      )
      FROM (
        SELECT 
          da.customer_id,
          c.company_name as customer_name,
          COUNT(*) FILTER (WHERE da.severity = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE da.severity = 'warning') as warning_count,
          COUNT(*) FILTER (WHERE da.severity = 'info') as info_count,
          COUNT(*) as total_count
        FROM detected_anomalies da
        JOIN customer c ON da.customer_id = c.customer_id
        WHERE da.status = 'new'
        GROUP BY da.customer_id, c.company_name
        ORDER BY 
          COUNT(*) FILTER (WHERE da.severity = 'critical') DESC,
          COUNT(*) FILTER (WHERE da.severity = 'warning') DESC,
          COUNT(*) DESC
        LIMIT 20
      ) by_customer
    ), '[]'::jsonb),
    'recent_critical', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', da.id,
          'customer_id', da.customer_id,
          'customer_name', c.company_name,
          'type', da.anomaly_type,
          'severity', da.severity,
          'title', da.title,
          'description', da.description,
          'change_percent', da.change_percent,
          'detected_at', da.detection_date
        ) ORDER BY da.detection_date DESC
      )
      FROM (
        SELECT *
        FROM detected_anomalies
        WHERE status = 'new' AND severity IN ('critical', 'warning')
        ORDER BY 
          CASE severity WHEN 'critical' THEN 1 ELSE 2 END,
          detection_date DESC
        LIMIT 15
      ) da
      JOIN customer c ON da.customer_id = c.customer_id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM detected_anomalies;
  
  RETURN COALESCE(v_result, jsonb_build_object(
    'total_new', 0,
    'total_acknowledged', 0,
    'critical_count', 0,
    'warning_count', 0,
    'info_count', 0,
    'customers_affected', 0,
    'by_type', '{}'::jsonb,
    'anomalies_by_customer', '[]'::jsonb,
    'recent_critical', '[]'::jsonb
  ));
END;
$$;

-- ============================================================================
-- 6. CLEAN UP OLD ANOMALIES
-- Removes resolved/dismissed anomalies older than retention period
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_anomalies(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM detected_anomalies
  WHERE status IN ('resolved', 'dismissed')
    AND updated_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- 7. PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_client_id_for_customer TO authenticated, service_role;
GRANT SELECT ON anomaly_detection_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON anomaly_detection_config TO service_role;

GRANT EXECUTE ON FUNCTION run_anomaly_scan_for_customer TO service_role;
GRANT EXECUTE ON FUNCTION run_anomaly_scan_all_customers TO service_role;
GRANT EXECUTE ON FUNCTION get_anomaly_dashboard_summary TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_admin_anomaly_summary TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_anomalies TO service_role;

-- ============================================================================
-- 8. RLS POLICIES FOR CONFIG TABLE
-- ============================================================================

ALTER TABLE anomaly_detection_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage anomaly config" ON anomaly_detection_config;
CREATE POLICY "Admins can manage anomaly config"
  ON anomaly_detection_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role full access to anomaly config" ON anomaly_detection_config;
CREATE POLICY "Service role full access to anomaly config"
  ON anomaly_detection_config
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_client_id_for_customer IS 'Helper to get client_id from customer_id for shipment queries';
COMMENT ON TABLE anomaly_detection_config IS 'Per-customer configuration for anomaly detection thresholds and schedules';
COMMENT ON FUNCTION run_anomaly_scan_for_customer IS 'Scans a single customer for spending, volume, concentration, and lane anomalies';
COMMENT ON FUNCTION run_anomaly_scan_all_customers IS 'Batch scan all active customers for anomalies';
COMMENT ON FUNCTION get_anomaly_dashboard_summary IS 'Returns anomaly summary for a single customer dashboard';
COMMENT ON FUNCTION get_admin_anomaly_summary IS 'Returns anomaly summary across ALL customers for admin dashboard';
