/*
  # Create Auto-Learning Functions for AI Knowledge

  1. Functions Created
    - `record_knowledge_usage` - Track when knowledge is used (increases confidence)
    - `record_knowledge_correction` - Track when knowledge is corrected (decreases confidence)
    - `add_learned_knowledge` - Add new learned knowledge with auto-review flagging
    - `approve_knowledge` - Approve learned knowledge for production use
    - `get_customer_knowledge` - Get all relevant knowledge for a customer

  2. Purpose
    - Enable automatic confidence adjustments based on usage
    - Track corrections and flag problematic knowledge for review
    - Streamline the knowledge approval workflow
*/

CREATE OR REPLACE FUNCTION record_knowledge_usage(p_knowledge_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ai_knowledge 
  SET 
    times_used = times_used + 1,
    last_used_at = NOW(),
    confidence = LEAST(confidence + 0.01, 1.0),
    updated_at = NOW()
  WHERE id = p_knowledge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_knowledge_correction(
  p_knowledge_id UUID,
  p_correction_note TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE ai_knowledge 
  SET 
    times_corrected = times_corrected + 1,
    confidence = GREATEST(confidence - 0.1, 0.3),
    needs_review = CASE WHEN times_corrected >= 2 THEN true ELSE needs_review END,
    metadata = CASE 
      WHEN p_correction_note IS NOT NULL 
      THEN jsonb_set(COALESCE(metadata, '{}'), '{last_correction}', to_jsonb(p_correction_note))
      ELSE metadata 
    END,
    updated_at = NOW()
  WHERE id = p_knowledge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_learned_knowledge(
  p_type TEXT,
  p_key TEXT,
  p_definition TEXT,
  p_ai_instructions TEXT DEFAULT NULL,
  p_scope TEXT DEFAULT 'global',
  p_customer_id TEXT DEFAULT NULL,
  p_confidence DECIMAL DEFAULT 0.7,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO ai_knowledge (
    knowledge_type, key, label, definition, ai_instructions,
    metadata, scope, customer_id, source, confidence, 
    needs_review, is_active, created_at
  ) VALUES (
    p_type, p_key, p_key, p_definition, p_ai_instructions,
    p_metadata, p_scope, p_customer_id, 'learned', p_confidence,
    p_confidence < 0.9,
    p_confidence >= 0.9,
    NOW()
  )
  ON CONFLICT (knowledge_type, key, scope, customer_id) 
  DO UPDATE SET
    times_used = ai_knowledge.times_used + 1,
    confidence = LEAST(ai_knowledge.confidence + 0.05, 1.0),
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_knowledge(
  p_id UUID,
  p_reviewed_by TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE ai_knowledge
  SET 
    needs_review = false,
    is_active = true,
    confidence = GREATEST(confidence, 0.9),
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_knowledge(
  p_id UUID,
  p_reviewed_by TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE ai_knowledge
  SET 
    needs_review = false,
    is_active = false,
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    updated_at = NOW(),
    metadata = CASE 
      WHEN p_reason IS NOT NULL 
      THEN jsonb_set(COALESCE(metadata, '{}'), '{rejection_reason}', to_jsonb(p_reason))
      ELSE metadata 
    END
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_customer_knowledge(
  p_customer_id TEXT,
  p_types TEXT[] DEFAULT ARRAY['field', 'term', 'calculation', 'product']
)
RETURNS TABLE (
  id UUID,
  knowledge_type TEXT,
  key TEXT,
  label TEXT,
  definition TEXT,
  ai_instructions TEXT,
  metadata JSONB,
  scope TEXT,
  confidence DECIMAL,
  times_used INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.knowledge_type,
    k.key,
    k.label,
    k.definition,
    k.ai_instructions,
    k.metadata,
    k.scope,
    k.confidence,
    k.times_used
  FROM ai_knowledge k
  WHERE k.is_active = true
    AND k.knowledge_type = ANY(p_types)
    AND (
      k.scope = 'global'
      OR (k.scope = 'customer' AND k.customer_id = p_customer_id)
    )
  ORDER BY 
    k.scope DESC,
    k.confidence DESC,
    k.times_used DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION search_knowledge(
  p_search_term TEXT,
  p_customer_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  knowledge_type TEXT,
  key TEXT,
  label TEXT,
  definition TEXT,
  scope TEXT,
  match_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.knowledge_type,
    k.key,
    k.label,
    k.definition,
    k.scope,
    CASE 
      WHEN LOWER(k.key) = LOWER(p_search_term) THEN 1.0
      WHEN LOWER(k.key) LIKE LOWER(p_search_term) || '%' THEN 0.9
      WHEN LOWER(k.label) LIKE '%' || LOWER(p_search_term) || '%' THEN 0.7
      WHEN LOWER(k.definition) LIKE '%' || LOWER(p_search_term) || '%' THEN 0.5
      ELSE 0.3
    END as match_score
  FROM ai_knowledge k
  WHERE k.is_active = true
    AND (
      k.scope = 'global'
      OR (p_customer_id IS NOT NULL AND k.scope = 'customer' AND k.customer_id = p_customer_id)
    )
    AND (
      LOWER(k.key) LIKE '%' || LOWER(p_search_term) || '%'
      OR LOWER(k.label) LIKE '%' || LOWER(p_search_term) || '%'
      OR LOWER(k.definition) LIKE '%' || LOWER(p_search_term) || '%'
    )
  ORDER BY match_score DESC, k.times_used DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;