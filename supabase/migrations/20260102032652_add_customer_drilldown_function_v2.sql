/*
  # Add Customer Drill-down Function for AI Usage

  1. New Functions
    - `get_ai_usage_by_customer` - Returns detailed user breakdown for a specific customer
    
  2. Purpose
    - Enables drill-down from customer-level usage to individual user usage
    - Shows which users within a customer are using AI and how much
    
  3. Updates
    - Modifies `get_ai_usage_dashboard` to include null customer_id entries for admin usage
*/

DROP FUNCTION IF EXISTS get_ai_usage_by_customer(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_ai_usage_by_customer(
  p_customer_id INTEGER,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_start_date TIMESTAMPTZ;
BEGIN
  v_start_date := NOW() - (p_days || ' days')::INTERVAL;
  
  SELECT jsonb_build_object(
    'customer_id', p_customer_id,
    'summary', jsonb_build_object(
      'total_requests', (
        SELECT COUNT(*) FROM ai_usage_log 
        WHERE ((p_customer_id IS NULL AND customer_id IS NULL) OR customer_id = p_customer_id)
        AND created_at >= v_start_date
      ),
      'total_tokens', (
        SELECT COALESCE(SUM(total_tokens), 0) FROM ai_usage_log 
        WHERE ((p_customer_id IS NULL AND customer_id IS NULL) OR customer_id = p_customer_id)
        AND created_at >= v_start_date
      ),
      'total_cost_usd', (
        SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,4) FROM ai_usage_log 
        WHERE ((p_customer_id IS NULL AND customer_id IS NULL) OR customer_id = p_customer_id)
        AND created_at >= v_start_date
      ),
      'unique_users', (
        SELECT COUNT(DISTINCT user_id) FROM ai_usage_log 
        WHERE ((p_customer_id IS NULL AND customer_id IS NULL) OR customer_id = p_customer_id)
        AND created_at >= v_start_date
      )
    ),
    'users', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.total_cost DESC), '[]'::JSONB)
      FROM (
        SELECT 
          user_id,
          COALESCE(user_email, 'Unknown') as user_email,
          COUNT(*) as request_count,
          SUM(input_tokens) as input_tokens,
          SUM(output_tokens) as output_tokens,
          SUM(total_tokens) as total_tokens,
          SUM(total_cost_usd)::NUMERIC(10,6) as total_cost,
          AVG(latency_ms)::INTEGER as avg_latency_ms,
          MAX(created_at) as last_request
        FROM ai_usage_log
        WHERE ((p_customer_id IS NULL AND customer_id IS NULL) OR customer_id = p_customer_id)
          AND created_at >= v_start_date
        GROUP BY user_id, user_email
        ORDER BY total_cost DESC
      ) t
    ),
    'daily_trend', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.date DESC), '[]'::JSONB)
      FROM (
        SELECT 
          created_at::DATE as date,
          COUNT(*) as requests,
          SUM(total_cost_usd)::NUMERIC(10,4) as cost,
          COUNT(DISTINCT user_id) as unique_users
        FROM ai_usage_log
        WHERE ((p_customer_id IS NULL AND customer_id IS NULL) OR customer_id = p_customer_id)
          AND created_at >= v_start_date
        GROUP BY created_at::DATE
        ORDER BY date DESC
        LIMIT 30
      ) t
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS get_ai_usage_dashboard(INTEGER);

CREATE OR REPLACE FUNCTION get_ai_usage_dashboard(
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_start_date TIMESTAMPTZ;
BEGIN
  v_start_date := NOW() - (p_days || ' days')::INTERVAL;
  
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_requests', (
        SELECT COUNT(*) FROM ai_usage_log WHERE created_at >= v_start_date
      ),
      'successful_requests', (
        SELECT COUNT(*) FROM ai_usage_log WHERE status = 'success' AND created_at >= v_start_date
      ),
      'failed_requests', (
        SELECT COUNT(*) FROM ai_usage_log WHERE status = 'error' AND created_at >= v_start_date
      ),
      'total_input_tokens', (
        SELECT COALESCE(SUM(input_tokens), 0) FROM ai_usage_log WHERE created_at >= v_start_date
      ),
      'total_output_tokens', (
        SELECT COALESCE(SUM(output_tokens), 0) FROM ai_usage_log WHERE created_at >= v_start_date
      ),
      'total_tokens', (
        SELECT COALESCE(SUM(total_tokens), 0) FROM ai_usage_log WHERE created_at >= v_start_date
      ),
      'total_cost_usd', (
        SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,2) FROM ai_usage_log WHERE created_at >= v_start_date
      ),
      'avg_tokens_per_request', (
        SELECT COALESCE(AVG(total_tokens), 0)::INTEGER FROM ai_usage_log WHERE status = 'success' AND created_at >= v_start_date
      ),
      'avg_cost_per_request', (
        SELECT COALESCE(AVG(total_cost_usd), 0)::NUMERIC(10,4) FROM ai_usage_log WHERE status = 'success' AND created_at >= v_start_date
      ),
      'avg_latency_ms', (
        SELECT COALESCE(AVG(latency_ms), 0)::INTEGER FROM ai_usage_log WHERE status = 'success' AND latency_ms IS NOT NULL AND created_at >= v_start_date
      )
    ),
    
    'costs', jsonb_build_object(
      'input_cost_usd', (
        SELECT COALESCE(SUM(input_cost_usd), 0)::NUMERIC(10,2) FROM ai_usage_log WHERE created_at >= v_start_date
      ),
      'output_cost_usd', (
        SELECT COALESCE(SUM(output_cost_usd), 0)::NUMERIC(10,2) FROM ai_usage_log WHERE created_at >= v_start_date
      ),
      'total_cost_usd', (
        SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,2) FROM ai_usage_log WHERE created_at >= v_start_date
      ),
      'cost_per_1k_tokens', (
        SELECT CASE 
          WHEN COALESCE(SUM(total_tokens), 0) > 0 
          THEN (COALESCE(SUM(total_cost_usd), 0) / COALESCE(SUM(total_tokens), 1) * 1000)::NUMERIC(10,4)
          ELSE 0
        END
        FROM ai_usage_log WHERE created_at >= v_start_date
      )
    ),
    
    'by_user', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.total_cost DESC), '[]'::JSONB)
      FROM (
        SELECT 
          user_id,
          COALESCE(user_email, 'Unknown') as user_email,
          COUNT(*) as request_count,
          SUM(input_tokens) as input_tokens,
          SUM(output_tokens) as output_tokens,
          SUM(total_tokens) as total_tokens,
          SUM(total_cost_usd)::NUMERIC(10,4) as total_cost,
          AVG(total_cost_usd)::NUMERIC(10,6) as avg_cost_per_request,
          MAX(created_at) as last_request
        FROM ai_usage_log
        WHERE created_at >= v_start_date
        GROUP BY user_id, user_email
        ORDER BY total_cost DESC
        LIMIT 25
      ) t
    ),
    
    'by_customer', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.total_cost DESC), '[]'::JSONB)
      FROM (
        SELECT 
          customer_id,
          COALESCE(customer_name, 'Admin / No Customer') as customer_name,
          COUNT(*) as request_count,
          SUM(total_tokens) as total_tokens,
          SUM(total_cost_usd)::NUMERIC(10,4) as total_cost,
          COUNT(DISTINCT user_id) as unique_users
        FROM ai_usage_log
        WHERE created_at >= v_start_date
        GROUP BY customer_id, customer_name
        ORDER BY total_cost DESC
        LIMIT 25
      ) t
    ),
    
    'daily_trend', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.date), '[]'::JSONB)
      FROM (
        SELECT 
          created_at::DATE as date,
          COUNT(*) as requests,
          SUM(total_tokens) as tokens,
          SUM(total_cost_usd)::NUMERIC(10,4) as cost,
          COUNT(DISTINCT user_id) as unique_users
        FROM ai_usage_log
        WHERE created_at >= v_start_date
        GROUP BY created_at::DATE
        ORDER BY date DESC
      ) t
    ),
    
    'by_request_type', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB)
      FROM (
        SELECT 
          request_type,
          COUNT(*) as count,
          SUM(total_tokens) as tokens,
          SUM(total_cost_usd)::NUMERIC(10,4) as cost,
          AVG(latency_ms)::INTEGER as avg_latency
        FROM ai_usage_log
        WHERE created_at >= v_start_date
        GROUP BY request_type
        ORDER BY count DESC
      ) t
    ),
    
    'current_month', jsonb_build_object(
      'requests', (
        SELECT COUNT(*) FROM ai_usage_log WHERE created_at >= date_trunc('month', CURRENT_DATE)
      ),
      'tokens', (
        SELECT COALESCE(SUM(total_tokens), 0) FROM ai_usage_log WHERE created_at >= date_trunc('month', CURRENT_DATE)
      ),
      'cost_usd', (
        SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,2) FROM ai_usage_log WHERE created_at >= date_trunc('month', CURRENT_DATE)
      )
    ),
    
    'previous_month', jsonb_build_object(
      'requests', (
        SELECT COUNT(*) FROM ai_usage_log 
        WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
          AND created_at < date_trunc('month', CURRENT_DATE)
      ),
      'tokens', (
        SELECT COALESCE(SUM(total_tokens), 0) FROM ai_usage_log 
        WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
          AND created_at < date_trunc('month', CURRENT_DATE)
      ),
      'cost_usd', (
        SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,2) FROM ai_usage_log 
        WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
          AND created_at < date_trunc('month', CURRENT_DATE)
      )
    )
    
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ai_usage_by_customer(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_usage_dashboard(INTEGER) TO authenticated;
