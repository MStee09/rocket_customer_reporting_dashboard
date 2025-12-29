# PHASE 3: Database Migrations for Learning System

Create these database migrations to support customer knowledge accumulation and admin analytics.

## Migration 1: Add preferences column

Create file: `supabase/migrations/[timestamp]_add_customer_preferences.sql`

```sql
-- Add preferences column to customer_intelligence_profiles
ALTER TABLE customer_intelligence_profiles
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN customer_intelligence_profiles.preferences IS 
'Learned preferences: { "chartTypes": {"pie": 0.7}, "focusAreas": {"cost": 0.8} }';

-- Function to increment knowledge usage
CREATE OR REPLACE FUNCTION increment_knowledge_usage(
  p_key TEXT,
  p_customer_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_knowledge
  SET 
    times_used = times_used + 1,
    last_used_at = NOW(),
    confidence = LEAST(1.0, confidence + 0.01)
  WHERE key = p_key
    AND customer_id = p_customer_id
    AND scope = 'customer';
END;
$$;

GRANT EXECUTE ON FUNCTION increment_knowledge_usage(TEXT, TEXT) TO authenticated;
```

## Migration 2: Schema change tracking

Create file: `supabase/migrations/[timestamp]_schema_change_tracking.sql`

```sql
-- Track schema changes for auto-discovery
CREATE TABLE IF NOT EXISTS schema_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL,
  view_name TEXT NOT NULL DEFAULT 'shipment_report_view',
  column_name TEXT,
  old_value TEXT,
  new_value TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  is_acknowledged BOOLEAN DEFAULT false
);

CREATE INDEX idx_schema_changes_unack ON schema_change_log(is_acknowledged, detected_at DESC) WHERE is_acknowledged = false;

ALTER TABLE schema_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view schema changes" ON schema_change_log FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "Admins can manage schema changes" ON schema_change_log FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND user_role = 'admin'));

-- Function to detect schema changes
CREATE OR REPLACE FUNCTION detect_schema_changes()
RETURNS TABLE (change_type TEXT, column_name TEXT, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- New columns
  RETURN QUERY
  SELECT 'new_column'::TEXT, c.column_name::TEXT, 'New column in shipment_report_view'::TEXT
  FROM information_schema.columns c
  WHERE c.table_name = 'shipment_report_view' AND c.table_schema = 'public'
    AND c.column_name NOT IN (SELECT sc.column_name FROM schema_columns sc WHERE sc.view_name = 'shipment_report_view');
  
  -- Removed columns
  RETURN QUERY
  SELECT 'removed_column'::TEXT, sc.column_name::TEXT, 'Column removed from shipment_report_view'::TEXT
  FROM schema_columns sc
  WHERE sc.view_name = 'shipment_report_view'
    AND sc.column_name NOT IN (SELECT c.column_name FROM information_schema.columns c WHERE c.table_name = 'shipment_report_view' AND c.table_schema = 'public');
END;
$$;

GRANT EXECUTE ON FUNCTION detect_schema_changes() TO authenticated;
```

## Migration 3: AI metrics

Create file: `supabase/migrations/[timestamp]_ai_metrics.sql`

```sql
-- AI performance metrics
CREATE TABLE IF NOT EXISTS ai_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id TEXT,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 1,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_metrics_date ON ai_metrics(metric_date DESC);
CREATE INDEX idx_ai_metrics_type ON ai_metrics(metric_type, metric_date DESC);
CREATE INDEX idx_ai_metrics_customer ON ai_metrics(customer_id, metric_date DESC);

ALTER TABLE ai_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view metrics" ON ai_metrics FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "Service can insert metrics" ON ai_metrics FOR INSERT TO authenticated WITH CHECK (true);

-- Admin dashboard stats function
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
```

## Run Migrations

After creating these files, run:

```bash
supabase db push
```

Or apply individually:

```bash
supabase migration up
```

---

# END OF PHASE 3

After running these migrations:
- `customer_intelligence_profiles` has `preferences` column for learning
- `schema_change_log` table tracks when database schema changes
- `ai_metrics` table stores performance data
- `get_ai_admin_stats()` function provides dashboard data
- `detect_schema_changes()` finds new/removed columns
- `increment_knowledge_usage()` tracks term usage

The AI service will automatically:
- Learn terminology from conversations
- Track preferences (chart types, focus areas)
- Flag corrections for admin review
- Log all interactions for auditing
