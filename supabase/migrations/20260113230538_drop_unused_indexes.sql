/*
  # Drop Unused Indexes

  This migration removes indexes that have not been used according to database statistics.
  Dropping unused indexes improves write performance by reducing index maintenance overhead.

  ## Indexes being dropped:
  - 127 unused indexes across various tables
  - These indexes consume storage and slow down INSERT/UPDATE/DELETE operations
  - They can be recreated if needed in the future

  ## Note:
  - Index usage statistics reset on database restart
  - If any of these indexes become needed, they can be recreated
*/

-- widget_version_history
DROP INDEX IF EXISTS idx_widget_version_history_widget_id;
DROP INDEX IF EXISTS idx_widget_version_history_version;

-- dashboard_widgets
DROP INDEX IF EXISTS idx_dashboard_widgets_customer_id;

-- knowledge_embeddings
DROP INDEX IF EXISTS knowledge_embeddings_hnsw_idx;
DROP INDEX IF EXISTS knowledge_embeddings_customer_idx;
DROP INDEX IF EXISTS knowledge_embeddings_document_idx;

-- mcp_schema_cache
DROP INDEX IF EXISTS idx_mcp_schema_cache_searchable;

-- ai_settings
DROP INDEX IF EXISTS idx_ai_settings_key;
DROP INDEX IF EXISTS idx_ai_settings_updated_by;

-- client
DROP INDEX IF EXISTS idx_client_name;
DROP INDEX IF EXISTS idx_client_active;

-- carrier
DROP INDEX IF EXISTS idx_carrier_status;
DROP INDEX IF EXISTS idx_carrier_scac;
DROP INDEX IF EXISTS idx_carrier_dot_number;

-- shipment
DROP INDEX IF EXISTS idx_shipment_status_id;
DROP INDEX IF EXISTS idx_shipment_mode_id;
DROP INDEX IF EXISTS idx_shipment_equipment_type_id;

-- detected_anomalies
DROP INDEX IF EXISTS idx_anomalies_customer;
DROP INDEX IF EXISTS idx_anomalies_status;
DROP INDEX IF EXISTS idx_anomalies_date;
DROP INDEX IF EXISTS idx_anomalies_severity;
DROP INDEX IF EXISTS idx_detected_anomalies_acknowledged_by;

-- shipment_detail
DROP INDEX IF EXISTS idx_shipment_detail_quoted_date;
DROP INDEX IF EXISTS idx_shipment_detail_booked_date;
DROP INDEX IF EXISTS idx_shipment_detail_delivered_date;

-- shipment_note
DROP INDEX IF EXISTS idx_shipment_note_created_date;

-- shipment_carrier
DROP INDEX IF EXISTS idx_shipment_carrier_assignment_status;
DROP INDEX IF EXISTS idx_shipment_carrier_pro_number;

-- ai_knowledge_documents
DROP INDEX IF EXISTS idx_kb_active;
DROP INDEX IF EXISTS idx_kb_category;
DROP INDEX IF EXISTS idx_kb_priority;

-- field_business_context
DROP INDEX IF EXISTS idx_field_context_visible;

-- shipment_accessorial
DROP INDEX IF EXISTS idx_shipment_accessorial_type;

-- schema_change_log
DROP INDEX IF EXISTS idx_schema_changes_unack;
DROP INDEX IF EXISTS idx_schema_change_log_reviewed_by;

-- glossary_global
DROP INDEX IF EXISTS idx_glossary_global_term;
DROP INDEX IF EXISTS idx_glossary_global_category;
DROP INDEX IF EXISTS idx_glossary_global_active;

-- glossary_customer
DROP INDEX IF EXISTS idx_glossary_customer_term;

-- glossary_learning_queue
DROP INDEX IF EXISTS idx_learning_queue_customer;
DROP INDEX IF EXISTS idx_learning_queue_term;

-- glossary_audit_log
DROP INDEX IF EXISTS idx_audit_log_glossary;
DROP INDEX IF EXISTS idx_audit_log_created;

-- scheduled_reports
DROP INDEX IF EXISTS idx_scheduled_reports_created_by_user_id;
DROP INDEX IF EXISTS idx_scheduled_reports_next_run;

-- ai_learning_feedback
DROP INDEX IF EXISTS idx_learning_feedback_customer;
DROP INDEX IF EXISTS idx_learning_feedback_type;

-- ai_knowledge
DROP INDEX IF EXISTS idx_ai_knowledge_active;
DROP INDEX IF EXISTS idx_ai_knowledge_key;
DROP INDEX IF EXISTS idx_ai_knowledge_pending;

-- ai_insight_log
DROP INDEX IF EXISTS idx_ai_insight_log_customer_id;
DROP INDEX IF EXISTS idx_ai_insight_log_created_at;
DROP INDEX IF EXISTS idx_ai_insight_log_model;

-- scheduled_report_runs
DROP INDEX IF EXISTS idx_scheduled_report_runs_status;

-- conversation_summaries
DROP INDEX IF EXISTS idx_conv_summaries_customer;
DROP INDEX IF EXISTS idx_conv_summaries_date;
DROP INDEX IF EXISTS idx_conversation_summaries_user_id;

-- shared_reports
DROP INDEX IF EXISTS idx_shared_reports_report_id;
DROP INDEX IF EXISTS idx_shared_reports_customer_id;
DROP INDEX IF EXISTS idx_shared_reports_token;

-- customer_intelligence_history
DROP INDEX IF EXISTS idx_intel_history_timestamp;
DROP INDEX IF EXISTS idx_intel_history_profile;
DROP INDEX IF EXISTS idx_intel_history_user;

-- users_customers
DROP INDEX IF EXISTS idx_users_customers_created_by;

-- ai_report_audit
DROP INDEX IF EXISTS idx_ai_report_audit_reviewed_by;

-- notifications
DROP INDEX IF EXISTS idx_notifications_scheduled_report_id;
DROP INDEX IF EXISTS idx_notifications_scheduled_run_id;
DROP INDEX IF EXISTS idx_notifications_priority;

-- customer_intelligence_profiles
DROP INDEX IF EXISTS idx_intel_profiles_created_by;
DROP INDEX IF EXISTS idx_intel_profiles_updated_by;

-- ai_learning_notifications
DROP INDEX IF EXISTS idx_learning_notifications_customer;
DROP INDEX IF EXISTS idx_learning_notifications_resolved_by;

-- widget_alerts
DROP INDEX IF EXISTS idx_widget_alerts_customer_key;
DROP INDEX IF EXISTS idx_widget_alerts_customer_status;
DROP INDEX IF EXISTS idx_widget_alerts_widget_key;
DROP INDEX IF EXISTS idx_widget_alerts_customer_id;
DROP INDEX IF EXISTS idx_widget_alerts_severity;
DROP INDEX IF EXISTS idx_widget_alerts_acknowledged_by;
DROP INDEX IF EXISTS idx_widget_alerts_dashboard_widget_id;

-- alert_widget_mapping
DROP INDEX IF EXISTS idx_alert_widget_mapping_type;
DROP INDEX IF EXISTS idx_alert_widget_mapping_customer_id;

-- customer_health_history
DROP INDEX IF EXISTS idx_customer_health_history_customer_id;
DROP INDEX IF EXISTS idx_customer_health_history_recorded_at;

-- customer_health_alerts
DROP INDEX IF EXISTS idx_customer_health_alerts_severity;
DROP INDEX IF EXISTS idx_customer_health_alerts_is_acknowledged;
DROP INDEX IF EXISTS idx_customer_health_alerts_acknowledged_by;

-- ai_usage_events
DROP INDEX IF EXISTS idx_usage_events_customer;
DROP INDEX IF EXISTS idx_usage_events_time;

-- ai_learning_corrections
DROP INDEX IF EXISTS idx_corrections_customer;
DROP INDEX IF EXISTS idx_corrections_unprocessed;

-- analytics_hub_widgets
DROP INDEX IF EXISTS idx_analytics_hub_widgets_customer;
DROP INDEX IF EXISTS idx_analytics_hub_widgets_section;

-- ai_usage_log
DROP INDEX IF EXISTS idx_ai_usage_log_type;

-- ai_rate_limits
DROP INDEX IF EXISTS ai_rate_limits_customer_idx;
DROP INDEX IF EXISTS ai_rate_limits_timestamp_idx;

-- customer_ai_settings
DROP INDEX IF EXISTS idx_customer_ai_settings_enabled;
DROP INDEX IF EXISTS idx_customer_ai_settings_updated_by;

-- mcp_table_relationships
DROP INDEX IF EXISTS idx_mcp_relationships_from;
DROP INDEX IF EXISTS idx_mcp_relationships_to;

-- mcp_field_aliases
DROP INDEX IF EXISTS idx_mcp_aliases_alias;

-- pinned_reports
DROP INDEX IF EXISTS idx_pinned_reports_customer;
DROP INDEX IF EXISTS idx_pinned_reports_report;

-- external_factors
DROP INDEX IF EXISTS idx_external_factors_date;
DROP INDEX IF EXISTS idx_external_factors_type;

-- customer_events
DROP INDEX IF EXISTS idx_customer_events_customer;

-- saved_insights
DROP INDEX IF EXISTS idx_saved_insights_customer;

-- ai_feedback
DROP INDEX IF EXISTS idx_ai_feedback_customer_id;
DROP INDEX IF EXISTS idx_ai_feedback_user_id;
DROP INDEX IF EXISTS idx_ai_feedback_created_at;
DROP INDEX IF EXISTS idx_ai_feedback_rating;

-- reports
DROP INDEX IF EXISTS idx_reports_owner;
DROP INDEX IF EXISTS idx_reports_source_widget;
DROP INDEX IF EXISTS idx_reports_customer_visibility;
DROP INDEX IF EXISTS idx_reports_visibility;

-- ai_settings_history
DROP INDEX IF EXISTS idx_ai_settings_history_key;
DROP INDEX IF EXISTS idx_ai_settings_history_changed_at;
DROP INDEX IF EXISTS idx_ai_settings_history_changed_by;

-- ai_corrections
DROP INDEX IF EXISTS idx_ai_corrections_active;
DROP INDEX IF EXISTS idx_ai_corrections_created_by;

-- widget_instances
DROP INDEX IF EXISTS idx_widget_instances_scope;
DROP INDEX IF EXISTS idx_widget_instances_customer;
DROP INDEX IF EXISTS idx_widget_instances_placement;
DROP INDEX IF EXISTS idx_widget_instances_active;
DROP INDEX IF EXISTS idx_widget_instances_created_by;

-- analytics_hub_sections
DROP INDEX IF EXISTS idx_analytics_hub_sections_customer_id;

-- hub_sections
DROP INDEX IF EXISTS idx_hub_sections_customer_id;