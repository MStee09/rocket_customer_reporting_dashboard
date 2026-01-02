/*
  # AI Usage Tracking System
  
  Purpose: Track AI API usage by USER (not customer) for visibility and cost analysis.
  
  1. New Tables
    - `ai_usage_log` - Detailed request logging with user, tokens, and costs
    
  2. New Functions
    - `log_ai_usage` - Records each AI request
    - `get_ai_usage_dashboard` - Admin dashboard with costs and user breakdown
    - `get_user_ai_usage` - Individual user's usage history
    - `get_ai_cost_summary` - Total costs by time period
    
  3. Key Design Decisions
    - Tracks by auth.uid() (logged-in user), NOT customer_id
    - If admin is impersonating customer, usage is attributed to ADMIN
    - Stores both customer context AND actual user for full audit trail
    - Claude Sonnet 4 pricing: $3/MTok input, $15/MTok output
*/

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL,
  user_email TEXT,
  
  customer_id INTEGER,
  customer_name TEXT,
  
  request_type TEXT NOT NULL DEFAULT 'report',
  session_id TEXT,
  
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  
  input_cost_usd NUMERIC(10, 6) GENERATED ALWAYS AS (input_tokens * 0.000003) STORED,
  output_cost_usd NUMERIC(10, 6) GENERATED ALWAYS AS (output_tokens * 0.000015) STORED,
  total_cost_usd NUMERIC(10, 6) GENERATED ALWAYS AS ((input_tokens * 0.000003) + (output_tokens * 0.000015)) STORED,
  
  model_used TEXT DEFAULT 'claude-sonnet-4-20250514',
  
  latency_ms INTEGER,
  tool_turns INTEGER DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user ON ai_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_customer ON ai_usage_log(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_type ON ai_usage_log(request_type, created_at DESC);

CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id UUID,
  p_user_email TEXT DEFAULT NULL,
  p_customer_id INTEGER DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_request_type TEXT DEFAULT 'report',
  p_session_id TEXT DEFAULT NULL,
  p_input_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0,
  p_model_used TEXT DEFAULT 'claude-sonnet-4-20250514',
  p_latency_ms INTEGER DEFAULT NULL,
  p_tool_turns INTEGER DEFAULT 0,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO ai_usage_log (
    user_id,
    user_email,
    customer_id,
    customer_name,
    request_type,
    session_id,
    input_tokens,
    output_tokens,
    model_used,
    latency_ms,
    tool_turns,
    status,
    error_message
  ) VALUES (
    p_user_id,
    p_user_email,
    p_customer_id,
    p_customer_name,
    p_request_type,
    p_session_id,
    COALESCE(p_input_tokens, 0),
    COALESCE(p_output_tokens, 0),
    p_model_used,
    p_latency_ms,
    p_tool_turns,
    p_status,
    p_error_message
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

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
          COALESCE(customer_name, 'Unknown') as customer_name,
          COUNT(*) as request_count,
          SUM(total_tokens) as total_tokens,
          SUM(total_cost_usd)::NUMERIC(10,4) as total_cost,
          COUNT(DISTINCT user_id) as unique_users
        FROM ai_usage_log
        WHERE created_at >= v_start_date AND customer_id IS NOT NULL
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

CREATE OR REPLACE FUNCTION get_user_ai_usage(
  p_user_id UUID,
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
      'total_requests', (SELECT COUNT(*) FROM ai_usage_log WHERE user_id = p_user_id AND created_at >= v_start_date),
      'total_tokens', (SELECT COALESCE(SUM(total_tokens), 0) FROM ai_usage_log WHERE user_id = p_user_id AND created_at >= v_start_date),
      'total_cost_usd', (SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,4) FROM ai_usage_log WHERE user_id = p_user_id AND created_at >= v_start_date),
      'avg_tokens_per_request', (SELECT COALESCE(AVG(total_tokens), 0)::INTEGER FROM ai_usage_log WHERE user_id = p_user_id AND status = 'success' AND created_at >= v_start_date)
    ),
    'recent_requests', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::JSONB)
      FROM (
        SELECT 
          id,
          customer_name,
          request_type,
          input_tokens,
          output_tokens,
          total_tokens,
          total_cost_usd::NUMERIC(10,6) as cost,
          latency_ms,
          status,
          created_at
        FROM ai_usage_log
        WHERE user_id = p_user_id AND created_at >= v_start_date
        ORDER BY created_at DESC
        LIMIT 50
      ) t
    ),
    'daily_usage', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.date), '[]'::JSONB)
      FROM (
        SELECT 
          created_at::DATE as date,
          COUNT(*) as requests,
          SUM(total_tokens) as tokens,
          SUM(total_cost_usd)::NUMERIC(10,4) as cost
        FROM ai_usage_log
        WHERE user_id = p_user_id AND created_at >= v_start_date
        GROUP BY created_at::DATE
        ORDER BY date DESC
      ) t
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_ai_cost_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'today', (
      SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,2) 
      FROM ai_usage_log 
      WHERE created_at >= CURRENT_DATE
    ),
    'yesterday', (
      SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,2) 
      FROM ai_usage_log 
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE
    ),
    'this_week', (
      SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,2) 
      FROM ai_usage_log 
      WHERE created_at >= date_trunc('week', CURRENT_DATE)
    ),
    'this_month', (
      SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,2) 
      FROM ai_usage_log 
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    ),
    'last_month', (
      SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,2) 
      FROM ai_usage_log 
      WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        AND created_at < date_trunc('month', CURRENT_DATE)
    ),
    'all_time', (
      SELECT COALESCE(SUM(total_cost_usd), 0)::NUMERIC(10,2) 
      FROM ai_usage_log
    ),
    'requests_today', (
      SELECT COUNT(*) FROM ai_usage_log WHERE created_at >= CURRENT_DATE
    ),
    'requests_this_month', (
      SELECT COUNT(*) FROM ai_usage_log WHERE created_at >= date_trunc('month', CURRENT_DATE)
    )
  );
END;
$$;

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_log' AND policyname = 'Users can view own usage'
  ) THEN
    CREATE POLICY "Users can view own usage"
      ON ai_usage_log FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_log' AND policyname = 'Admins can view all usage'
  ) THEN
    CREATE POLICY "Admins can view all usage"
      ON ai_usage_log FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid() AND user_role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_log' AND policyname = 'Service can insert usage'
  ) THEN
    CREATE POLICY "Service can insert usage"
      ON ai_usage_log FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT ON ai_usage_log TO authenticated;
GRANT EXECUTE ON FUNCTION log_ai_usage(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_usage_dashboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_ai_usage(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_cost_summary() TO authenticated;