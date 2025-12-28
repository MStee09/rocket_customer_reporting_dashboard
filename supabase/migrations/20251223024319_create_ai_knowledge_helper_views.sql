/*
  # Create Helper Views for AI Knowledge Table

  1. Views Created
    - `ai_knowledge_fields` - Easy access to field definitions
    - `ai_knowledge_global_terms` - Global glossary terms
    - `ai_knowledge_customer_terms` - Customer-specific terms (requires customer_id filter)
    - `ai_knowledge_needs_review` - Items pending admin review

  2. Purpose
    - Simplify querying for specific knowledge types
    - Provide backward-compatible access patterns
*/

CREATE OR REPLACE VIEW ai_knowledge_fields AS
SELECT 
  id, 
  key as field_name, 
  label as display_label, 
  definition as business_description, 
  ai_instructions,
  metadata->>'usage_notes' as usage_notes,
  metadata->>'example_values' as example_values,
  is_visible_to_customers, 
  confidence, 
  times_used,
  updated_at
FROM ai_knowledge 
WHERE knowledge_type = 'field' AND is_active = true;

CREATE OR REPLACE VIEW ai_knowledge_global_terms AS
SELECT 
  id, 
  key as term, 
  label, 
  definition, 
  ai_instructions,
  metadata->'aliases' as aliases,
  metadata->>'category' as category,
  metadata->>'maps_to_field' as maps_to_field,
  metadata->'related_fields' as related_fields,
  confidence, 
  times_used,
  source,
  updated_at
FROM ai_knowledge 
WHERE knowledge_type = 'term' AND scope = 'global' AND is_active = true;

CREATE OR REPLACE VIEW ai_knowledge_customer_terms AS
SELECT 
  id, 
  key as term, 
  label, 
  definition, 
  ai_instructions,
  customer_id,
  metadata->'aliases' as aliases,
  metadata->>'category' as category,
  metadata->>'maps_to_field' as maps_to_field,
  metadata->'related_fields' as related_fields,
  confidence, 
  times_used,
  source,
  updated_at
FROM ai_knowledge 
WHERE knowledge_type = 'term' AND scope = 'customer' AND is_active = true;

CREATE OR REPLACE VIEW ai_knowledge_needs_review AS
SELECT 
  id, 
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
  created_at, 
  times_corrected,
  times_used
FROM ai_knowledge 
WHERE needs_review = true
ORDER BY times_corrected DESC, created_at DESC;

CREATE OR REPLACE VIEW ai_knowledge_calculations AS
SELECT 
  id,
  key as name,
  label,
  definition as description,
  ai_instructions,
  metadata->>'formula' as formula,
  metadata->>'format' as format,
  metadata->>'numerator' as numerator,
  metadata->>'denominator' as denominator,
  scope,
  customer_id,
  is_visible_to_customers,
  confidence,
  times_used
FROM ai_knowledge
WHERE knowledge_type = 'calculation' AND is_active = true;

CREATE OR REPLACE VIEW ai_knowledge_products AS
SELECT 
  id,
  key as name,
  label,
  definition as description,
  ai_instructions,
  metadata->'keywords' as keywords,
  metadata->>'search_field' as search_field,
  scope,
  customer_id,
  confidence,
  times_used
FROM ai_knowledge
WHERE knowledge_type = 'product' AND is_active = true;