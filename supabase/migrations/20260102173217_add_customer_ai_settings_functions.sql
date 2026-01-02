/*
  # Add Customer AI Settings Functions

  1. New Functions
    - `is_ai_enabled_for_customer(p_customer_id)` - Checks if AI is enabled for a customer
    - `get_customer_daily_cap(p_customer_id)` - Gets customer-specific daily budget cap

  2. Notes
    - Uses existing customer_ai_settings table
    - Default ai_enabled is true if no record exists
    - Default daily cap is $5.00 if no record exists
*/

CREATE OR REPLACE FUNCTION is_ai_enabled_for_customer(p_customer_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT ai_enabled INTO v_enabled
  FROM customer_ai_settings
  WHERE customer_id = p_customer_id;
  
  IF v_enabled IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_enabled;
END;
$$;

CREATE OR REPLACE FUNCTION get_customer_daily_cap(p_customer_id integer)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap numeric(10,2);
BEGIN
  SELECT daily_cost_cap INTO v_cap
  FROM customer_ai_settings
  WHERE customer_id = p_customer_id;
  
  IF v_cap IS NULL THEN
    RETURN 5.00;
  END IF;
  
  RETURN v_cap;
END;
$$;

GRANT EXECUTE ON FUNCTION is_ai_enabled_for_customer(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION is_ai_enabled_for_customer(integer) TO service_role;
GRANT EXECUTE ON FUNCTION get_customer_daily_cap(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_daily_cap(integer) TO service_role;
