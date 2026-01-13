/*
  # Recreate get_shipment_items_with_dates function

  1. Purpose
    - Joins shipment_item with shipment to get items within a date range
    - Supports filtering by customer_id and search terms
    - Used by widget data service for product-based widgets

  2. Changes
    - Drops existing function and recreates with correct return type
    - Adds reference_number to output
*/

DROP FUNCTION IF EXISTS get_shipment_items_with_dates(integer, date, date, text[], integer);

CREATE OR REPLACE FUNCTION get_shipment_items_with_dates(
  p_customer_id integer,
  p_start_date date,
  p_end_date date,
  p_search_terms text[] DEFAULT ARRAY[]::text[],
  p_limit integer DEFAULT 500
)
RETURNS TABLE (
  load_id text,
  description text,
  quantity numeric,
  weight numeric,
  retail numeric,
  cost numeric,
  pickup_date date,
  delivery_date date,
  reference_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF array_length(p_search_terms, 1) IS NULL OR array_length(p_search_terms, 1) = 0 THEN
    RETURN QUERY
    SELECT 
      si.load_id::text,
      si.description::text,
      si.quantity::numeric,
      si.weight::numeric,
      COALESCE(si.retail, 0)::numeric,
      COALESCE(si.cost, 0)::numeric,
      s.pickup_date,
      s.delivery_date,
      s.reference_number::text
    FROM shipment_item si
    INNER JOIN shipment s ON si.load_id = s.load_id
    WHERE 
      (p_customer_id = 0 OR s.customer_id = p_customer_id)
      AND s.pickup_date >= p_start_date
      AND s.pickup_date <= p_end_date
    ORDER BY s.pickup_date DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT 
      si.load_id::text,
      si.description::text,
      si.quantity::numeric,
      si.weight::numeric,
      COALESCE(si.retail, 0)::numeric,
      COALESCE(si.cost, 0)::numeric,
      s.pickup_date,
      s.delivery_date,
      s.reference_number::text
    FROM shipment_item si
    INNER JOIN shipment s ON si.load_id = s.load_id
    WHERE 
      (p_customer_id = 0 OR s.customer_id = p_customer_id)
      AND s.pickup_date >= p_start_date
      AND s.pickup_date <= p_end_date
      AND EXISTS (
        SELECT 1 FROM unnest(p_search_terms) AS term
        WHERE LOWER(si.description) LIKE '%' || LOWER(term) || '%'
      )
    ORDER BY s.pickup_date DESC
    LIMIT p_limit;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_shipment_items_with_dates IS 'Returns shipment items joined with shipment data, filtered by date range and optional search terms';