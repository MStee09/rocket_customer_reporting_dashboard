/*
  # Fix Health Score Date Calculation
  
  1. Problem
    - Health score function only used delivery_date to calculate days since last shipment
    - Many shipments have NULL delivery_date but valid pickup_date
    - This caused all customers to show "999 days" since last activity
  
  2. Solution
    - Use COALESCE to fallback to pickup_date when delivery_date is NULL
    - Updates both the individual calculation and aggregation queries
  
  3. Changes
    - Modified calculate_customer_health_score function
    - Now uses: COALESCE(delivery_date, pickup_date) for date calculations
*/

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
  -- Get current period metrics (last 30 days) using delivery_date or pickup_date
  SELECT COUNT(*), COALESCE(SUM(retail), 0)
  INTO v_shipments_current, v_revenue_current
  FROM shipment
  WHERE customer_id = p_customer_id
    AND COALESCE(delivery_date, pickup_date)::date >= CURRENT_DATE - 30
    AND COALESCE(delivery_date, pickup_date)::date <= CURRENT_DATE;
  
  -- Get previous period metrics (31-60 days ago)
  SELECT COUNT(*), COALESCE(SUM(retail), 0)
  INTO v_shipments_previous, v_revenue_previous
  FROM shipment
  WHERE customer_id = p_customer_id
    AND COALESCE(delivery_date, pickup_date)::date >= CURRENT_DATE - 60
    AND COALESCE(delivery_date, pickup_date)::date < CURRENT_DATE - 30;
  
  -- Get most recent shipment date (use delivery_date if available, otherwise pickup_date)
  SELECT MAX(COALESCE(delivery_date, pickup_date)::date) INTO v_last_shipment_date
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
