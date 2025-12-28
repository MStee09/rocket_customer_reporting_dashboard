/*
  # Migrate Existing Data to AI Knowledge Table

  1. Data Migration
    - Migrates field_business_context -> ai_knowledge (type: 'field')
    - Migrates glossary_global -> ai_knowledge (type: 'term', scope: 'global')
    - Migrates glossary_customer -> ai_knowledge (type: 'term', scope: 'customer')
    - Migrates glossary_learning_queue (pending) -> ai_knowledge (needs_review: true)

  2. Notes
    - Uses ON CONFLICT to skip duplicates
    - Preserves original metadata in JSONB format
    - Learned items are marked as needing review
*/

INSERT INTO ai_knowledge (
  knowledge_type, key, label, definition, ai_instructions, 
  metadata, scope, source, confidence, is_visible_to_customers, is_active
)
SELECT 
  'field',
  field_name,
  display_label,
  business_description,
  ai_instructions,
  jsonb_build_object(
    'usage_notes', usage_notes,
    'example_values', example_values
  ),
  'global',
  'manual',
  1.0,
  COALESCE(is_visible_to_customers, true),
  true
FROM field_business_context
ON CONFLICT (knowledge_type, key, scope, customer_id) DO NOTHING;

INSERT INTO ai_knowledge (
  knowledge_type, key, label, definition, ai_instructions,
  metadata, scope, source, confidence, is_active, times_used, last_used_at
)
SELECT 
  'term',
  term,
  term,
  definition,
  ai_instructions,
  jsonb_build_object(
    'aliases', COALESCE(to_jsonb(aliases), '[]'::jsonb),
    'category', category,
    'related_fields', COALESCE(to_jsonb(related_fields), '[]'::jsonb),
    'source', source
  ),
  'global',
  'manual',
  1.0,
  COALESCE(is_active, true),
  COALESCE(usage_count, 0),
  last_used_at
FROM glossary_global
ON CONFLICT (knowledge_type, key, scope, customer_id) DO NOTHING;

INSERT INTO ai_knowledge (
  knowledge_type, key, label, definition, ai_instructions,
  metadata, scope, customer_id, source, confidence, is_active, times_used, last_used_at
)
SELECT 
  'term',
  term,
  term,
  definition,
  ai_instructions,
  jsonb_build_object(
    'aliases', COALESCE(to_jsonb(aliases), '[]'::jsonb),
    'category', category,
    'related_fields', COALESCE(to_jsonb(related_fields), '[]'::jsonb),
    'source', source
  ),
  'customer',
  customer_id,
  'manual',
  1.0,
  COALESCE(is_active, true),
  COALESCE(usage_count, 0),
  last_used_at
FROM glossary_customer
ON CONFLICT (knowledge_type, key, scope, customer_id) DO NOTHING;

INSERT INTO ai_knowledge (
  knowledge_type, key, label, definition, ai_instructions,
  metadata, scope, customer_id, source, confidence, needs_review, is_active
)
SELECT 
  'term',
  term,
  term,
  user_explanation,
  ai_interpretation,
  jsonb_build_object(
    'original_query', original_query,
    'maps_to_field', maps_to_field,
    'suggested_category', suggested_category,
    'customer_name', customer_name
  ),
  COALESCE(suggested_scope, 'customer'),
  customer_id,
  'learned',
  COALESCE(confidence_score, 0.7),
  true,
  false
FROM glossary_learning_queue
WHERE status = 'pending'
ON CONFLICT (knowledge_type, key, scope, customer_id) DO NOTHING;