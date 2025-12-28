/*
  # Create Field Business Context Table

  1. New Tables
    - `field_business_context`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `field_name` (text, unique) - Database field name like 'origin_state', 'lane', 'cost'
      - `display_label` (text) - Friendly name for display
      - `business_description` (text) - What this field means in business terms
      - `usage_notes` (text) - How/when to use this field
      - `example_values` (text) - Example values for this field
      - `ai_instructions` (text) - Special instructions for AI when using this field
      - `is_visible_to_customers` (boolean) - Whether customers can see this field
      - `updated_by` (text) - User who last updated this record

  2. Security
    - Enable RLS on `field_business_context` table
    - Admins can read and write
    - Regular users can read visible fields only
*/

CREATE TABLE IF NOT EXISTS field_business_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  field_name TEXT NOT NULL UNIQUE,
  
  display_label TEXT,
  business_description TEXT,
  usage_notes TEXT,
  example_values TEXT,
  ai_instructions TEXT,
  
  is_visible_to_customers BOOLEAN DEFAULT true,
  
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_field_context_name ON field_business_context(field_name);
CREATE INDEX IF NOT EXISTS idx_field_context_visible ON field_business_context(is_visible_to_customers);

ALTER TABLE field_business_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all field context"
  ON field_business_context
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Non-admins can read visible fields only"
  ON field_business_context
  FOR SELECT
  TO authenticated
  USING (
    is_visible_to_customers = true
    AND NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert field context"
  ON field_business_context
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update field context"
  ON field_business_context
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

CREATE POLICY "Admins can delete field context"
  ON field_business_context
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

COMMENT ON TABLE field_business_context IS 'Stores business context and AI instructions for database fields';
COMMENT ON COLUMN field_business_context.field_name IS 'Database column name (e.g., origin_state, lane, cost)';
COMMENT ON COLUMN field_business_context.display_label IS 'User-friendly display name';
COMMENT ON COLUMN field_business_context.business_description IS 'What this field means in business terms';
COMMENT ON COLUMN field_business_context.usage_notes IS 'When and how to use this field in reports';
COMMENT ON COLUMN field_business_context.example_values IS 'Example values (e.g., TX, CA, NY)';
COMMENT ON COLUMN field_business_context.ai_instructions IS 'Special instructions for AI when interpreting this field';
COMMENT ON COLUMN field_business_context.is_visible_to_customers IS 'If false, field is admin-only (e.g., cost, margin)';