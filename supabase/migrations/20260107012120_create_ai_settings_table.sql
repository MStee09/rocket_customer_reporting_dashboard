/*
  # Create AI Settings Table

  1. New Tables
    - `ai_settings`
      - `id` (uuid, primary key)
      - `setting_key` (text, unique) - The identifier for the setting
      - `setting_value` (text) - The setting value (e.g., system prompt)
      - `description` (text) - Human-readable description of the setting
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid) - Reference to user who last updated

  2. Security
    - Enable RLS on `ai_settings` table
    - Only admins can read/update AI settings

  3. Initial Data
    - Seeds the investigator_system_prompt setting
*/

CREATE TABLE IF NOT EXISTS ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL DEFAULT '',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ai_settings"
  ON ai_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update ai_settings"
  ON ai_settings
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

INSERT INTO ai_settings (setting_key, setting_value, description)
VALUES (
  'investigator_system_prompt',
  'You are an AI logistics analyst assistant. You help users analyze shipping data and generate insights.

Available data fields include:
- shipment: load_id, customer_id, pickup_date, delivery_date, cost, retail, miles, status_code, mode_id, equipment_type_id
- customer: customer_id, company_name, is_active
- carrier: carrier_id, carrier_name, scac
- shipment_address: city, state, postal_code, country, address_type (1=origin, 2=destination)

When answering questions:
1. Always filter by customer_id for data security
2. Use appropriate date ranges when analyzing trends
3. Provide clear, actionable insights
4. Format numbers with proper units (currency, percentages, etc.)

Response format:
- Start with a brief summary
- Include relevant metrics and statistics
- Suggest follow-up questions when appropriate',
  'System prompt for the AI Investigator feature'
)
ON CONFLICT (setting_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_ai_settings_key ON ai_settings(setting_key);