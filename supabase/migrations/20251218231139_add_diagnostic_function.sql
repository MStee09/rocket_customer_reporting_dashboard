/*
  # Add Diagnostic Function
  
  1. New Functions
    - `get_diagnostic_info` - Returns diagnostic information about users, customers, and shipments
  
  2. Purpose
    - Help diagnose why dashboard shows 0 shipments
*/

CREATE OR REPLACE FUNCTION get_diagnostic_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'current_user_id', auth.uid(),
    'user_role', (SELECT user_role FROM user_roles WHERE user_id = auth.uid()),
    'customers_count', (SELECT COUNT(*) FROM customer),
    'shipments_count', (SELECT COUNT(*) FROM shipment),
    'user_customers_count', (SELECT COUNT(*) FROM users_customers WHERE user_id = auth.uid()),
    'accessible_customers', (
      SELECT jsonb_agg(jsonb_build_object('customer_id', customer_id, 'company_name', company_name))
      FROM customer
      WHERE customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = auth.uid())
    ),
    'all_customers', (
      SELECT jsonb_agg(jsonb_build_object('customer_id', customer_id, 'company_name', company_name))
      FROM customer
      LIMIT 20
    ),
    'shipment_customer_ids', (
      SELECT jsonb_agg(DISTINCT customer_id)
      FROM shipment
      LIMIT 20
    ),
    'shipment_date_range', (
      SELECT jsonb_build_object(
        'min_pickup', MIN(pickup_date),
        'max_pickup', MAX(pickup_date),
        'min_delivery', MIN(delivery_date),
        'max_delivery', MAX(delivery_date)
      )
      FROM shipment
    )
  ) INTO result;
  
  RETURN result;
END;
$$;
