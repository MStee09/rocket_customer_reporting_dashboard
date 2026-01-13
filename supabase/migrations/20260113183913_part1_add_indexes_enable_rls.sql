/*
  # Security Fix Part 1: Indexes and RLS Enable

  1. Add Missing Foreign Key Indexes
    - Improves query performance for foreign key joins
    
  2. Drop Duplicate Indexes
    - Removes redundant indexes
    
  3. Enable RLS on Public Tables
    - Secures tables that were missing RLS
*/

-- =====================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ai_corrections_created_by ON ai_corrections(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_settings_updated_by ON ai_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_ai_settings_history_changed_by ON ai_settings_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_alert_widget_mapping_customer_id ON alert_widget_mapping(customer_id);
CREATE INDEX IF NOT EXISTS idx_analytics_hub_sections_customer_id ON analytics_hub_sections(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_ai_settings_updated_by ON customer_ai_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_customer_health_alerts_acknowledged_by ON customer_health_alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_acknowledged_by ON detected_anomalies(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_hub_sections_customer_id ON hub_sections(customer_id);
CREATE INDEX IF NOT EXISTS idx_schema_change_log_reviewed_by ON schema_change_log(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_acknowledged_by ON widget_alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_dashboard_widget_id ON widget_alerts(dashboard_widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_instances_created_by ON widget_instances(created_by);

-- =====================================================
-- DROP DUPLICATE INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_ai_feedback_created;
DROP INDEX IF EXISTS idx_ai_feedback_customer;
DROP INDEX IF EXISTS idx_insight_log_date;
DROP INDEX IF EXISTS idx_insight_log_customer;

-- =====================================================
-- ENABLE RLS ON PUBLIC TABLES
-- =====================================================

ALTER TABLE anomaly_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_schema_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_searchable_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_table_joins ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_table_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_field_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_restricted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_insights ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for system tables (service/admin access)
CREATE POLICY "Admins manage anomaly definitions" ON anomaly_definitions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin')
);

CREATE POLICY "Authenticated access mcp_schema_cache" ON mcp_schema_cache FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated access mcp_searchable_fields" ON mcp_searchable_fields FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated access mcp_table_joins" ON mcp_table_joins FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated access ai_rate_limits" ON ai_rate_limits FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated access mcp_table_relationships" ON mcp_table_relationships FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated access mcp_field_aliases" ON mcp_field_aliases FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated access mcp_restricted_fields" ON mcp_restricted_fields FOR ALL TO authenticated USING (true);

CREATE POLICY "Admins manage external factors" ON external_factors FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin')
);

CREATE POLICY "Admins manage customer events" ON customer_events FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin')
);

CREATE POLICY "Admins manage saved insights" ON saved_insights FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin')
);