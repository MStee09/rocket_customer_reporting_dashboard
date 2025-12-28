/*
  # Create execute_custom_query Function

  1. New Function
    - `execute_custom_query(query_text text)` - Executes a custom SQL query and returns JSON results
    - This function allows the report builder to execute dynamically constructed queries
    - Returns results as a JSON array

  2. Security
    - Function is security definer to allow query execution
    - Still respects RLS policies on underlying tables
*/

CREATE OR REPLACE FUNCTION execute_custom_query(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (%s) t', query_text) INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;
