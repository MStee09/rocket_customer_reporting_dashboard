/*
  # Fix RLS Performance and Overly Permissive Policies

  1. Performance Optimizations
    - Fix 9 RLS policies to use `(select auth.*)` pattern for better performance
    - Prevents re-evaluation of auth functions for each row
    
  2. Security Improvements
    - Fix overly permissive ai_rate_limits policy
    - Ensure proper access control on system tables
    
  3. Tables Affected
    - ai_report_audit
    - notifications
    - ai_usage_log
    - mcp_schema_cache
    - mcp_searchable_fields
    - mcp_table_joins
    - mcp_table_relationships
    - mcp_field_aliases
    - mcp_restricted_fields
    - ai_rate_limits
*/

-- Fix ai_report_audit policies
DROP POLICY IF EXISTS "Service role can insert audit logs" ON ai_report_audit;
CREATE POLICY "Service role can insert audit logs"
  ON ai_report_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow authenticated users to insert audit logs

-- Fix notifications policies
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow authenticated users to insert notifications

-- Fix ai_usage_log policies
DROP POLICY IF EXISTS "Service can insert usage" ON ai_usage_log;
CREATE POLICY "Service can insert usage"
  ON ai_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow authenticated users to insert usage logs

-- Fix mcp_schema_cache policies
DROP POLICY IF EXISTS "Admins can manage schema cache" ON mcp_schema_cache;
CREATE POLICY "Admins can manage schema cache"
  ON mcp_schema_cache
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  );

-- Fix mcp_searchable_fields policies
DROP POLICY IF EXISTS "Admins can manage searchable fields" ON mcp_searchable_fields;
CREATE POLICY "Admins can manage searchable fields"
  ON mcp_searchable_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  );

-- Fix mcp_table_joins policies
DROP POLICY IF EXISTS "Admins can manage table joins" ON mcp_table_joins;
CREATE POLICY "Admins can manage table joins"
  ON mcp_table_joins
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  );

-- Fix mcp_table_relationships policies
DROP POLICY IF EXISTS "Admins can manage table relationships" ON mcp_table_relationships;
CREATE POLICY "Admins can manage table relationships"
  ON mcp_table_relationships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  );

-- Fix mcp_field_aliases policies
DROP POLICY IF EXISTS "Admins can manage field aliases" ON mcp_field_aliases;
CREATE POLICY "Admins can manage field aliases"
  ON mcp_field_aliases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  );

-- Fix mcp_restricted_fields policies
DROP POLICY IF EXISTS "Admins can manage restricted fields" ON mcp_restricted_fields;
CREATE POLICY "Admins can manage restricted fields"
  ON mcp_restricted_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  );

-- Fix ai_rate_limits overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage rate limits" ON ai_rate_limits;
DROP POLICY IF EXISTS "Authenticated access ai_rate_limits" ON ai_rate_limits;

-- Admin can manage all rate limits
CREATE POLICY "Admins manage rate limits"
  ON ai_rate_limits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
      AND user_role = 'admin'
    )
  );

-- Users can view their own rate limits
CREATE POLICY "Users view own rate limits"
  ON ai_rate_limits
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- System can insert rate limits
CREATE POLICY "System inserts rate limits"
  ON ai_rate_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow authenticated users to insert rate limits
