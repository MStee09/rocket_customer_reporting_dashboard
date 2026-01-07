/*
  # Add AI Settings Version History

  1. New Tables
    - `ai_settings_history`
      - `id` (uuid, primary key)
      - `setting_key` (text) - Reference to the setting
      - `setting_value` (text) - The historical value
      - `changed_by` (uuid) - User who made the change
      - `changed_at` (timestamptz)
      - `change_reason` (text) - Optional reason for change

  2. Security
    - Enable RLS
    - Only admins can read history

  3. Purpose
    - Provides rollback capability for critical AI configuration
    - Maintains audit trail of all changes
*/

CREATE TABLE IF NOT EXISTS ai_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  change_reason text
);

ALTER TABLE ai_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ai_settings_history"
  ON ai_settings_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert ai_settings_history"
  ON ai_settings_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_settings_history_key ON ai_settings_history(setting_key);
CREATE INDEX IF NOT EXISTS idx_ai_settings_history_changed_at ON ai_settings_history(changed_at DESC);