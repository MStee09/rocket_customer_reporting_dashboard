/*
  # Global Promotion Functions for AI Knowledge (v2)

  1. New Functions
    - `get_global_promotion_suggestions(min_customers)` - Returns customer-scoped terms used by multiple customers
    - `promote_term_to_global(p_key, p_knowledge_type, p_definition, p_ai_instructions)` - Promotes a term to global scope

  2. Purpose
    - Help admins identify terms that could be industry-standard
    - Streamline promotion of commonly-used customer terminology to global
*/

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_global_promotion_suggestions(integer);
DROP FUNCTION IF EXISTS promote_term_to_global(text, text, text, text);

-- Function to get suggestions for terms that should be promoted to global
CREATE FUNCTION get_global_promotion_suggestions(min_customers integer DEFAULT 2)
RETURNS TABLE (
  key text,
  knowledge_type text,
  customer_count bigint,
  customers jsonb,
  sample_definition text,
  total_uses bigint,
  avg_confidence numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH customer_terms AS (
    SELECT 
      ak.key,
      ak.knowledge_type,
      ak.customer_id,
      ak.definition,
      ak.confidence,
      ak.times_used,
      c.company_name
    FROM ai_knowledge ak
    LEFT JOIN customer c ON c.customer_id = ak.customer_id::integer
    WHERE ak.scope = 'customer'
      AND ak.is_active = true
      AND ak.key IS NOT NULL
  ),
  grouped AS (
    SELECT 
      ct.key,
      ct.knowledge_type,
      COUNT(DISTINCT ct.customer_id) as customer_count,
      jsonb_agg(
        jsonb_build_object(
          'customer_id', ct.customer_id,
          'customer_name', COALESCE(ct.company_name, 'Customer #' || ct.customer_id),
          'definition', ct.definition,
          'confidence', ct.confidence
        )
        ORDER BY ct.confidence DESC
      ) as customers,
      (array_agg(ct.definition ORDER BY ct.confidence DESC, ct.times_used DESC))[1] as sample_definition,
      SUM(ct.times_used) as total_uses,
      ROUND(AVG(ct.confidence)::numeric, 2) as avg_confidence
    FROM customer_terms ct
    GROUP BY ct.key, ct.knowledge_type
    HAVING COUNT(DISTINCT ct.customer_id) >= min_customers
  )
  SELECT 
    g.key,
    g.knowledge_type,
    g.customer_count,
    g.customers,
    g.sample_definition,
    g.total_uses,
    g.avg_confidence
  FROM grouped g
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_knowledge ak2 
    WHERE ak2.key = g.key 
      AND ak2.knowledge_type = g.knowledge_type 
      AND ak2.scope = 'global'
  )
  ORDER BY g.customer_count DESC, g.total_uses DESC;
END;
$$;

-- Function to promote a term from customer-scoped to global
CREATE FUNCTION promote_term_to_global(
  p_key text,
  p_knowledge_type text,
  p_definition text,
  p_ai_instructions text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
  v_metadata jsonb;
BEGIN
  -- Get best label and metadata from existing entries
  SELECT 
    COALESCE(label, p_key),
    metadata
  INTO v_label, v_metadata
  FROM ai_knowledge
  WHERE key = p_key 
    AND knowledge_type = p_knowledge_type 
    AND scope = 'customer'
  ORDER BY confidence DESC, times_used DESC
  LIMIT 1;

  -- Insert global version
  INSERT INTO ai_knowledge (
    knowledge_type,
    key,
    label,
    definition,
    ai_instructions,
    metadata,
    scope,
    customer_id,
    source,
    confidence,
    is_active,
    needs_review,
    is_visible_to_customers
  ) VALUES (
    p_knowledge_type,
    p_key,
    COALESCE(v_label, p_key),
    p_definition,
    p_ai_instructions,
    v_metadata,
    'global',
    NULL,
    'promoted',
    1.0,
    true,
    false,
    true
  );

  -- Delete all customer-scoped versions
  DELETE FROM ai_knowledge
  WHERE key = p_key
    AND knowledge_type = p_knowledge_type
    AND scope = 'customer';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_global_promotion_suggestions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_term_to_global(text, text, text, text) TO authenticated;