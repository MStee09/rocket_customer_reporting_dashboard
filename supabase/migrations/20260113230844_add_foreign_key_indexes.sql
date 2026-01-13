/*
  # Add Foreign Key Indexes

  This migration adds indexes for all unindexed foreign keys to improve query performance.
  Foreign keys without indexes can cause slow JOIN operations and referential integrity checks.

  ## Indexes being added:
  - 37 foreign key indexes across various tables
  - Each index improves JOIN performance and foreign key constraint validation
*/

-- ai_corrections
CREATE INDEX IF NOT EXISTS idx_ai_corrections_created_by ON public.ai_corrections(created_by);

-- ai_feedback
CREATE INDEX IF NOT EXISTS idx_ai_feedback_customer_id ON public.ai_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON public.ai_feedback(user_id);

-- ai_learning_notifications
CREATE INDEX IF NOT EXISTS idx_ai_learning_notifications_resolved_by ON public.ai_learning_notifications(resolved_by);

-- ai_rate_limits
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_customer_id ON public.ai_rate_limits(customer_id);

-- ai_report_audit
CREATE INDEX IF NOT EXISTS idx_ai_report_audit_reviewed_by ON public.ai_report_audit(reviewed_by);

-- ai_settings
CREATE INDEX IF NOT EXISTS idx_ai_settings_updated_by ON public.ai_settings(updated_by);

-- ai_settings_history
CREATE INDEX IF NOT EXISTS idx_ai_settings_history_changed_by ON public.ai_settings_history(changed_by);

-- alert_widget_mapping
CREATE INDEX IF NOT EXISTS idx_alert_widget_mapping_customer_id ON public.alert_widget_mapping(customer_id);

-- analytics_hub_sections
CREATE INDEX IF NOT EXISTS idx_analytics_hub_sections_customer_id ON public.analytics_hub_sections(customer_id);

-- analytics_hub_widgets
CREATE INDEX IF NOT EXISTS idx_analytics_hub_widgets_customer_id ON public.analytics_hub_widgets(customer_id);

-- conversation_summaries
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id ON public.conversation_summaries(user_id);

-- customer_ai_settings
CREATE INDEX IF NOT EXISTS idx_customer_ai_settings_updated_by ON public.customer_ai_settings(updated_by);

-- customer_health_alerts
CREATE INDEX IF NOT EXISTS idx_customer_health_alerts_acknowledged_by ON public.customer_health_alerts(acknowledged_by);

-- customer_health_history
CREATE INDEX IF NOT EXISTS idx_customer_health_history_customer_id ON public.customer_health_history(customer_id);

-- customer_intelligence_history
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_history_profile_id ON public.customer_intelligence_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_history_user_id ON public.customer_intelligence_history(user_id);

-- customer_intelligence_profiles
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_profiles_created_by ON public.customer_intelligence_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_profiles_updated_by ON public.customer_intelligence_profiles(updated_by);

-- detected_anomalies
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_acknowledged_by ON public.detected_anomalies(acknowledged_by);

-- hub_sections
CREATE INDEX IF NOT EXISTS idx_hub_sections_customer_id ON public.hub_sections(customer_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_report_id ON public.notifications(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_run_id ON public.notifications(scheduled_run_id);

-- pinned_reports
CREATE INDEX IF NOT EXISTS idx_pinned_reports_customer_id ON public.pinned_reports(customer_id);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_owner_id ON public.reports(owner_id);

-- scheduled_reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by_user_id ON public.scheduled_reports(created_by_user_id);

-- schema_change_log
CREATE INDEX IF NOT EXISTS idx_schema_change_log_reviewed_by ON public.schema_change_log(reviewed_by);

-- shipment foreign keys
CREATE INDEX IF NOT EXISTS idx_shipment_equipment_type_id ON public.shipment(equipment_type_id);
CREATE INDEX IF NOT EXISTS idx_shipment_mode_id ON public.shipment(mode_id);
CREATE INDEX IF NOT EXISTS idx_shipment_status_id ON public.shipment(status_id);

-- users_customers
CREATE INDEX IF NOT EXISTS idx_users_customers_created_by ON public.users_customers(created_by);

-- widget_alerts
CREATE INDEX IF NOT EXISTS idx_widget_alerts_acknowledged_by ON public.widget_alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_customer_id ON public.widget_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_dashboard_widget_id ON public.widget_alerts(dashboard_widget_id);

-- widget_instances
CREATE INDEX IF NOT EXISTS idx_widget_instances_created_by ON public.widget_instances(created_by);
CREATE INDEX IF NOT EXISTS idx_widget_instances_customer_id ON public.widget_instances(customer_id);