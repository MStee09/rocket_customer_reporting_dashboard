/*
  # AI Performance Metrics System

  1. New Tables
    - `ai_metrics` - Stores AI performance data for analytics
      - `id` (uuid, primary key)
      - `metric_date` (date) - Date of metric
      - `customer_id` (text) - Optional customer association
      - `metric_type` (text) - Type of metric being tracked
      - `metric_value` (numeric) - The metric value
      - `details` (jsonb) - Additional context

  2. Security
    - RLS enabled
    - Only admins can view metrics
    - Authenticated users can insert metrics

  3. New Functions
    - `get_ai_admin_stats(p_days)` - Returns AI dashboard statistics
      - Total reports generated
      - Total conversations
      - Success rate percentage
      - Validation errors count
      - Access violations count
      - Learnings captured
      - Top customers by usage
      - Daily usage trend
*/

CREATE TABLE IF NOT EXISTS ai_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id TEXT,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 1,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_date ON ai_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_type ON ai_metrics(metric_type, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_customer ON ai_metrics(customer_id, metric_date DESC);

ALTER TABLE ai_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_metrics' AND policyname = 'Admins can view metrics'
  ) THEN
    CREATE POLICY "Admins can view metrics" ON ai_metrics FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND user_role = 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_metrics' AND policyname = 'Service can insert metrics'
  ) THEN
    CREATE POLICY "Service can insert metrics" ON ai_metrics FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_ai_admin_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_reports BIGINT,
  total_conversations BIGINT,
  success_rate NUMERIC,
  validation_errors BIGINT,
  access_violations BIGINT,
  learnings_captured BIGINT,
  top_customers JSONB,
  daily_usage JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM ai_report_audit WHERE created_at > NOW() - (p_days || ' days')::INTERVAL)::BIGINT,
    (SELECT COUNT(DISTINCT customer_id || created_at::DATE) FROM ai_report_audit WHERE created_at > NOW() - (p_days || ' days')::INTERVAL)::BIGINT,
    (SELECT ROUND(COUNT(*) FILTER (WHERE status = 'ok')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) FROM ai_report_audit WHERE created_at > NOW() - (p_days || ' days')::INTERVAL),
    (SELECT COUNT(*) FROM ai_metrics WHERE metric_type = 'validation_error' AND metric_date > CURRENT_DATE - p_days)::BIGINT,
    (SELECT COUNT(*) FROM ai_report_audit WHERE status = 'flagged' AND created_at > NOW() - (p_days || ' days')::INTERVAL)::BIGINT,
    (SELECT COUNT(*) FROM ai_knowledge WHERE source IN ('learned', 'inferred') AND created_at > NOW() - (p_days || ' days')::INTERVAL)::BIGINT,
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
      SELECT customer_name, COUNT(*) as report_count FROM ai_report_audit 
      WHERE created_at > NOW() - (p_days || ' days')::INTERVAL AND customer_name IS NOT NULL
      GROUP BY customer_name ORDER BY report_count DESC LIMIT 5
    ) t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
      SELECT created_at::DATE as date, COUNT(*) as count FROM ai_report_audit
      WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
      GROUP BY created_at::DATE ORDER BY date DESC LIMIT 30
    ) t);
END;
$$;

GRANT EXECUTE ON FUNCTION get_ai_admin_stats(INTEGER) TO authenticated;