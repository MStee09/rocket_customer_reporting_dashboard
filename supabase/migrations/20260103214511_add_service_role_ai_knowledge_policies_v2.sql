/*
  # Add Service Role Policies for AI Knowledge Table

  1. Security Changes
    - Add INSERT policy for service_role to allow edge functions to save learned terminology
    - Add UPDATE policy for service_role to allow edge functions to update knowledge entries

  2. Purpose
    - Edge functions run with service_role and need to insert/update ai_knowledge
    - This enables the learn_terminology, learn_preference, and record_correction tools
*/

DROP POLICY IF EXISTS "Service role can insert knowledge" ON ai_knowledge;
DROP POLICY IF EXISTS "Service role can update knowledge" ON ai_knowledge;

CREATE POLICY "Service role can insert knowledge"
  ON ai_knowledge
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update knowledge"
  ON ai_knowledge
  FOR UPDATE
  TO service_role
  USING (true);
