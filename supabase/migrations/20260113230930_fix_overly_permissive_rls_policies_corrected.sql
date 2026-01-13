/*
  # Fix Overly Permissive RLS Policies (Corrected)

  This migration fixes RLS policies that allow unrestricted access (always true).
  These policies effectively bypass row-level security and need to be more restrictive.

  ## Changes:
  1. MCP tables - Restrict to authenticated users only (appropriate for metadata tables)
  2. ai_rate_limits - Keep permissive for rate limiting to work across all users
  3. ai_report_audit - Restrict to service role or admins
  4. ai_usage_log - Restrict service inserts to actual service operations
  5. notifications - Restrict system inserts to appropriate operations
*/

-- Drop and recreate overly permissive policies with proper restrictions

-- ai_rate_limits: This table needs to be accessible for rate limiting
-- Keep permissive but document that it's intentional
DROP POLICY IF EXISTS "Authenticated access ai_rate_limits" ON public.ai_rate_limits;
DROP POLICY IF EXISTS "Authenticated users can manage rate limits" ON public.ai_rate_limits;
CREATE POLICY "Authenticated users can manage rate limits"
  ON public.ai_rate_limits
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ai_report_audit: Only service role should insert audit logs
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.ai_report_audit;
CREATE POLICY "Service role can insert audit logs"
  ON public.ai_report_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- ai_usage_log: Only service should insert usage logs
DROP POLICY IF EXISTS "Service can insert usage" ON public.ai_usage_log;
CREATE POLICY "Service can insert usage"
  ON public.ai_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    user_id = auth.uid()
  );

-- mcp_field_aliases: Authenticated read, admin write
DROP POLICY IF EXISTS "Authenticated access mcp_field_aliases" ON public.mcp_field_aliases;
DROP POLICY IF EXISTS "Authenticated can read field aliases" ON public.mcp_field_aliases;
DROP POLICY IF EXISTS "Admins can manage field aliases" ON public.mcp_field_aliases;

CREATE POLICY "Authenticated can read field aliases"
  ON public.mcp_field_aliases
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage field aliases"
  ON public.mcp_field_aliases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- mcp_restricted_fields: Authenticated read, admin write
DROP POLICY IF EXISTS "Authenticated access mcp_restricted_fields" ON public.mcp_restricted_fields;
DROP POLICY IF EXISTS "Authenticated can read restricted fields" ON public.mcp_restricted_fields;
DROP POLICY IF EXISTS "Admins can manage restricted fields" ON public.mcp_restricted_fields;

CREATE POLICY "Authenticated can read restricted fields"
  ON public.mcp_restricted_fields
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage restricted fields"
  ON public.mcp_restricted_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- mcp_schema_cache: Authenticated read, admin write
DROP POLICY IF EXISTS "Authenticated access mcp_schema_cache" ON public.mcp_schema_cache;
DROP POLICY IF EXISTS "Authenticated can read schema cache" ON public.mcp_schema_cache;
DROP POLICY IF EXISTS "Admins can manage schema cache" ON public.mcp_schema_cache;

CREATE POLICY "Authenticated can read schema cache"
  ON public.mcp_schema_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage schema cache"
  ON public.mcp_schema_cache
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- mcp_searchable_fields: Authenticated read, admin write
DROP POLICY IF EXISTS "Authenticated access mcp_searchable_fields" ON public.mcp_searchable_fields;
DROP POLICY IF EXISTS "Authenticated can read searchable fields" ON public.mcp_searchable_fields;
DROP POLICY IF EXISTS "Admins can manage searchable fields" ON public.mcp_searchable_fields;

CREATE POLICY "Authenticated can read searchable fields"
  ON public.mcp_searchable_fields
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage searchable fields"
  ON public.mcp_searchable_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- mcp_table_joins: Authenticated read, admin write
DROP POLICY IF EXISTS "Authenticated access mcp_table_joins" ON public.mcp_table_joins;
DROP POLICY IF EXISTS "Authenticated can read table joins" ON public.mcp_table_joins;
DROP POLICY IF EXISTS "Admins can manage table joins" ON public.mcp_table_joins;

CREATE POLICY "Authenticated can read table joins"
  ON public.mcp_table_joins
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage table joins"
  ON public.mcp_table_joins
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- mcp_table_relationships: Authenticated read, admin write
DROP POLICY IF EXISTS "Authenticated access mcp_table_relationships" ON public.mcp_table_relationships;
DROP POLICY IF EXISTS "Authenticated can read table relationships" ON public.mcp_table_relationships;
DROP POLICY IF EXISTS "Admins can manage table relationships" ON public.mcp_table_relationships;

CREATE POLICY "Authenticated can read table relationships"
  ON public.mcp_table_relationships
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage table relationships"
  ON public.mcp_table_relationships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- notifications: System can create for valid operations
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    user_id = auth.uid()
  );