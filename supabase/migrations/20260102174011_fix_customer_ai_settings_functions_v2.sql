/*
  # Fix Customer AI Settings Functions v2

  1. Changes
    - Drop all existing functions first to allow return type changes
    - Recreate get_all_customer_ai_settings() with proper return type
    - Recreate toggle_customer_ai() function
    - Recreate set_customer_daily_cap() function

  2. Security
    - All functions are SECURITY DEFINER to bypass RLS
    - Only admins should call these from the application layer
*/

-- Drop all existing functions first
DROP FUNCTION IF EXISTS get_all_customer_ai_settings();
DROP FUNCTION IF EXISTS toggle_customer_ai(integer, boolean, uuid);
DROP FUNCTION IF EXISTS set_customer_daily_cap(integer, numeric, uuid);

-- Recreate get_all_customer_ai_settings with updated return type
CREATE OR REPLACE FUNCTION get_all_customer_ai_settings()
RETURNS TABLE (
  customer_id integer,
  customer_name text,
  ai_enabled boolean,
  daily_cost_cap numeric,
  monthly_cost_cap numeric,
  cost_today numeric,
  cost_this_month numeric,
  requests_today bigint,
  last_ai_usage timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    COALESCE(cas.ai_enabled, true) AS ai_enabled,
    COALESCE(cas.daily_cost_cap, 5.00) AS daily_cost_cap,
    COALESCE(cas.monthly_cost_cap, 100.00) AS monthly_cost_cap,
    COALESCE((
      SELECT SUM(aum.cost_usd)
      FROM ai_usage_metrics aum
      WHERE aum.customer_id = c.id
        AND DATE(aum.created_at) = CURRENT_DATE
    ), 0) AS cost_today,
    COALESCE((
      SELECT SUM(aum.cost_usd)
      FROM ai_usage_metrics aum
      WHERE aum.customer_id = c.id
        AND DATE_TRUNC('month', aum.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0) AS cost_this_month,
    COALESCE((
      SELECT COUNT(*)
      FROM ai_usage_metrics aum
      WHERE aum.customer_id = c.id
        AND DATE(aum.created_at) = CURRENT_DATE
    ), 0) AS requests_today,
    (
      SELECT MAX(aum.created_at)
      FROM ai_usage_metrics aum
      WHERE aum.customer_id = c.id
    ) AS last_ai_usage
  FROM customers c
  LEFT JOIN customer_ai_settings cas ON cas.customer_id = c.id
  ORDER BY c.name;
END;
$$;

-- Function to toggle AI on/off for a customer
CREATE OR REPLACE FUNCTION toggle_customer_ai(
  p_customer_id integer,
  p_enabled boolean,
  p_admin_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO customer_ai_settings (customer_id, ai_enabled, updated_at, updated_by)
  VALUES (p_customer_id, p_enabled, NOW(), p_admin_id)
  ON CONFLICT (customer_id)
  DO UPDATE SET 
    ai_enabled = p_enabled,
    updated_at = NOW(),
    updated_by = p_admin_id;
  
  RETURN p_enabled;
END;
$$;

-- Function to set daily cost cap for a customer
CREATE OR REPLACE FUNCTION set_customer_daily_cap(
  p_customer_id integer,
  p_cap numeric,
  p_admin_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO customer_ai_settings (customer_id, daily_cost_cap, updated_at, updated_by)
  VALUES (p_customer_id, p_cap, NOW(), p_admin_id)
  ON CONFLICT (customer_id)
  DO UPDATE SET 
    daily_cost_cap = p_cap,
    updated_at = NOW(),
    updated_by = p_admin_id;
  
  RETURN p_cap;
END;
$$;
