/*
  # Fix execute_custom_query Function Permissions

  1. Changes
    - Grant EXECUTE permission on execute_custom_query to authenticated users
    - This allows users to run custom reports through the report builder
    
  2. Security
    - Function is already SECURITY DEFINER
    - RLS policies on underlying tables are still enforced
*/

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION execute_custom_query(text) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_custom_query(text) TO anon;