/*
  # Add field relationships table for AI tool system
  
  1. New Tables
    - `field_relationships`
      - `id` (uuid, primary key)
      - `field_a` (text, first field in relationship)
      - `field_b` (text, second field in relationship)
      - `relationship_type` (text, type of relationship)
      - `description` (text, human-readable description)
      - `suggested_use` (text, how to use this relationship)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `field_relationships` table
    - Add policy for authenticated users to read
    - Add policy for admins to manage
*/

CREATE TABLE IF NOT EXISTS field_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_a TEXT NOT NULL,
  field_b TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'lane_pair',
    'temporal_pair',
    'hierarchy',
    'ratio_candidate',
    'same_entity'
  )),
  description TEXT,
  suggested_use TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(field_a, field_b, relationship_type)
);

INSERT INTO field_relationships (field_a, field_b, relationship_type, description, suggested_use) VALUES
  ('origin_state', 'destination_state', 'lane_pair', 'Together these form a shipping lane', 'Combine as "origin_state -> destination_state" for lane analysis'),
  ('origin_city', 'destination_city', 'lane_pair', 'City-level lane', 'Use for detailed lane analysis'),
  ('pickup_date', 'delivery_date', 'temporal_pair', 'Delivery follows pickup', 'Calculate transit time as difference between these'),
  ('retail', 'weight', 'ratio_candidate', 'Revenue per pound calculation', 'Divide retail by weight for cost per pound'),
  ('retail', 'miles', 'ratio_candidate', 'Revenue per mile calculation', 'Divide retail by miles for revenue per mile'),
  ('cost', 'miles', 'ratio_candidate', 'Cost per mile calculation', 'Divide cost by miles for cost per mile (admin only)'),
  ('carrier_name', 'scac', 'same_entity', 'Both identify the carrier', 'Use carrier_name for display, scac for precise identification'),
  ('origin_city', 'origin_state', 'hierarchy', 'City is within state', 'Group by state for broader analysis, city for detailed'),
  ('destination_city', 'destination_state', 'hierarchy', 'City is within state', 'Group by state for broader analysis, city for detailed'),
  ('origin_state', 'origin_country', 'hierarchy', 'State is within country', 'Group by country for international analysis'),
  ('destination_state', 'destination_country', 'hierarchy', 'State is within country', 'Group by country for international analysis')
ON CONFLICT (field_a, field_b, relationship_type) DO NOTHING;

ALTER TABLE field_relationships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'field_relationships' AND policyname = 'Anyone can read field relationships'
  ) THEN
    CREATE POLICY "Anyone can read field relationships"
      ON field_relationships FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'field_relationships' AND policyname = 'Admins can manage field relationships'
  ) THEN
    CREATE POLICY "Admins can manage field relationships"
      ON field_relationships FOR ALL
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
