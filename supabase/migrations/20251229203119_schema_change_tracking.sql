/*
  # Schema Change Tracking System

  1. New Tables
    - `schema_change_log` - Tracks changes to database schema
      - `id` (uuid, primary key)
      - `change_type` (text) - Type of change (new_column, removed_column, etc.)
      - `view_name` (text) - Which view changed
      - `column_name` (text) - Affected column
      - `old_value`, `new_value` (text) - What changed
      - `detected_at` (timestamptz) - When detected
      - `reviewed_by`, `reviewed_at` - Admin review tracking
      - `is_acknowledged` (boolean) - Whether admin has acknowledged

  2. Security
    - RLS enabled
    - Only admins can view and manage schema changes

  3. New Functions
    - `detect_schema_changes()` - Finds new/removed columns
*/

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

CREATE INDEX IF NOT EXISTS idx_schema_changes_unack ON schema_change_log(is_acknowledged, detected_at DESC) WHERE is_acknowledged = false;

ALTER TABLE schema_change_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'schema_change_log' AND policyname = 'Admins can view schema changes'
  ) THEN
    CREATE POLICY "Admins can view schema changes" ON schema_change_log FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND user_role = 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'schema_change_log' AND policyname = 'Admins can manage schema changes'
  ) THEN
    CREATE POLICY "Admins can manage schema changes" ON schema_change_log FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND user_role = 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION detect_schema_changes()
RETURNS TABLE (change_type TEXT, column_name TEXT, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 'new_column'::TEXT, c.column_name::TEXT, 'New column in shipment_report_view'::TEXT
  FROM information_schema.columns c
  WHERE c.table_name = 'shipment_report_view' AND c.table_schema = 'public'
    AND c.column_name NOT IN (SELECT sc.column_name FROM schema_columns sc WHERE sc.view_name = 'shipment_report_view');
  
  RETURN QUERY
  SELECT 'removed_column'::TEXT, sc.column_name::TEXT, 'Column removed from shipment_report_view'::TEXT
  FROM schema_columns sc
  WHERE sc.view_name = 'shipment_report_view'
    AND sc.column_name NOT IN (SELECT c.column_name FROM information_schema.columns c WHERE c.table_name = 'shipment_report_view' AND c.table_schema = 'public');
END;
$$;

GRANT EXECUTE ON FUNCTION detect_schema_changes() TO authenticated;