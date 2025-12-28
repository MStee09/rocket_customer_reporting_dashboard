/*
  # Create AI Learning System - Glossary Tables

  1. New Tables
    - `glossary_global` - Industry-standard terms available to all users
    - `glossary_customer` - Customer-specific terminology
    - `glossary_learning_queue` - Pending terms for admin review
    - `glossary_audit_log` - Change history for glossary entries

  2. Security
    - Enable RLS on all tables
    - Global glossary: authenticated users can read active entries, admins can write
    - Customer glossary: users can read entries for their customer, admins can write
    - Learning queue: admin-only access
    - Audit log: admin read, authenticated insert

  3. Helper Functions
    - `check_term_conflicts` - Detect conflicts when adding new terms
*/

-- ============================================
-- GLOBAL GLOSSARY (Industry-standard terms)
-- ============================================
CREATE TABLE IF NOT EXISTS glossary_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  term TEXT NOT NULL,
  term_lowercase TEXT GENERATED ALWAYS AS (LOWER(term)) STORED,
  definition TEXT NOT NULL,
  category TEXT,
  aliases TEXT[] DEFAULT '{}',
  related_fields TEXT[] DEFAULT '{}',
  ai_instructions TEXT,
  
  created_by TEXT NOT NULL,
  updated_by TEXT,
  
  source TEXT DEFAULT 'admin_manual',
  confidence TEXT DEFAULT 'high',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT true
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'glossary_global_term_unique'
  ) THEN
    ALTER TABLE glossary_global ADD CONSTRAINT glossary_global_term_unique UNIQUE (term_lowercase);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_glossary_global_term ON glossary_global(term_lowercase);
CREATE INDEX IF NOT EXISTS idx_glossary_global_category ON glossary_global(category);
CREATE INDEX IF NOT EXISTS idx_glossary_global_active ON glossary_global(is_active);

-- ============================================
-- CUSTOMER GLOSSARY (Customer-specific terms)
-- ============================================
CREATE TABLE IF NOT EXISTS glossary_customer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  customer_id TEXT NOT NULL,
  term TEXT NOT NULL,
  term_lowercase TEXT GENERATED ALWAYS AS (LOWER(term)) STORED,
  definition TEXT NOT NULL,
  category TEXT,
  aliases TEXT[] DEFAULT '{}',
  related_fields TEXT[] DEFAULT '{}',
  ai_instructions TEXT,
  
  created_by TEXT NOT NULL,
  updated_by TEXT,
  
  source TEXT DEFAULT 'admin_manual',
  confidence TEXT DEFAULT 'medium',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT true
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'glossary_customer_unique'
  ) THEN
    ALTER TABLE glossary_customer ADD CONSTRAINT glossary_customer_unique UNIQUE (customer_id, term_lowercase);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_glossary_customer_customer ON glossary_customer(customer_id);
CREATE INDEX IF NOT EXISTS idx_glossary_customer_term ON glossary_customer(term_lowercase);
CREATE INDEX IF NOT EXISTS idx_glossary_customer_active ON glossary_customer(is_active);

-- ============================================
-- LEARNING QUEUE (Pending admin review)
-- ============================================
CREATE TABLE IF NOT EXISTS glossary_learning_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  term TEXT NOT NULL,
  term_lowercase TEXT GENERATED ALWAYS AS (LOWER(term)) STORED,
  user_explanation TEXT,
  ai_interpretation TEXT,
  original_query TEXT,
  
  customer_id TEXT NOT NULL,
  customer_name TEXT,
  user_id TEXT,
  conversation_id TEXT,
  
  suggested_scope TEXT DEFAULT 'customer',
  suggested_category TEXT,
  confidence_score DECIMAL(3,2),
  
  conflicts_with_global BOOLEAN DEFAULT false,
  conflicts_with_customer BOOLEAN DEFAULT false,
  similar_existing_terms JSONB DEFAULT '[]',
  
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  created_glossary_id UUID,
  created_glossary_type TEXT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'glossary_learning_queue_valid_status'
  ) THEN
    ALTER TABLE glossary_learning_queue ADD CONSTRAINT glossary_learning_queue_valid_status 
      CHECK (status IN ('pending', 'approved_global', 'approved_customer', 'rejected', 'merged', 'duplicate'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_learning_queue_status ON glossary_learning_queue(status);
CREATE INDEX IF NOT EXISTS idx_learning_queue_customer ON glossary_learning_queue(customer_id);
CREATE INDEX IF NOT EXISTS idx_learning_queue_term ON glossary_learning_queue(term_lowercase);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS glossary_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  action TEXT NOT NULL,
  glossary_type TEXT NOT NULL,
  glossary_id UUID,
  term TEXT,
  
  user_id TEXT NOT NULL,
  user_email TEXT,
  
  old_value JSONB,
  new_value JSONB,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_glossary ON glossary_audit_log(glossary_type, glossary_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON glossary_audit_log(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE glossary_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_learning_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_audit_log ENABLE ROW LEVEL SECURITY;

-- Global glossary: Authenticated users can read active entries
DROP POLICY IF EXISTS "Authenticated users can read active global glossary" ON glossary_global;
CREATE POLICY "Authenticated users can read active global glossary"
  ON glossary_global FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can insert global glossary" ON glossary_global;
CREATE POLICY "Admins can insert global glossary"
  ON glossary_global FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update global glossary" ON glossary_global;
CREATE POLICY "Admins can update global glossary"
  ON glossary_global FOR UPDATE
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

DROP POLICY IF EXISTS "Admins can delete global glossary" ON glossary_global;
CREATE POLICY "Admins can delete global glossary"
  ON glossary_global FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.user_role = 'admin'
    )
  );

-- Customer glossary: Users can read active entries for their customer, admins can read all
DROP POLICY IF EXISTS "Users can read own customer glossary" ON glossary_customer;
CREATE POLICY "Users can read own customer glossary"
  ON glossary_customer FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.user_role = 'admin'
      )
      OR
      EXISTS (
        SELECT 1 FROM users_customers 
        WHERE users_customers.user_id = auth.uid() 
        AND users_customers.customer_id::text = glossary_customer.customer_id
      )
    )
  );

DROP POLICY IF EXISTS "Admins can insert customer glossary" ON glossary_customer;
CREATE POLICY "Admins can insert customer glossary"
  ON glossary_customer FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update customer glossary" ON glossary_customer;
CREATE POLICY "Admins can update customer glossary"
  ON glossary_customer FOR UPDATE
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

DROP POLICY IF EXISTS "Admins can delete customer glossary" ON glossary_customer;
CREATE POLICY "Admins can delete customer glossary"
  ON glossary_customer FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.user_role = 'admin'
    )
  );

-- Learning queue: Admin only
DROP POLICY IF EXISTS "Admins can read learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can read learning queue"
  ON glossary_learning_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can insert learning queue"
  ON glossary_learning_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can update learning queue"
  ON glossary_learning_queue FOR UPDATE
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

DROP POLICY IF EXISTS "Admins can delete learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can delete learning queue"
  ON glossary_learning_queue FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.user_role = 'admin'
    )
  );

-- Audit log: Admins can read, authenticated can insert
DROP POLICY IF EXISTS "Admins can read audit log" ON glossary_audit_log;
CREATE POLICY "Admins can read audit log"
  ON glossary_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert audit log" ON glossary_audit_log;
CREATE POLICY "Authenticated users can insert audit log"
  ON glossary_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- HELPER FUNCTION: Check for conflicts
-- ============================================
CREATE OR REPLACE FUNCTION check_term_conflicts(
  p_term TEXT,
  p_customer_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_global_match RECORD;
  v_customer_match RECORD;
  v_similar TEXT[];
BEGIN
  SELECT * INTO v_global_match
  FROM glossary_global
  WHERE term_lowercase = LOWER(p_term) AND is_active = true;
  
  SELECT * INTO v_customer_match
  FROM glossary_customer
  WHERE customer_id = p_customer_id 
    AND term_lowercase = LOWER(p_term) 
    AND is_active = true;
  
  SELECT ARRAY_AGG(DISTINCT term) INTO v_similar
  FROM (
    SELECT term FROM glossary_global 
    WHERE term_lowercase LIKE LOWER(LEFT(p_term, 3)) || '%' 
      AND is_active = true
    UNION
    SELECT term FROM glossary_customer 
    WHERE customer_id = p_customer_id 
      AND term_lowercase LIKE LOWER(LEFT(p_term, 3)) || '%'
      AND is_active = true
  ) t
  LIMIT 5;
  
  v_result := jsonb_build_object(
    'has_global_conflict', v_global_match IS NOT NULL,
    'global_definition', v_global_match.definition,
    'has_customer_conflict', v_customer_match IS NOT NULL,
    'customer_definition', v_customer_match.definition,
    'similar_terms', COALESCE(v_similar, ARRAY[]::TEXT[])
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;