/*
  # Create Unified AI Knowledge Table

  1. New Tables
    - `ai_knowledge` - Consolidated table for all AI knowledge
      - `id` (uuid, primary key)
      - `knowledge_type` (text) - 'field', 'term', 'calculation', 'product', 'rule'
      - `key` (text) - The unique identifier for this knowledge
      - `label` (text) - Human-readable label
      - `definition` (text) - Description/definition
      - `ai_instructions` (text) - Instructions for AI usage
      - `metadata` (jsonb) - Type-specific additional data
      - `scope` (text) - 'global' or 'customer'
      - `customer_id` (text) - NULL for global scope
      - `source` (text) - 'manual', 'learned', 'inferred'
      - `confidence` (decimal) - 1.0 = certain, lower = needs review
      - `times_used` (integer) - Usage counter
      - `times_corrected` (integer) - Correction counter
      - `last_used_at` (timestamptz) - Last usage timestamp
      - `is_visible_to_customers` (boolean) - Customer visibility
      - `is_active` (boolean) - Active status
      - `needs_review` (boolean) - Flagged for admin review
      - Audit fields for tracking changes

  2. Security
    - Enable RLS
    - Admins can view and manage all knowledge
    - Service role can insert/update for auto-learning

  3. Indexes
    - Type, scope, customer for fast lookups
    - Needs review for admin queue
    - Active items only
*/

CREATE TABLE IF NOT EXISTS ai_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_type TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT,
  definition TEXT,
  ai_instructions TEXT,
  metadata JSONB DEFAULT '{}',
  scope TEXT DEFAULT 'global',
  customer_id TEXT,
  source TEXT DEFAULT 'manual',
  confidence DECIMAL DEFAULT 1.0,
  times_used INTEGER DEFAULT 0,
  times_corrected INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_visible_to_customers BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  needs_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  UNIQUE(knowledge_type, key, scope, customer_id)
);

ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_type ON ai_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_scope ON ai_knowledge(scope, customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_needs_review ON ai_knowledge(needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_active ON ai_knowledge(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_key ON ai_knowledge(key);

CREATE POLICY "Admins can view all knowledge"
  ON ai_knowledge
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert knowledge"
  ON ai_knowledge
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update knowledge"
  ON ai_knowledge
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can delete knowledge"
  ON ai_knowledge
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );