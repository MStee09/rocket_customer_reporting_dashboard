/*
  # Add AI suggested prompts table
  
  1. New Tables
    - `ai_suggested_prompts`
      - `id` (uuid, primary key)
      - `category` (text, prompt category)
      - `prompt_text` (text, the actual prompt)
      - `description` (text, description of what prompt does)
      - `tags` (text array)
      - `requires_admin` (boolean)
      - `priority` (integer, for ordering)
      - `is_active` (boolean)
  
  2. Security
    - Enable RLS
    - Public read for active prompts
    - Admin management
*/

CREATE TABLE IF NOT EXISTS ai_suggested_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  requires_admin BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ai_suggested_prompts (category, prompt_text, description, tags, requires_admin, priority) VALUES
  ('cost', 'Which carriers are driving up my shipping costs?', 'Identify carriers with highest costs relative to volume', ARRAY['carrier', 'cost'], true, 10),
  ('cost', 'Where am I overpaying for shipping?', 'Find lanes or carriers with above-average costs', ARRAY['cost', 'optimization'], true, 9),
  ('cost', 'What is my cost per mile trend over time?', 'Track cost efficiency over time', ARRAY['cost', 'trend'], true, 8),
  ('volume', 'What are my shipping patterns this quarter?', 'Overview of shipment volume and distribution', ARRAY['volume', 'overview'], false, 10),
  ('volume', 'Which states receive the most shipments?', 'Geographic distribution of deliveries', ARRAY['volume', 'geography'], false, 9),
  ('volume', 'How has my shipping volume changed month over month?', 'Volume trends over time', ARRAY['volume', 'trend'], false, 8),
  ('carrier', 'Which carrier has the best on-time delivery rate?', 'Carrier performance comparison', ARRAY['carrier', 'performance'], false, 10),
  ('carrier', 'How does carrier performance vary by lane?', 'Carrier-lane analysis', ARRAY['carrier', 'lane'], false, 8),
  ('carrier', 'Show me my carrier mix over time', 'Track carrier usage trends', ARRAY['carrier', 'trend'], false, 7),
  ('lane', 'What are my top 10 shipping lanes by volume?', 'Busiest origin-destination pairs', ARRAY['lane', 'volume'], false, 10),
  ('lane', 'Which lanes have the highest costs?', 'Identify expensive routes', ARRAY['lane', 'cost'], true, 9),
  ('lane', 'Show me lanes where I might consolidate shipments', 'Consolidation opportunities', ARRAY['lane', 'optimization'], false, 8),
  ('executive', 'Give me a monthly executive summary', 'High-level KPIs and trends', ARRAY['summary', 'kpi'], false, 10),
  ('executive', 'What changed in my shipping operations this week?', 'Recent changes and anomalies', ARRAY['summary', 'recent'], false, 9),
  ('executive', 'Compare this month to last month', 'Month-over-month comparison', ARRAY['comparison', 'trend'], false, 8)
ON CONFLICT DO NOTHING;

ALTER TABLE ai_suggested_prompts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_suggested_prompts' AND policyname = 'Anyone can read suggested prompts'
  ) THEN
    CREATE POLICY "Anyone can read suggested prompts"
      ON ai_suggested_prompts FOR SELECT
      TO authenticated
      USING (is_active = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_suggested_prompts' AND policyname = 'Admins can manage suggested prompts'
  ) THEN
    CREATE POLICY "Admins can manage suggested prompts"
      ON ai_suggested_prompts FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = (SELECT auth.uid())
            AND user_role = 'admin'
        )
      );
  END IF;
END $$;
