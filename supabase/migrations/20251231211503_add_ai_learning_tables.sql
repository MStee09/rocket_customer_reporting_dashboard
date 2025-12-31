/*
  # Add AI learning system tables
  
  1. New Tables
    - `ai_usage_events` - Tracks usage patterns
    - `ai_learning_corrections` - Stores corrections for learning
    - `ai_proactive_insights` - Cached proactive insights
  
  2. Updates
    - Add confidence and source columns to ai_knowledge if not exists
  
  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_details JSONB DEFAULT '{}',
  hour_of_day INTEGER,
  day_of_week INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_customer ON ai_usage_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_time ON ai_usage_events(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_learning_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id INTEGER NOT NULL,
  correction_data JSONB NOT NULL,
  context TEXT,
  processed BOOLEAN DEFAULT FALSE,
  lesson_extracted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrections_customer ON ai_learning_corrections(customer_id);
CREATE INDEX IF NOT EXISTS idx_corrections_unprocessed ON ai_learning_corrections(processed) WHERE processed = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_knowledge' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE ai_knowledge ADD COLUMN confidence NUMERIC DEFAULT 0.5;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_knowledge' AND column_name = 'source'
  ) THEN
    ALTER TABLE ai_knowledge ADD COLUMN source TEXT DEFAULT 'admin';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ai_proactive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id INTEGER NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 5,
  data JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  shown_count INTEGER DEFAULT 0,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_insights_customer ON ai_proactive_insights(customer_id);
CREATE INDEX IF NOT EXISTS idx_insights_active ON ai_proactive_insights(customer_id, is_active, dismissed) 
  WHERE is_active = true AND dismissed = false;

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_proactive_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_events' AND policyname = 'Users can manage usage events'
  ) THEN
    CREATE POLICY "Users can manage usage events"
      ON ai_usage_events FOR ALL
      TO authenticated
      USING (
        customer_id IN (
          SELECT uc.customer_id FROM users_customers uc 
          WHERE uc.user_id = (SELECT auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = (SELECT auth.uid())
            AND user_role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_learning_corrections' AND policyname = 'Users can view corrections'
  ) THEN
    CREATE POLICY "Users can view corrections"
      ON ai_learning_corrections FOR SELECT
      TO authenticated
      USING (
        customer_id IN (
          SELECT uc.customer_id FROM users_customers uc 
          WHERE uc.user_id = (SELECT auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = (SELECT auth.uid())
            AND user_role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_proactive_insights' AND policyname = 'Users can manage insights'
  ) THEN
    CREATE POLICY "Users can manage insights"
      ON ai_proactive_insights FOR ALL
      TO authenticated
      USING (
        customer_id IN (
          SELECT uc.customer_id FROM users_customers uc 
          WHERE uc.user_id = (SELECT auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = (SELECT auth.uid())
            AND user_role = 'admin'
        )
      );
  END IF;
END $$;
