/*
  # Create Schema Columns Metadata System

  1. New Tables
    - `schema_columns` - Stores metadata about view columns for AI discovery
      - `id` (uuid, primary key)
      - `view_name` (text) - Name of the view/table
      - `column_name` (text) - Column name
      - `data_type` (text) - PostgreSQL data type
      - `ordinal_position` (integer) - Column order
      - `is_groupable` (boolean) - Whether column can be used in GROUP BY
      - `is_aggregatable` (boolean) - Whether column supports numeric aggregations
      - `updated_at` (timestamptz) - Last update timestamp

  2. Functions
    - `refresh_schema_metadata()` - Refreshes metadata from information_schema

  3. Security
    - Enable RLS on schema_columns
    - Allow authenticated users to read schema metadata
*/

-- Create table to store schema metadata
CREATE TABLE IF NOT EXISTS schema_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  view_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  data_type TEXT NOT NULL,
  ordinal_position INTEGER,
  is_groupable BOOLEAN DEFAULT true,
  is_aggregatable BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(view_name, column_name)
);

-- Enable RLS
ALTER TABLE schema_columns ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read schema metadata
CREATE POLICY "Authenticated users can read schema metadata"
  ON schema_columns
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to refresh schema metadata
CREATE OR REPLACE FUNCTION refresh_schema_metadata()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  numeric_fields TEXT[] := ARRAY['miles', 'weight', 'cost', 'retail', 'margin'];
  non_groupable_fields TEXT[] := ARRAY['id', 'description'];
BEGIN
  -- Clear existing metadata for shipment_report_view
  DELETE FROM schema_columns WHERE view_name = 'shipment_report_view';
  
  -- Insert current columns from the view
  INSERT INTO schema_columns (view_name, column_name, data_type, ordinal_position, is_groupable, is_aggregatable)
  SELECT 
    'shipment_report_view',
    c.column_name,
    c.data_type,
    c.ordinal_position,
    -- Groupable: most text fields, but not description or uuid id
    NOT (c.column_name = ANY(non_groupable_fields)),
    -- Aggregatable: numeric fields
    c.column_name = ANY(numeric_fields) OR c.data_type IN ('numeric', 'integer', 'decimal', 'double precision', 'real', 'bigint')
  FROM information_schema.columns c
  WHERE c.table_name = 'shipment_report_view'
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
  
  -- Update timestamp
  UPDATE schema_columns 
  SET updated_at = NOW() 
  WHERE view_name = 'shipment_report_view';
END;
$$;

-- Run initial population
SELECT refresh_schema_metadata();

-- Grant execute permission to authenticated users (for admin refresh button)
GRANT EXECUTE ON FUNCTION refresh_schema_metadata() TO authenticated;