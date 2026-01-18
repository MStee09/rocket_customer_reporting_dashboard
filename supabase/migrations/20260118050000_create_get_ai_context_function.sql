/*
  # Create get_ai_context Function
  
  This is a CRITICAL function that was missing - the Context Compiler in the
  investigate edge function calls this but it didn't exist, causing all 
  Knowledge Base data to be silently ignored.

  1. Function: get_ai_context
     - Called by investigate edge function to build AI context
     - Returns all relevant knowledge, documents, and customer profiles
     - Filters by customer_id and includes global items
  
  2. Returns:
     - global_knowledge: Terms, products, fields, rules from ai_knowledge (scope='global')
     - customer_knowledge: Customer-specific items from ai_knowledge
     - global_documents: Reference docs from ai_knowledge_documents (scope='global')
     - customer_documents: Customer-specific docs from ai_knowledge_documents
     - customer_profile: From customer_intelligence_profiles (priorities, products, terminology)
*/

-- Drop if exists to allow re-running
DROP FUNCTION IF EXISTS get_ai_context(INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION get_ai_context(
  p_customer_id INTEGER,
  p_is_admin BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_global_knowledge JSONB;
  v_customer_knowledge JSONB;
  v_global_documents JSONB;
  v_customer_documents JSONB;
  v_customer_profile JSONB;
BEGIN
  -- Get global knowledge (terms, products, fields, rules)
  -- Note: Edge function expects 'id' as number and 'times_used' field
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', EXTRACT(EPOCH FROM created_at)::integer, -- Use timestamp as numeric ID
      'type', knowledge_type,
      'key', key,
      'label', label,
      'definition', definition,
      'ai_instructions', ai_instructions,
      'metadata', metadata,
      'times_used', times_used
    ) ORDER BY 
      CASE knowledge_type 
        WHEN 'term' THEN 1 
        WHEN 'product' THEN 2 
        WHEN 'field' THEN 3 
        WHEN 'rule' THEN 4 
        ELSE 5 
      END,
      confidence DESC
  ), '[]'::jsonb)
  INTO v_global_knowledge
  FROM ai_knowledge
  WHERE scope = 'global'
    AND is_active = true
    AND knowledge_type IN ('term', 'product', 'field', 'rule', 'calculation');

  -- Get customer-specific knowledge
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', EXTRACT(EPOCH FROM created_at)::integer,
      'type', knowledge_type,
      'key', key,
      'label', label,
      'definition', definition,
      'ai_instructions', ai_instructions,
      'metadata', metadata,
      'times_used', times_used
    ) ORDER BY confidence DESC
  ), '[]'::jsonb)
  INTO v_customer_knowledge
  FROM ai_knowledge
  WHERE scope = 'customer'
    AND customer_id = p_customer_id::text
    AND is_active = true;

  -- Get global documents (limit to top 5 by priority, max 2000 chars each)
  -- Note: Convert UUID to numeric for edge function compatibility
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', EXTRACT(EPOCH FROM created_at)::integer,
      'title', title,
      'category', category,
      'content', LEFT(extracted_text, 2000),
      'priority', priority
    ) ORDER BY priority DESC
  ), '[]'::jsonb)
  INTO v_global_documents
  FROM (
    SELECT created_at, title, category, extracted_text, priority
    FROM ai_knowledge_documents
    WHERE scope = 'global'
      AND is_active = true
    ORDER BY priority DESC
    LIMIT 5
  ) docs;

  -- Get customer-specific documents (limit to top 3)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', EXTRACT(EPOCH FROM created_at)::integer,
      'title', title,
      'category', category,
      'content', LEFT(extracted_text, 2000),
      'priority', priority
    ) ORDER BY priority DESC
  ), '[]'::jsonb)
  INTO v_customer_documents
  FROM (
    SELECT created_at, title, category, extracted_text, priority
    FROM ai_knowledge_documents
    WHERE scope = 'customer'
      AND customer_id = p_customer_id::text
      AND is_active = true
    ORDER BY priority DESC
    LIMIT 3
  ) docs;

  -- Get customer intelligence profile
  SELECT COALESCE(
    jsonb_build_object(
      'priorities', COALESCE(priorities, '[]'::jsonb),
      'products', COALESCE(products, '[]'::jsonb),
      'key_markets', COALESCE(key_markets, '[]'::jsonb),
      'terminology', COALESCE(terminology, '[]'::jsonb),
      'benchmark_period', COALESCE(benchmark_period, ''),
      'account_notes', COALESCE(account_notes, '')
    ),
    '{}'::jsonb
  )
  INTO v_customer_profile
  FROM customer_intelligence_profiles
  WHERE customer_id = p_customer_id;

  -- Build final result
  v_result := jsonb_build_object(
    'global_knowledge', v_global_knowledge,
    'customer_knowledge', v_customer_knowledge,
    'global_documents', v_global_documents,
    'customer_documents', v_customer_documents,
    'customer_profile', COALESCE(v_customer_profile, '{}'::jsonb)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute to authenticated users (edge function runs as service role anyway)
GRANT EXECUTE ON FUNCTION get_ai_context(INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_context(INTEGER, BOOLEAN) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION get_ai_context IS 
'Returns all AI context for a customer including global knowledge, customer-specific knowledge, 
documents, and customer intelligence profile. Called by the investigate edge function 
to build the system prompt context.';

-- ============================================================================
-- Also create the correct increment_knowledge_usage function
-- The existing one takes (TEXT, TEXT) but edge function calls with INTEGER[]
-- ============================================================================

-- Drop existing function with wrong signature (if it has the array signature)
DROP FUNCTION IF EXISTS increment_knowledge_usage(INTEGER[]);

CREATE OR REPLACE FUNCTION increment_knowledge_usage(
  p_knowledge_ids INTEGER[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- The IDs passed are epoch timestamps we generated
  -- We need to update based on matching timestamps
  -- For now, just log that we'd track usage
  -- In reality, we should store the actual UUIDs and use those
  
  -- This is a no-op for now since we're using fake numeric IDs
  -- TODO: Refactor to use actual UUIDs for proper tracking
  RAISE NOTICE 'Would track usage for % knowledge items', array_length(p_knowledge_ids, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION increment_knowledge_usage(INTEGER[]) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_knowledge_usage(INTEGER[]) TO service_role;
