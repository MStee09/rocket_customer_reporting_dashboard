/*
  # Add Schema Query Function

  1. Functions
    - `get_table_schemas` - Returns column information for specified tables
      - Accepts array of table names
      - Returns column metadata including name, data type, nullability, defaults
      - Used for schema exploration in the UI

  2. Purpose
    - Enable efficient schema discovery for data explorer features
    - Avoid direct queries to information_schema from client
    - Provide consistent schema metadata across the application
*/

CREATE OR REPLACE FUNCTION get_table_schemas(table_names text[])
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  ordinal_position integer
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text,
    c.ordinal_position::integer
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = ANY(table_names)
  ORDER BY c.table_name, c.ordinal_position;
END;
$$ LANGUAGE plpgsql;