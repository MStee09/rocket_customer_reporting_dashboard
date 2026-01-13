/*
  # Add Foreign Key Indexes

  1. Performance Optimization
    - Add indexes for all foreign key columns to improve JOIN performance
    - Speeds up referential integrity checks (CASCADE operations)
    - Essential for multi-tenant queries that filter by customer_id
    
  2. Indexes Added (36 total)
    - AI-related tables: 8 indexes
    - Alert and widget tables: 7 indexes  
    - Analytics hub tables: 3 indexes
    - Customer intelligence tables: 7 indexes
    - Anomaly detection: 1 index
    - Notifications and reports: 5 indexes
    - Schema management: 1 index
    - Shipment lookup tables: 3 indexes
    - User management: 1 index
    
  3. Notes
    - Foreign keys without indexes can cause table scans on DELETE/UPDATE CASCADE
    - Especially critical for customer_id columns used in multi-tenant filtering
    - These indexes are necessary for query optimization
*/

-- AI-related tables
CREATE INDEX IF NOT EXISTS idx_ai_corrections_created_by ON public.ai_corrections(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_customer_id ON public.ai_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON public.ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_notifications_resolved_by ON public.ai_learning_notifications(resolved_by);
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_customer_id ON public.ai_rate_limits(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_report_audit_reviewed_by ON public.ai_report_audit(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_ai_settings_updated_by ON public.ai_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_ai_settings_history_changed_by ON public.ai_settings_history(changed_by);

-- Alert and widget tables
CREATE INDEX IF NOT EXISTS idx_alert_widget_mapping_customer_id ON public.alert_widget_mapping(customer_id);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_acknowledged_by ON public.widget_alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_customer_id ON public.widget_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_dashboard_widget_id ON public.widget_alerts(dashboard_widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_instances_created_by ON public.widget_instances(created_by);
CREATE INDEX IF NOT EXISTS idx_widget_instances_customer_id ON public.widget_instances(customer_id);

-- Analytics hub tables
CREATE INDEX IF NOT EXISTS idx_analytics_hub_sections_customer_id ON public.analytics_hub_sections(customer_id);
CREATE INDEX IF NOT EXISTS idx_analytics_hub_widgets_customer_id ON public.analytics_hub_widgets(customer_id);
CREATE INDEX IF NOT EXISTS idx_hub_sections_customer_id ON public.hub_sections(customer_id);

-- Customer intelligence tables
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id ON public.conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_ai_settings_updated_by ON public.customer_ai_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_customer_health_alerts_acknowledged_by ON public.customer_health_alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_customer_health_history_customer_id ON public.customer_health_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_history_profile_id ON public.customer_intelligence_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_history_user_id ON public.customer_intelligence_history(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_profiles_created_by ON public.customer_intelligence_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_profiles_updated_by ON public.customer_intelligence_profiles(updated_by);

-- Anomaly detection
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_acknowledged_by ON public.detected_anomalies(acknowledged_by);

-- Notifications and reports
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_report_id ON public.notifications(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_run_id ON public.notifications(scheduled_run_id);
CREATE INDEX IF NOT EXISTS idx_pinned_reports_customer_id ON public.pinned_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_reports_owner_id ON public.reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by_user_id ON public.scheduled_reports(created_by_user_id);

-- Schema management
CREATE INDEX IF NOT EXISTS idx_schema_change_log_reviewed_by ON public.schema_change_log(reviewed_by);

-- Shipment lookup tables (improve JOIN performance on lookup tables)
CREATE INDEX IF NOT EXISTS idx_shipment_equipment_type_id ON public.shipment(equipment_type_id);
CREATE INDEX IF NOT EXISTS idx_shipment_mode_id ON public.shipment(mode_id);
CREATE INDEX IF NOT EXISTS idx_shipment_status_id ON public.shipment(status_id);

-- User management
CREATE INDEX IF NOT EXISTS idx_users_customers_created_by ON public.users_customers(created_by);
