/*
  # Fix Function Search Path Security - Complete

  1. Security Improvements
    - Set explicit search_path on all security-sensitive functions
    - Prevents search_path manipulation attacks
    
  2. Changes
    - Uses ALTER FUNCTION to set search_path = public, pg_temp
    - Applies to all functions identified in security audit
    
  3. Notes
    - This is a security fix, not a functional change
    - Functions will only search in public schema and temp objects
*/

-- Core security functions
ALTER FUNCTION is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION get_shipment_cost(numeric) SET search_path = public, pg_temp;
ALTER FUNCTION get_cost_without_tax(numeric) SET search_path = public, pg_temp;
ALTER FUNCTION get_carrier_pay(numeric) SET search_path = public, pg_temp;
ALTER FUNCTION generate_share_token() SET search_path = public, pg_temp;

-- Query execution functions
ALTER FUNCTION execute_custom_query(text) SET search_path = public, pg_temp;
ALTER FUNCTION execute_raw_query(text) SET search_path = public, pg_temp;
ALTER FUNCTION execute_query(text) SET search_path = public, pg_temp;

-- Schema and diagnostic functions
ALTER FUNCTION check_term_conflicts(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION refresh_schema_metadata() SET search_path = public, pg_temp;
ALTER FUNCTION custom_access_token_hook(jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION get_diagnostic_info() SET search_path = public, pg_temp;
ALTER FUNCTION get_table_schemas(text[]) SET search_path = public, pg_temp;
ALTER FUNCTION call_scheduled_reports() SET search_path = public, pg_temp;

-- AI Knowledge functions
ALTER FUNCTION record_knowledge_usage(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION record_knowledge_correction(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION add_learned_knowledge(text, text, text, text, text, text, numeric, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION approve_knowledge(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION reject_knowledge(uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION get_customer_knowledge(text, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION search_knowledge(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION update_kb_document_timestamp() SET search_path = public, pg_temp;