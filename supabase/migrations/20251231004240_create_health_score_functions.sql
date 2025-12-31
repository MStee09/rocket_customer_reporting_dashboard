/*
  # Health Score Calculation Functions

  1. New Functions
    - `calculate_customer_health_score(p_customer_id)` - Calculates score for single customer
    - `recalculate_all_health_scores()` - Recalculates scores for all customers

  2. Scoring Methodology
    - Volume Trend (0-25): Change in shipment count vs prior period
    - Revenue Retention (0-25): Change in revenue vs prior period  
    - Engagement (0-25): Current period activity level
    - Recency (0-25): Days since last shipment

  3. Status Thresholds
    - Thriving: 85-100
    - Healthy: 70-84
    - Watch: 50-69
    - At-Risk: 25-49
    - Critical: 0-24
*/

-- Function to calculate health score for a single customer
CREATE OR REPLACE FUNCTION calculate_customer_health_score(p_customer_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipments_current integer;
  v_shipments_previous integer;
  v_revenue_current numeric;
  v_revenue_previous numeric;
  v_last_shipment_date date;
  v_days_since_last integer;
  v_volume_score integer;
  v_revenue_score integer;
  v_engagement_score integer;
  v_recency_score integer;
  v_overall_score integer;
  v_status text;
  v_volume_change numeric;
  v_revenue_change numeric;
BEGIN
  -- Get current period metrics (last 30 days) using delivery_date
  SELECT COUNT(*), COALESCE(SUM(retail), 0)
  INTO v_shipments_current, v_revenue_current
  FROM shipment
  WHERE customer_id = p_customer_id
    AND delivery_date >= CURRENT_DATE - 30
    AND delivery_date <= CURRENT_DATE;
  
  -- Get previous period metrics (31-60 days ago)
  SELECT COUNT(*), COALESCE(SUM(retail), 0)
  INTO v_shipments_previous, v_revenue_previous
  FROM shipment
  WHERE customer_id = p_customer_id
    AND delivery_date >= CURRENT_DATE - 60
    AND delivery_date < CURRENT_DATE - 30;
  
  -- Get most recent delivery date
  SELECT MAX(delivery_date) INTO v_last_shipment_date
  FROM shipment 
  WHERE customer_id = p_customer_id;
  
  -- Calculate days since last shipment
  v_days_since_last := CASE 
    WHEN v_last_shipment_date IS NOT NULL 
    THEN CURRENT_DATE - v_last_shipment_date 
    ELSE 999 
  END;
  
  -- Calculate Volume Score (0-25)
  IF v_shipments_previous = 0 THEN
    v_volume_score := CASE WHEN v_shipments_current > 0 THEN 25 ELSE 0 END;
    v_volume_change := NULL;
  ELSE
    v_volume_change := ((v_shipments_current::numeric - v_shipments_previous) / v_shipments_previous) * 100;
    v_volume_score := CASE
      WHEN v_volume_change >= 10 THEN 25
      WHEN v_volume_change >= 0 THEN 20
      WHEN v_volume_change >= -10 THEN 15
      WHEN v_volume_change >= -25 THEN 10
      WHEN v_volume_change >= -50 THEN 5
      ELSE 0
    END;
  END IF;
  
  -- Calculate Revenue Score (0-25)
  IF v_revenue_previous = 0 THEN
    v_revenue_score := CASE WHEN v_revenue_current > 0 THEN 25 ELSE 0 END;
    v_revenue_change := NULL;
  ELSE
    v_revenue_change := ((v_revenue_current - v_revenue_previous) / v_revenue_previous) * 100;
    v_revenue_score := CASE
      WHEN v_revenue_change >= 10 THEN 25
      WHEN v_revenue_change >= 0 THEN 20
      WHEN v_revenue_change >= -10 THEN 15
      WHEN v_revenue_change >= -25 THEN 10
      WHEN v_revenue_change >= -50 THEN 5
      ELSE 0
    END;
  END IF;
  
  -- Calculate Engagement Score (0-25)
  v_engagement_score := CASE
    WHEN v_shipments_current >= 10 THEN 25
    WHEN v_shipments_current >= 5 THEN 20
    WHEN v_shipments_current >= 2 THEN 15
    WHEN v_shipments_current >= 1 THEN 10
    ELSE 0
  END;
  
  -- Calculate Recency Score (0-25)
  v_recency_score := CASE
    WHEN v_days_since_last <= 7 THEN 25
    WHEN v_days_since_last <= 14 THEN 20
    WHEN v_days_since_last <= 21 THEN 15
    WHEN v_days_since_last <= 30 THEN 10
    WHEN v_days_since_last <= 45 THEN 5
    ELSE 0
  END;
  
  -- Calculate overall score
  v_overall_score := v_volume_score + v_revenue_score + v_engagement_score + v_recency_score;
  
  -- Determine status
  v_status := CASE
    WHEN v_overall_score >= 85 THEN 'thriving'
    WHEN v_overall_score >= 70 THEN 'healthy'
    WHEN v_overall_score >= 50 THEN 'watch'
    WHEN v_overall_score >= 25 THEN 'at-risk'
    ELSE 'critical'
  END;
  
  RETURN jsonb_build_object(
    'customer_id', p_customer_id,
    'overall_score', v_overall_score,
    'status', v_status,
    'volume_trend_score', v_volume_score,
    'revenue_retention_score', v_revenue_score,
    'engagement_score', v_engagement_score,
    'recency_score', v_recency_score,
    'shipments_current_period', v_shipments_current,
    'shipments_previous_period', v_shipments_previous,
    'revenue_current_period', v_revenue_current,
    'revenue_previous_period', v_revenue_previous,
    'days_since_last_shipment', v_days_since_last,
    'last_shipment_date', v_last_shipment_date,
    'volume_change_percent', v_volume_change,
    'revenue_change_percent', v_revenue_change
  );
END;
$$;

-- Function to recalculate all customer health scores
CREATE OR REPLACE FUNCTION recalculate_all_health_scores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer record;
  v_score jsonb;
  v_count integer := 0;
  v_old_status text;
BEGIN
  FOR v_customer IN 
    SELECT customer_id FROM customer WHERE is_active = true
  LOOP
    SELECT status INTO v_old_status 
    FROM customer_health_scores 
    WHERE customer_id = v_customer.customer_id;
    
    v_score := calculate_customer_health_score(v_customer.customer_id);
    
    INSERT INTO customer_health_scores (
      customer_id, overall_score, status,
      volume_trend_score, revenue_retention_score, engagement_score, recency_score,
      shipments_current_period, shipments_previous_period,
      revenue_current_period, revenue_previous_period,
      days_since_last_shipment, last_shipment_date,
      volume_change_percent, revenue_change_percent,
      calculated_at, updated_at
    ) VALUES (
      v_customer.customer_id,
      (v_score->>'overall_score')::integer,
      v_score->>'status',
      (v_score->>'volume_trend_score')::integer,
      (v_score->>'revenue_retention_score')::integer,
      (v_score->>'engagement_score')::integer,
      (v_score->>'recency_score')::integer,
      (v_score->>'shipments_current_period')::integer,
      (v_score->>'shipments_previous_period')::integer,
      (v_score->>'revenue_current_period')::numeric,
      (v_score->>'revenue_previous_period')::numeric,
      (v_score->>'days_since_last_shipment')::integer,
      (v_score->>'last_shipment_date')::date,
      (v_score->>'volume_change_percent')::numeric,
      (v_score->>'revenue_change_percent')::numeric,
      now(), now()
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      overall_score = EXCLUDED.overall_score,
      status = EXCLUDED.status,
      volume_trend_score = EXCLUDED.volume_trend_score,
      revenue_retention_score = EXCLUDED.revenue_retention_score,
      engagement_score = EXCLUDED.engagement_score,
      recency_score = EXCLUDED.recency_score,
      shipments_current_period = EXCLUDED.shipments_current_period,
      shipments_previous_period = EXCLUDED.shipments_previous_period,
      revenue_current_period = EXCLUDED.revenue_current_period,
      revenue_previous_period = EXCLUDED.revenue_previous_period,
      days_since_last_shipment = EXCLUDED.days_since_last_shipment,
      last_shipment_date = EXCLUDED.last_shipment_date,
      volume_change_percent = EXCLUDED.volume_change_percent,
      revenue_change_percent = EXCLUDED.revenue_change_percent,
      calculated_at = EXCLUDED.calculated_at,
      updated_at = EXCLUDED.updated_at;
    
    INSERT INTO customer_health_history (customer_id, overall_score, status)
    VALUES (v_customer.customer_id, (v_score->>'overall_score')::integer, v_score->>'status');
    
    IF v_old_status IS NOT NULL AND v_old_status != v_score->>'status' THEN
      IF (v_score->>'status') IN ('at-risk', 'critical') THEN
        INSERT INTO customer_health_alerts (customer_id, alert_type, severity, message)
        VALUES (
          v_customer.customer_id,
          'status_change',
          CASE WHEN (v_score->>'status') = 'critical' THEN 'critical' ELSE 'high' END,
          'Customer status changed from ' || v_old_status || ' to ' || (v_score->>'status')
        );
      END IF;
    END IF;
    
    IF (v_score->>'volume_change_percent')::numeric < -30 THEN
      INSERT INTO customer_health_alerts (customer_id, alert_type, severity, message)
      SELECT v_customer.customer_id, 'volume_drop',
        CASE WHEN (v_score->>'volume_change_percent')::numeric < -50 THEN 'high' ELSE 'medium' END,
        'Volume dropped ' || ABS((v_score->>'volume_change_percent')::numeric)::integer || '% vs prior period'
      WHERE NOT EXISTS (
        SELECT 1 FROM customer_health_alerts 
        WHERE customer_id = v_customer.customer_id 
        AND alert_type = 'volume_drop'
        AND created_at > now() - interval '7 days'
        AND NOT is_dismissed
      );
    END IF;
    
    IF (v_score->>'days_since_last_shipment')::integer > 14 THEN
      INSERT INTO customer_health_alerts (customer_id, alert_type, severity, message)
      SELECT v_customer.customer_id, 'inactivity',
        CASE 
          WHEN (v_score->>'days_since_last_shipment')::integer > 30 THEN 'critical'
          WHEN (v_score->>'days_since_last_shipment')::integer > 21 THEN 'high'
          ELSE 'medium'
        END,
        'No shipments in ' || (v_score->>'days_since_last_shipment')::integer || ' days'
      WHERE NOT EXISTS (
        SELECT 1 FROM customer_health_alerts 
        WHERE customer_id = v_customer.customer_id 
        AND alert_type = 'inactivity'
        AND created_at > now() - interval '7 days'
        AND NOT is_dismissed
      );
    END IF;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_customer_health_score(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_health_scores() TO authenticated;