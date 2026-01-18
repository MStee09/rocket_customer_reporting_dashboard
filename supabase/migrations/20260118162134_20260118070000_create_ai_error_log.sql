/*
  # AI Error Logging System
  
  Creates infrastructure to capture, categorize, and fix AI-related errors.
  
  ## Tables
  1. ai_error_log - Stores all AI errors with classification
  
  ## Error Types
  - schema_error: Missing table, field, or join path
  - query_error: SQL execution failed
  - unknown_term: User asked about something AI doesn't know
  - tool_error: MCP tool failed
  - timeout_error: Request took too long
  - other: Uncategorized errors
  
  ## Admin Actions
  - View errors by type, frequency, recency
  - Apply fixes (create knowledge items, add join paths)
  - Dismiss false positives
  - Track resolution status
*/

-- ============================================================================
-- Create ai_error_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Error classification
  error_type TEXT NOT NULL CHECK (error_type IN (
    'schema_error',    -- Missing table, field, or join
    'query_error',     -- SQL execution failed
    'unknown_term',    -- User asked about unknown concept
    'tool_error',      -- MCP tool failed
    'timeout_error',   -- Request took too long
    'other'            -- Uncategorized
  )),
  error_subtype TEXT,  -- e.g., 'missing_join', 'unknown_table', 'unknown_field'
  
  -- Error details
  error_message TEXT NOT NULL,
  error_details JSONB DEFAULT '{}',  -- Full error context
  
  -- Context
  customer_id INTEGER REFERENCES customer(customer_id),
  user_id UUID,
  question TEXT,  -- The user's original question
  tool_name TEXT,  -- Which MCP tool failed (if applicable)
  tool_input JSONB,  -- What was passed to the tool
  
  -- Suggested fix
  suggested_fix_type TEXT,  -- 'create_knowledge', 'add_join', 'add_field', etc.
  suggested_fix_details JSONB,  -- Details for the fix
  
  -- Tracking
  occurrence_count INTEGER DEFAULT 1,
  first_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  last_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Resolution
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'fixed', 'dismissed', 'wont_fix')),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for efficient querying
-- ============================================================================

CREATE INDEX idx_ai_error_log_type ON ai_error_log(error_type);
CREATE INDEX idx_ai_error_log_status ON ai_error_log(status);
CREATE INDEX idx_ai_error_log_customer ON ai_error_log(customer_id);
CREATE INDEX idx_ai_error_log_last_occurred ON ai_error_log(last_occurred_at DESC);
CREATE INDEX idx_ai_error_log_occurrence_count ON ai_error_log(occurrence_count DESC);
CREATE INDEX idx_ai_error_log_new ON ai_error_log(status) WHERE status = 'new';

-- Composite index for finding duplicate errors
CREATE INDEX idx_ai_error_log_dedup ON ai_error_log(error_type, error_message, customer_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE ai_error_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all errors
CREATE POLICY "Admins can view all errors"
  ON ai_error_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Admins can update errors (resolve, dismiss)
CREATE POLICY "Admins can update errors"
  ON ai_error_log
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Service role can insert errors (from edge functions)
CREATE POLICY "Service role can insert errors"
  ON ai_error_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow authenticated users to insert (edge functions use service key)
CREATE POLICY "Authenticated can insert errors"
  ON ai_error_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- Function to log an error (with deduplication)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_ai_error(
  p_error_type TEXT,
  p_error_subtype TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT '',
  p_error_details JSONB DEFAULT '{}',
  p_customer_id INTEGER DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_question TEXT DEFAULT NULL,
  p_tool_name TEXT DEFAULT NULL,
  p_tool_input JSONB DEFAULT NULL,
  p_suggested_fix_type TEXT DEFAULT NULL,
  p_suggested_fix_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
BEGIN
  -- Check for existing similar error (deduplication)
  SELECT id INTO v_existing_id
  FROM ai_error_log
  WHERE error_type = p_error_type
    AND error_message = p_error_message
    AND COALESCE(customer_id, -1) = COALESCE(p_customer_id, -1)
    AND status IN ('new', 'reviewing')
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    -- Update existing error
    UPDATE ai_error_log
    SET occurrence_count = occurrence_count + 1,
        last_occurred_at = NOW(),
        updated_at = NOW(),
        -- Update details if provided
        error_details = COALESCE(p_error_details, error_details),
        tool_input = COALESCE(p_tool_input, tool_input)
    WHERE id = v_existing_id;
    
    RETURN v_existing_id;
  ELSE
    -- Insert new error
    INSERT INTO ai_error_log (
      error_type,
      error_subtype,
      error_message,
      error_details,
      customer_id,
      user_id,
      question,
      tool_name,
      tool_input,
      suggested_fix_type,
      suggested_fix_details
    ) VALUES (
      p_error_type,
      p_error_subtype,
      p_error_message,
      p_error_details,
      p_customer_id,
      p_user_id,
      p_question,
      p_tool_name,
      p_tool_input,
      p_suggested_fix_type,
      p_suggested_fix_details
    )
    RETURNING id INTO v_new_id;
    
    RETURN v_new_id;
  END IF;
END;
$$;

-- ============================================================================
-- Function to get error summary for admin dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ai_error_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_new', (SELECT COUNT(*) FROM ai_error_log WHERE status = 'new'),
    'total_reviewing', (SELECT COUNT(*) FROM ai_error_log WHERE status = 'reviewing'),
    'total_fixed', (SELECT COUNT(*) FROM ai_error_log WHERE status = 'fixed'),
    'total_dismissed', (SELECT COUNT(*) FROM ai_error_log WHERE status IN ('dismissed', 'wont_fix')),
    'by_type', (
      SELECT COALESCE(jsonb_object_agg(error_type, cnt), '{}'::jsonb)
      FROM (
        SELECT error_type, COUNT(*) as cnt
        FROM ai_error_log
        WHERE status = 'new'
        GROUP BY error_type
      ) t
    ),
    'top_errors', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT 
          id,
          error_type,
          error_subtype,
          error_message,
          occurrence_count,
          last_occurred_at,
          question,
          suggested_fix_type
        FROM ai_error_log
        WHERE status = 'new'
        ORDER BY occurrence_count DESC, last_occurred_at DESC
        LIMIT 10
      ) t
    ),
    'recent_errors', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT 
          id,
          error_type,
          error_subtype,
          error_message,
          occurrence_count,
          last_occurred_at,
          question,
          customer_id
        FROM ai_error_log
        WHERE status = 'new'
        ORDER BY last_occurred_at DESC
        LIMIT 10
      ) t
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- Function to resolve an error
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_ai_error(
  p_error_id UUID,
  p_status TEXT,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_error_log
  SET status = p_status,
      resolved_by = auth.uid(),
      resolved_at = NOW(),
      resolution_notes = p_resolution_notes,
      updated_at = NOW()
  WHERE id = p_error_id;
  
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION log_ai_error TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_ai_error_summary TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_ai_error TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE ai_error_log IS 'Captures AI-related errors for admin review and resolution';
COMMENT ON FUNCTION log_ai_error IS 'Log an AI error with automatic deduplication';
COMMENT ON FUNCTION get_ai_error_summary IS 'Get summary of errors for admin dashboard';
COMMENT ON FUNCTION resolve_ai_error IS 'Mark an error as fixed, dismissed, or wont_fix';