/*
  # Fix Function Search Paths (Corrected)

  This migration sets explicit search paths for all functions to prevent
  search_path manipulation attacks. Functions with mutable search paths
  can be exploited by users who can modify the search_path.

  ## Changes:
  - Set search_path = public, pg_catalog for all affected functions
  - This prevents search_path hijacking attacks
  - Ensures functions always use the correct schema

  ## Functions being fixed:
  - 23+ functions with mutable search paths (including overloads)
*/

-- Set search_path for all affected functions with correct signatures
ALTER FUNCTION public.mcp_on_schema_change() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_widget_instance_timestamp() SET search_path = public, pg_catalog;
ALTER FUNCTION public.calculate_confidence_level(integer, numeric, numeric) SET search_path = public, pg_catalog;
ALTER FUNCTION public.increment_widget_version() SET search_path = public, pg_catalog;
ALTER FUNCTION public.migrate_logic_blocks_format() SET search_path = public, pg_catalog;
ALTER FUNCTION public.refresh_customer_intelligence() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_customer_intelligence(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog;

-- ai_summary
ALTER FUNCTION public.ai_summary(text, integer) SET search_path = public, pg_catalog;

-- analyze_trend
ALTER FUNCTION public.analyze_trend(uuid, text, text, text, date, date, text) SET search_path = public, pg_catalog;

-- detect_anomalies (multiple overloads)
ALTER FUNCTION public.detect_anomalies(uuid, date, date, double precision, integer, text, text) SET search_path = public, pg_catalog;

ALTER FUNCTION public.detect_anomalies_v2(integer, text, text, text, integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.detect_anomalies_v2(integer, text, text, text, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.detect_anomalies_v2(integer, text, text, double precision, text) SET search_path = public, pg_catalog;

-- explore_field_v2
ALTER FUNCTION public.explore_field_v2(integer, text, integer, boolean) SET search_path = public, pg_catalog;

-- get_change_drivers
ALTER FUNCTION public.get_change_drivers(uuid, text, date, date, date, date, text) SET search_path = public, pg_catalog;

-- get_date_range_bounds
ALTER FUNCTION public.get_date_range_bounds(text) SET search_path = public, pg_catalog;

-- get_entity_summary
ALTER FUNCTION public.get_entity_summary(uuid, text, text, date, date) SET search_path = public, pg_catalog;

-- get_entity_trend
ALTER FUNCTION public.get_entity_trend(uuid, text, text, text, date, date) SET search_path = public, pg_catalog;

-- get_external_factors
ALTER FUNCTION public.get_external_factors(date, date, text[], text[], text[]) SET search_path = public, pg_catalog;

-- get_metrics_snapshot
ALTER FUNCTION public.get_metrics_snapshot(uuid, date, date) SET search_path = public, pg_catalog;

-- preview_aggregation_v2
ALTER FUNCTION public.preview_aggregation_v2(integer, text, text, text, text, jsonb, integer, text) SET search_path = public, pg_catalog;

-- query_by_dimension
ALTER FUNCTION public.query_by_dimension(uuid, text, date, date, jsonb, integer) SET search_path = public, pg_catalog;

-- search_previous_analyses
ALTER FUNCTION public.search_previous_analyses(uuid, text, text[], integer, integer) SET search_path = public, pg_catalog;