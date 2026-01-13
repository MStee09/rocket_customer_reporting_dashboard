/*
  # Drop Unused Indexes

  1. Performance Optimization
    - Remove 37 unused indexes that have not been used by any queries
    - Reduces index maintenance overhead during INSERT/UPDATE operations
    - Frees up storage space
    - Improves write performance
    
  2. Notes
    - These indexes were created anticipatorily but are not being used by actual queries
    - Can be recreated later if query patterns change and these indexes become useful
    - Primary key and foreign key indexes that ARE being used are not affected
*/

-- AI-related tables
DROP INDEX IF EXISTS idx_ai_corrections_created_by;
DROP INDEX IF EXISTS idx_ai_feedback_customer_id;
DROP INDEX IF EXISTS idx_ai_feedback_user_id;
DROP INDEX IF EXISTS idx_ai_learning_notifications_resolved_by;
DROP INDEX IF EXISTS idx_ai_rate_limits_customer_id;
DROP INDEX IF EXISTS idx_ai_report_audit_reviewed_by;
DROP INDEX IF EXISTS idx_ai_settings_updated_by;
DROP INDEX IF EXISTS idx_ai_settings_history_changed_by;

-- Alert and widget tables
DROP INDEX IF EXISTS idx_alert_widget_mapping_customer_id;
DROP INDEX IF EXISTS idx_widget_alerts_acknowledged_by;
DROP INDEX IF EXISTS idx_widget_alerts_customer_id;
DROP INDEX IF EXISTS idx_widget_alerts_dashboard_widget_id;
DROP INDEX IF EXISTS idx_widget_instances_created_by;
DROP INDEX IF EXISTS idx_widget_instances_customer_id;

-- Analytics hub tables
DROP INDEX IF EXISTS idx_analytics_hub_sections_customer_id;
DROP INDEX IF EXISTS idx_analytics_hub_widgets_customer_id;
DROP INDEX IF EXISTS idx_hub_sections_customer_id;

-- Customer intelligence tables
DROP INDEX IF EXISTS idx_conversation_summaries_user_id;
DROP INDEX IF EXISTS idx_customer_ai_settings_updated_by;
DROP INDEX IF EXISTS idx_customer_health_alerts_acknowledged_by;
DROP INDEX IF EXISTS idx_customer_health_history_customer_id;
DROP INDEX IF EXISTS idx_customer_intelligence_history_profile_id;
DROP INDEX IF EXISTS idx_customer_intelligence_history_user_id;
DROP INDEX IF EXISTS idx_customer_intelligence_profiles_created_by;
DROP INDEX IF EXISTS idx_customer_intelligence_profiles_updated_by;

-- Anomaly detection
DROP INDEX IF EXISTS idx_detected_anomalies_acknowledged_by;

-- Notifications and reports
DROP INDEX IF EXISTS idx_notifications_scheduled_report_id;
DROP INDEX IF EXISTS idx_notifications_scheduled_run_id;
DROP INDEX IF EXISTS idx_pinned_reports_customer_id;
DROP INDEX IF EXISTS idx_reports_owner_id;
DROP INDEX IF EXISTS idx_scheduled_reports_created_by_user_id;

-- Schema management
DROP INDEX IF EXISTS idx_schema_change_log_reviewed_by;

-- Shipment lookup tables
DROP INDEX IF EXISTS idx_shipment_equipment_type_id;
DROP INDEX IF EXISTS idx_shipment_mode_id;
DROP INDEX IF EXISTS idx_shipment_status_id;

-- User management
DROP INDEX IF EXISTS idx_users_customers_created_by;
