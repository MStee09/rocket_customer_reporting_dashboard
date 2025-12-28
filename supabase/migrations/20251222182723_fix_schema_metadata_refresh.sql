/*
  # Fix Schema Metadata Refresh Function

  Updates the refresh_schema_metadata function to:
  1. Properly identify groupable vs non-groupable fields
  2. Correctly identify aggregatable numeric fields
  3. Handle ID fields as non-aggregatable
*/

CREATE OR REPLACE FUNCTION refresh_schema_metadata()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  numeric_types TEXT[] := ARRAY['numeric', 'integer', 'decimal', 'double precision', 'real', 'bigint', 'smallint'];
  id_suffixes TEXT[] := ARRAY['_id', 'id'];
BEGIN
  DELETE FROM schema_columns WHERE view_name = 'shipment_report_view';
  
  INSERT INTO schema_columns (view_name, column_name, data_type, ordinal_position, is_groupable, is_aggregatable)
  SELECT 
    'shipment_report_view',
    c.column_name,
    c.data_type,
    c.ordinal_position,
    true,
    c.data_type = ANY(numeric_types) AND 
      c.column_name NOT LIKE '%_id' AND 
      c.column_name != 'id' AND
      c.column_name NOT IN ('load_id', 'client_id', 'customer_id', 'status_id', 'mode_id', 'equipment_type_id')
  FROM information_schema.columns c
  WHERE c.table_name = 'shipment_report_view'
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
  
  UPDATE schema_columns 
  SET updated_at = NOW() 
  WHERE view_name = 'shipment_report_view';
END;
$$;

SELECT refresh_schema_metadata();