/*
  # Smart Knowledge Matching
  
  Instead of injecting ALL knowledge items into every prompt, this function
  matches the user's question against knowledge items and returns only
  the relevant ones.
  
  1. New Function: match_knowledge_to_question
     - Takes user question and customer_id
     - Returns top N most relevant knowledge items
     - Uses keyword matching and text search
  
  2. Updated Function: get_ai_context
     - Now accepts p_question parameter
     - Returns only relevant knowledge (not all 91 items)
     - Keeps core items (always included) + matched items
*/

-- ============================================================================
-- STEP 1: Create keyword extraction helper
-- ============================================================================

CREATE OR REPLACE FUNCTION extract_search_terms(p_question TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_terms TEXT[];
  v_cleaned TEXT;
BEGIN
  -- Lowercase and remove punctuation
  v_cleaned := LOWER(REGEXP_REPLACE(p_question, '[^\w\s]', ' ', 'g'));
  
  -- Split into words and filter out common stop words
  SELECT ARRAY_AGG(DISTINCT word)
  INTO v_terms
  FROM unnest(string_to_array(v_cleaned, ' ')) AS word
  WHERE length(word) > 2
    AND word NOT IN (
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'has', 'his', 'how', 'its', 'may',
      'who', 'did', 'get', 'than', 'been', 'have', 'from', 'they', 'what',
      'when', 'make', 'like', 'just', 'over', 'such', 'into', 'year', 'your',
      'some', 'them', 'then', 'this', 'that', 'with', 'show', 'give', 'tell',
      'about', 'would', 'there', 'their', 'which', 'could', 'other', 'these',
      'many', 'much', 'please', 'thanks', 'help', 'need', 'want'
    );
  
  RETURN COALESCE(v_terms, ARRAY[]::TEXT[]);
END;
$$;

-- ============================================================================
-- STEP 2: Create knowledge matching function
-- ============================================================================

CREATE OR REPLACE FUNCTION match_knowledge_to_question(
  p_question TEXT,
  p_customer_id INTEGER,
  p_max_items INTEGER DEFAULT 15
)
RETURNS TABLE (
  id INTEGER,
  knowledge_type TEXT,
  key TEXT,
  label TEXT,
  definition TEXT,
  ai_instructions TEXT,
  metadata JSONB,
  times_used INTEGER,
  match_score NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_terms TEXT[];
  v_question_lower TEXT;
BEGIN
  v_question_lower := LOWER(p_question);
  v_terms := extract_search_terms(p_question);
  
  RETURN QUERY
  WITH scored_knowledge AS (
    SELECT 
      EXTRACT(EPOCH FROM k.created_at)::integer AS id,
      k.knowledge_type,
      k.key,
      k.label,
      k.definition,
      k.ai_instructions,
      k.metadata,
      k.times_used,
      -- Calculate match score
      (
        -- Exact key match (highest priority)
        CASE WHEN v_question_lower LIKE '%' || LOWER(k.key) || '%' THEN 100 ELSE 0 END +
        -- Exact label match
        CASE WHEN k.label IS NOT NULL AND v_question_lower LIKE '%' || LOWER(k.label) || '%' THEN 80 ELSE 0 END +
        -- Check aliases in metadata
        CASE WHEN k.metadata->'aliases' IS NOT NULL AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(k.metadata->'aliases') alias
          WHERE v_question_lower LIKE '%' || LOWER(alias) || '%'
        ) THEN 70 ELSE 0 END +
        -- Term appears in definition (lower priority)
        CASE WHEN v_question_lower LIKE '%' || LOWER(COALESCE(k.definition, '')) || '%' THEN 10 ELSE 0 END +
        -- Any search term matches key
        (SELECT COALESCE(SUM(
          CASE WHEN LOWER(k.key) LIKE '%' || term || '%' THEN 30 ELSE 0 END
        ), 0) FROM unnest(v_terms) AS term) +
        -- Any search term matches label
        (SELECT COALESCE(SUM(
          CASE WHEN LOWER(COALESCE(k.label, '')) LIKE '%' || term || '%' THEN 25 ELSE 0 END
        ), 0) FROM unnest(v_terms) AS term) +
        -- Boost by usage
        LEAST(k.times_used * 2, 20) +
        -- Boost by confidence
        k.confidence * 10
      )::NUMERIC AS match_score
    FROM ai_knowledge k
    WHERE k.is_active = true
      AND (
        k.scope = 'global' 
        OR (k.scope = 'customer' AND k.customer_id = p_customer_id::text)
      )
  )
  SELECT 
    sk.id,
    sk.knowledge_type,
    sk.key,
    sk.label,
    sk.definition,
    sk.ai_instructions,
    sk.metadata,
    sk.times_used,
    sk.match_score
  FROM scored_knowledge sk
  WHERE sk.match_score > 0
  ORDER BY sk.match_score DESC
  LIMIT p_max_items;
END;
$$;

-- ============================================================================
-- STEP 3: Create core knowledge function (always included)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_core_knowledge()
RETURNS TABLE (
  id INTEGER,
  knowledge_type TEXT,
  key TEXT,
  label TEXT,
  definition TEXT,
  ai_instructions TEXT,
  metadata JSONB,
  times_used INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Always include these essential items regardless of question
  RETURN QUERY
  SELECT 
    EXTRACT(EPOCH FROM k.created_at)::integer AS id,
    k.knowledge_type,
    k.key,
    k.label,
    k.definition,
    k.ai_instructions,
    k.metadata,
    k.times_used
  FROM ai_knowledge k
  WHERE k.is_active = true
    AND k.scope = 'global'
    AND (
      -- Essential terms
      LOWER(k.key) IN ('ltl', 'ftl', 'spend', 'retail', 'cost', 'carrier', 'lane', 'cpm')
      -- Or high-confidence company concepts
      OR (k.knowledge_type = 'term' AND k.confidence >= 0.95 AND k.key IN ('Blended Model', 'The 5 R''s'))
    )
  LIMIT 10;
END;
$$;

-- ============================================================================
-- STEP 4: Update get_ai_context to use smart matching
-- ============================================================================

DROP FUNCTION IF EXISTS get_ai_context(INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION get_ai_context(
  p_customer_id INTEGER,
  p_is_admin BOOLEAN DEFAULT false,
  p_question TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_matched_knowledge JSONB;
  v_core_knowledge JSONB;
  v_combined_knowledge JSONB;
  v_global_documents JSONB;
  v_customer_documents JSONB;
  v_customer_profile JSONB;
BEGIN
  -- Get CORE knowledge (always included, ~10 items)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ck.id,
      'type', ck.knowledge_type,
      'key', ck.key,
      'label', ck.label,
      'definition', ck.definition,
      'ai_instructions', ck.ai_instructions,
      'metadata', ck.metadata,
      'times_used', ck.times_used
    )
  ), '[]'::jsonb)
  INTO v_core_knowledge
  FROM get_core_knowledge() ck;

  -- Get MATCHED knowledge based on question (if provided)
  IF p_question IS NOT NULL AND length(p_question) > 0 THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', mk.id,
        'type', mk.knowledge_type,
        'key', mk.key,
        'label', mk.label,
        'definition', mk.definition,
        'ai_instructions', mk.ai_instructions,
        'metadata', mk.metadata,
        'times_used', mk.times_used,
        'match_score', mk.match_score
      )
    ), '[]'::jsonb)
    INTO v_matched_knowledge
    FROM match_knowledge_to_question(p_question, p_customer_id, 15) mk;
  ELSE
    v_matched_knowledge := '[]'::jsonb;
  END IF;

  -- Combine core + matched, removing duplicates (keep matched version if duplicate)
  SELECT COALESCE(jsonb_agg(DISTINCT item), '[]'::jsonb)
  INTO v_combined_knowledge
  FROM (
    -- Matched items first (higher priority)
    SELECT item
    FROM jsonb_array_elements(v_matched_knowledge) AS item
    UNION
    -- Core items (if not already in matched)
    SELECT item
    FROM jsonb_array_elements(v_core_knowledge) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_matched_knowledge) AS matched
      WHERE matched->>'key' = item->>'key'
    )
  ) combined;

  -- Get global documents (limit to top 3 by priority, max 1500 chars each)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', EXTRACT(EPOCH FROM created_at)::integer,
      'title', title,
      'category', category,
      'content', LEFT(extracted_text, 1500),
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
    LIMIT 3
  ) docs;

  -- Get customer-specific documents (limit to top 2)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', EXTRACT(EPOCH FROM created_at)::integer,
      'title', title,
      'category', category,
      'content', LEFT(extracted_text, 1500),
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
    LIMIT 2
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
    'global_knowledge', v_combined_knowledge,
    'customer_knowledge', '[]'::jsonb,  -- Already merged into global_knowledge
    'global_documents', v_global_documents,
    'customer_documents', v_customer_documents,
    'customer_profile', COALESCE(v_customer_profile, '{}'::jsonb)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant permissions
GRANT EXECUTE ON FUNCTION extract_search_terms(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION match_knowledge_to_question(TEXT, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_core_knowledge() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_ai_context(INTEGER, BOOLEAN, TEXT) TO authenticated, service_role;

-- Add comments
COMMENT ON FUNCTION match_knowledge_to_question IS 
'Matches user question against knowledge base and returns relevant items scored by relevance.';

COMMENT ON FUNCTION get_ai_context IS 
'Returns AI context with smart knowledge matching. Pass question to get only relevant knowledge items.';
