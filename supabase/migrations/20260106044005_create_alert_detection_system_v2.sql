/*
  # Alert Detection System for Widget Alerts

  1. New Functions
    - `verify_customer_access` - Verifies if a user has access to a customer
    - `detect_widget_alerts` - Core alert detection function
    - `run_anomaly_detection` - Single customer detection (used by RunAnomalyDetection)
    - `run_anomaly_detection_all` - All customers detection (used by RunAnomalyDetection)

  2. Security
    - Service role can insert widget_alerts (needed for SECURITY DEFINER functions)
    - Functions use SECURITY DEFINER with search_path = public

  3. Alert Detection Rules
    - Spend spike: >20% increase vs previous period
    - Volume drop: >20% decrease in shipments
    - Late delivery spike: >30% more late deliveries
*/

-- Drop existing functions to allow signature changes
DROP FUNCTION IF EXISTS run_anomaly_detection_all();
DROP FUNCTION IF EXISTS run_anomaly_detection(INTEGER);
DROP FUNCTION IF EXISTS detect_widget_alerts(INTEGER);

-- Verify customer access function (if not exists)
CREATE OR REPLACE FUNCTION verify_customer_access(p_user_id UUID, p_customer_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND user_role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM users_customers
    WHERE user_id = p_user_id AND customer_id = p_customer_id
  );
END;
$$;

-- Grant execute on verify_customer_access
GRANT EXECUTE ON FUNCTION verify_customer_access(UUID, INTEGER) TO authenticated, service_role;

-- Service role policy for inserting widget_alerts (needed for SECURITY DEFINER functions)
DROP POLICY IF EXISTS "Service role can insert widget alerts" ON widget_alerts;
CREATE POLICY "Service role can insert widget alerts"
  ON widget_alerts FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update widget alerts" ON widget_alerts;
CREATE POLICY "Service role can update widget alerts"
  ON widget_alerts FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Core alert detection function for a single customer
CREATE OR REPLACE FUNCTION detect_widget_alerts(p_customer_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_period_start DATE;
  current_period_end DATE;
  prev_period_start DATE;
  prev_period_end DATE;
  current_spend NUMERIC;
  prev_spend NUMERIC;
  current_shipments INTEGER;
  prev_shipments INTEGER;
  current_late INTEGER;
  prev_late INTEGER;
  current_delivered INTEGER;
  prev_delivered INTEGER;
  alerts_created INTEGER := 0;
  spend_change NUMERIC;
  volume_change NUMERIC;
  late_change NUMERIC;
BEGIN
  -- Define periods: last 30 days vs previous 30 days
  current_period_end := CURRENT_DATE;
  current_period_start := CURRENT_DATE - 30;
  prev_period_end := current_period_start - 1;
  prev_period_start := prev_period_end - 30;

  -- Get current period metrics
  SELECT 
    COALESCE(SUM(s.retail), 0),
    COUNT(*),
    COUNT(*) FILTER (
      WHERE s.delivery_date IS NOT NULL 
      AND s.expected_delivery_date IS NOT NULL 
      AND s.delivery_date > s.expected_delivery_date
    ),
    COUNT(*) FILTER (WHERE s.delivery_date IS NOT NULL)
  INTO current_spend, current_shipments, current_late, current_delivered
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= current_period_start
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= current_period_end;

  -- Get previous period metrics
  SELECT 
    COALESCE(SUM(s.retail), 0),
    COUNT(*),
    COUNT(*) FILTER (
      WHERE s.delivery_date IS NOT NULL 
      AND s.expected_delivery_date IS NOT NULL 
      AND s.delivery_date > s.expected_delivery_date
    ),
    COUNT(*) FILTER (WHERE s.delivery_date IS NOT NULL)
  INTO prev_spend, prev_shipments, prev_late, prev_delivered
  FROM shipment s
  WHERE s.customer_id = p_customer_id
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) >= prev_period_start
    AND COALESCE(s.pickup_date::DATE, s.created_date::DATE) <= prev_period_end;

  -- Calculate changes
  IF prev_spend > 0 THEN
    spend_change := ((current_spend - prev_spend) / prev_spend) * 100;
  ELSE
    spend_change := 0;
  END IF;

  IF prev_shipments > 0 THEN
    volume_change := ((current_shipments - prev_shipments)::NUMERIC / prev_shipments) * 100;
  ELSE
    volume_change := 0;
  END IF;

  IF prev_delivered > 0 AND prev_late > 0 THEN
    late_change := ((current_late::NUMERIC / NULLIF(current_delivered, 0)) - (prev_late::NUMERIC / prev_delivered)) * 100;
  ELSE
    late_change := 0;
  END IF;

  -- Clear old active alerts for this customer (to prevent duplicates)
  UPDATE widget_alerts
  SET status = 'resolved', updated_at = now()
  WHERE customer_id = p_customer_id
    AND status = 'active'
    AND triggered_at < CURRENT_DATE - 1;

  -- Alert 1: Spend spike (>20% increase)
  IF spend_change > 20 THEN
    INSERT INTO widget_alerts (
      customer_id, widget_key, alert_type, severity, title, description,
      change_percent, current_value, previous_value, investigate_query, methodology
    ) VALUES (
      p_customer_id,
      'total-spend',
      'spend_spike',
      CASE WHEN spend_change > 50 THEN 'critical'::alert_severity ELSE 'warning'::alert_severity END,
      'Spend Spike Detected',
      format('Shipping spend increased by %.1f%% compared to the previous period', spend_change),
      spend_change,
      current_spend,
      prev_spend,
      'Show me the top cost increases by carrier this month',
      'Compares total retail spend for current 30-day period vs previous 30 days'
    );
    alerts_created := alerts_created + 1;
  END IF;

  -- Alert 2: Volume drop (>20% decrease)
  IF volume_change < -20 THEN
    INSERT INTO widget_alerts (
      customer_id, widget_key, alert_type, severity, title, description,
      change_percent, current_value, previous_value, investigate_query, methodology
    ) VALUES (
      p_customer_id,
      'total-shipments',
      'volume_drop',
      CASE WHEN volume_change < -40 THEN 'critical'::alert_severity ELSE 'warning'::alert_severity END,
      'Volume Drop Detected',
      format('Shipment volume decreased by %.1f%% compared to the previous period', ABS(volume_change)),
      volume_change,
      current_shipments,
      prev_shipments,
      'Show me shipment trends by week for the last 60 days',
      'Compares total shipment count for current 30-day period vs previous 30 days'
    );
    alerts_created := alerts_created + 1;
  END IF;

  -- Alert 3: Late delivery spike (>30% increase in late rate)
  IF late_change > 30 AND current_delivered > 10 THEN
    INSERT INTO widget_alerts (
      customer_id, widget_key, alert_type, severity, title, description,
      change_percent, current_value, previous_value, investigate_query, methodology
    ) VALUES (
      p_customer_id,
      'on-time-delivery',
      'late_spike',
      'critical'::alert_severity,
      'Late Delivery Spike',
      format('Late delivery rate increased significantly compared to the previous period'),
      late_change,
      current_late,
      prev_late,
      'Show me carriers with the most late deliveries this month',
      'Compares late delivery percentage for current 30-day period vs previous 30 days'
    );
    alerts_created := alerts_created + 1;
  END IF;

  RETURN alerts_created;
END;
$$;

-- Run anomaly detection for a single customer (matches RunAnomalyDetection component)
CREATE OR REPLACE FUNCTION run_anomaly_detection(p_customer_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT verify_customer_access(calling_user_id, p_customer_id) THEN
    RAISE EXCEPTION 'Access denied to customer %', p_customer_id;
  END IF;

  RETURN detect_widget_alerts(p_customer_id);
END;
$$;

-- Run anomaly detection for all customers (admin only)
CREATE OR REPLACE FUNCTION run_anomaly_detection_all()
RETURNS TABLE (
  customer_id INTEGER,
  customer_name TEXT,
  anomalies_found INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id UUID;
  cust RECORD;
  alerts_count INTEGER;
BEGIN
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Must be admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = calling_user_id AND user_role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Process each active customer
  FOR cust IN 
    SELECT DISTINCT c.id, c.company_name
    FROM customers c
    JOIN shipment s ON s.customer_id = c.id
    WHERE COALESCE(s.pickup_date::DATE, s.created_date::DATE) > CURRENT_DATE - 90
    ORDER BY c.company_name
  LOOP
    BEGIN
      alerts_count := detect_widget_alerts(cust.id);
      customer_id := cust.id;
      customer_name := cust.company_name;
      anomalies_found := alerts_count;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      customer_id := cust.id;
      customer_name := cust.company_name;
      anomalies_found := 0;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION detect_widget_alerts(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION run_anomaly_detection(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION run_anomaly_detection_all() TO authenticated, service_role;
