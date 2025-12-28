/*
  # Fix source value in add_learned_knowledge function

  1. Changes
    - Update add_learned_knowledge function to use 'auto-learned' instead of 'learned'
    - This matches the actual data in the database
    
  2. Reason
    - The UI expects source = 'auto-learned' but the function was inserting 'learned'
    - Ensures consistency between function and actual data
*/

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
    p_metadata, p_scope, p_customer_id, 'auto-learned', p_confidence,
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
