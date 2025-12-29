/*
  # Add Customer Preferences for Learning System

  1. Schema Changes
    - Adds `preferences` JSONB column to `customer_intelligence_profiles` table
    - Stores learned preferences like chart types and focus areas

  2. New Functions
    - `increment_knowledge_usage(p_key, p_customer_id)` - Tracks when knowledge is used
      - Increments usage count
      - Updates last_used_at timestamp
      - Slightly boosts confidence score
*/

ALTER TABLE customer_intelligence_profiles
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN customer_intelligence_profiles.preferences IS 
'Learned preferences: { "chartTypes": {"pie": 0.7}, "focusAreas": {"cost": 0.8} }';

CREATE OR REPLACE FUNCTION increment_knowledge_usage(
  p_key TEXT,
  p_customer_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_knowledge
  SET 
    times_used = times_used + 1,
    last_used_at = NOW(),
    confidence = LEAST(1.0, confidence + 0.01)
  WHERE key = p_key
    AND customer_id = p_customer_id
    AND scope = 'customer';
END;
$$;

GRANT EXECUTE ON FUNCTION increment_knowledge_usage(TEXT, TEXT) TO authenticated;