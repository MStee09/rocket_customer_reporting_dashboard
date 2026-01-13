/*
  # Fix RLS Policy Performance - Wrap auth functions with SELECT

  This migration optimizes RLS policies by wrapping auth.<function>() calls with 
  (select auth.<function>()) to prevent re-evaluation for each row.

  ## Tables affected:
  1. customer_ai_settings - 4 admin policies
  2. knowledge_embeddings - 1 user policy
  3. detected_anomalies - 2 user policies
  4. customer_intelligence_profiles - 4 admin policies
  5. conversation_summaries - 1 user policy
  6. customer_intelligence_history - 2 admin policies
  7. alert_widget_mapping - 1 admin policy
  8. ai_learning_notifications - 4 admin policies
  9. schema_change_log - 2 admin policies
  10. customer_health_scores - 4 admin policies
  11. customer_health_history - 2 admin policies
  12. customer_health_alerts - 4 admin policies
  13. ai_settings_history - 2 admin policies
  14. reports - 5 policies
  15. ai_corrections - 1 admin policy
  16. ai_feedback - 1 admin policy
  17. widget_instances - 2 policies

  ## Security:
  - No change to security model, only performance optimization
  - All policies maintain same access control logic
*/

-- =====================================================
-- 1. customer_ai_settings
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all customer AI settings" ON public.customer_ai_settings;
DROP POLICY IF EXISTS "Admins can insert customer AI settings" ON public.customer_ai_settings;
DROP POLICY IF EXISTS "Admins can update customer AI settings" ON public.customer_ai_settings;
DROP POLICY IF EXISTS "Admins can delete customer AI settings" ON public.customer_ai_settings;

CREATE POLICY "Admins can view all customer AI settings"
  ON public.customer_ai_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can insert customer AI settings"
  ON public.customer_ai_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can update customer AI settings"
  ON public.customer_ai_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can delete customer AI settings"
  ON public.customer_ai_settings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 2. knowledge_embeddings (customer_id is TEXT)
-- =====================================================
DROP POLICY IF EXISTS "Users can read embeddings for their customers" ON public.knowledge_embeddings;

CREATE POLICY "Users can read embeddings for their customers"
  ON public.knowledge_embeddings FOR SELECT TO authenticated
  USING (
    customer_id IS NULL
    OR customer_id::integer IN (
      SELECT uc.customer_id FROM public.users_customers uc
      WHERE uc.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 3. detected_anomalies (customer_id is TEXT)
-- =====================================================
DROP POLICY IF EXISTS "Users can read their anomalies" ON public.detected_anomalies;
DROP POLICY IF EXISTS "Users can update their anomalies" ON public.detected_anomalies;

CREATE POLICY "Users can read their anomalies"
  ON public.detected_anomalies FOR SELECT TO authenticated
  USING (
    customer_id::integer IN (
      SELECT uc.customer_id FROM public.users_customers uc
      WHERE uc.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Users can update their anomalies"
  ON public.detected_anomalies FOR UPDATE TO authenticated
  USING (
    customer_id::integer IN (
      SELECT uc.customer_id FROM public.users_customers uc
      WHERE uc.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  )
  WITH CHECK (
    customer_id::integer IN (
      SELECT uc.customer_id FROM public.users_customers uc
      WHERE uc.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 4. customer_intelligence_profiles
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all intelligence profiles" ON public.customer_intelligence_profiles;
DROP POLICY IF EXISTS "Admins can insert intelligence profiles" ON public.customer_intelligence_profiles;
DROP POLICY IF EXISTS "Admins can update intelligence profiles" ON public.customer_intelligence_profiles;
DROP POLICY IF EXISTS "Admins can delete intelligence profiles" ON public.customer_intelligence_profiles;

CREATE POLICY "Admins can view all intelligence profiles"
  ON public.customer_intelligence_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can insert intelligence profiles"
  ON public.customer_intelligence_profiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can update intelligence profiles"
  ON public.customer_intelligence_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can delete intelligence profiles"
  ON public.customer_intelligence_profiles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 5. conversation_summaries
-- =====================================================
DROP POLICY IF EXISTS "Users can view their summaries" ON public.conversation_summaries;

CREATE POLICY "Users can view their summaries"
  ON public.conversation_summaries FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 6. customer_intelligence_history
-- =====================================================
DROP POLICY IF EXISTS "Admins can view intelligence history" ON public.customer_intelligence_history;
DROP POLICY IF EXISTS "Admins can insert intelligence history" ON public.customer_intelligence_history;

CREATE POLICY "Admins can view intelligence history"
  ON public.customer_intelligence_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can insert intelligence history"
  ON public.customer_intelligence_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 7. alert_widget_mapping
-- =====================================================
DROP POLICY IF EXISTS "Admins manage alert mappings" ON public.alert_widget_mapping;

CREATE POLICY "Admins manage alert mappings"
  ON public.alert_widget_mapping FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 8. ai_learning_notifications
-- =====================================================
DROP POLICY IF EXISTS "Admins can view learning notifications" ON public.ai_learning_notifications;
DROP POLICY IF EXISTS "Admins can insert learning notifications" ON public.ai_learning_notifications;
DROP POLICY IF EXISTS "Admins can update learning notifications" ON public.ai_learning_notifications;
DROP POLICY IF EXISTS "Admins can delete learning notifications" ON public.ai_learning_notifications;

CREATE POLICY "Admins can view learning notifications"
  ON public.ai_learning_notifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can insert learning notifications"
  ON public.ai_learning_notifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can update learning notifications"
  ON public.ai_learning_notifications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can delete learning notifications"
  ON public.ai_learning_notifications FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 9. schema_change_log
-- =====================================================
DROP POLICY IF EXISTS "Admins can view schema changes" ON public.schema_change_log;
DROP POLICY IF EXISTS "Admins can manage schema changes" ON public.schema_change_log;

CREATE POLICY "Admins can view schema changes"
  ON public.schema_change_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can manage schema changes"
  ON public.schema_change_log FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 10. customer_health_scores
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all health scores" ON public.customer_health_scores;
DROP POLICY IF EXISTS "Admins can insert health scores" ON public.customer_health_scores;
DROP POLICY IF EXISTS "Admins can update health scores" ON public.customer_health_scores;
DROP POLICY IF EXISTS "Admins can delete health scores" ON public.customer_health_scores;

CREATE POLICY "Admins can view all health scores"
  ON public.customer_health_scores FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can insert health scores"
  ON public.customer_health_scores FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can update health scores"
  ON public.customer_health_scores FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can delete health scores"
  ON public.customer_health_scores FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 11. customer_health_history
-- =====================================================
DROP POLICY IF EXISTS "Admins can view health history" ON public.customer_health_history;
DROP POLICY IF EXISTS "Admins can insert health history" ON public.customer_health_history;

CREATE POLICY "Admins can view health history"
  ON public.customer_health_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can insert health history"
  ON public.customer_health_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 12. customer_health_alerts
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all alerts" ON public.customer_health_alerts;
DROP POLICY IF EXISTS "Admins can insert alerts" ON public.customer_health_alerts;
DROP POLICY IF EXISTS "Admins can update alerts" ON public.customer_health_alerts;
DROP POLICY IF EXISTS "Admins can delete alerts" ON public.customer_health_alerts;

CREATE POLICY "Admins can view all alerts"
  ON public.customer_health_alerts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can insert alerts"
  ON public.customer_health_alerts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can update alerts"
  ON public.customer_health_alerts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can delete alerts"
  ON public.customer_health_alerts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 13. ai_settings_history
-- =====================================================
DROP POLICY IF EXISTS "Admins can read ai_settings_history" ON public.ai_settings_history;
DROP POLICY IF EXISTS "Admins can insert ai_settings_history" ON public.ai_settings_history;

CREATE POLICY "Admins can read ai_settings_history"
  ON public.ai_settings_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can insert ai_settings_history"
  ON public.ai_settings_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 14. reports - use owner_id and auth.jwt() for customer_id
-- =====================================================
DROP POLICY IF EXISTS "customers_select_saved_reports" ON public.reports;
DROP POLICY IF EXISTS "customers_insert_reports" ON public.reports;
DROP POLICY IF EXISTS "customers_update_own_reports" ON public.reports;
DROP POLICY IF EXISTS "customers_delete_own_reports" ON public.reports;
DROP POLICY IF EXISTS "admins_full_access_reports" ON public.reports;

CREATE POLICY "customers_select_saved_reports"
  ON public.reports FOR SELECT TO authenticated
  USING (
    visibility = 'saved' 
    AND customer_id = ((select auth.jwt()) ->> 'customer_id')::uuid
  );

CREATE POLICY "customers_insert_reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (
    visibility = 'saved' 
    AND owner_id = (select auth.uid()) 
    AND customer_id = ((select auth.jwt()) ->> 'customer_id')::uuid
  );

CREATE POLICY "customers_update_own_reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (
    owner_id = (select auth.uid())
  )
  WITH CHECK (
    owner_id = (select auth.uid())
  );

CREATE POLICY "customers_delete_own_reports"
  ON public.reports FOR DELETE TO authenticated
  USING (
    owner_id = (select auth.uid())
  );

CREATE POLICY "admins_full_access_reports"
  ON public.reports FOR ALL TO authenticated
  USING (
    ((select auth.jwt()) ->> 'role') = 'admin'
  )
  WITH CHECK (
    ((select auth.jwt()) ->> 'role') = 'admin'
  );

-- =====================================================
-- 15. ai_corrections
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage corrections" ON public.ai_corrections;

CREATE POLICY "Admins can manage corrections"
  ON public.ai_corrections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 16. ai_feedback
-- =====================================================
DROP POLICY IF EXISTS "Admins can delete feedback" ON public.ai_feedback;

CREATE POLICY "Admins can delete feedback"
  ON public.ai_feedback FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

-- =====================================================
-- 17. widget_instances
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage widget instances" ON public.widget_instances;
DROP POLICY IF EXISTS "Users can view applicable widget instances" ON public.widget_instances;

CREATE POLICY "Admins can manage widget instances"
  ON public.widget_instances FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
      AND user_roles.user_role = 'admin'::user_role
    )
  );

CREATE POLICY "Users can view applicable widget instances"
  ON public.widget_instances FOR SELECT TO authenticated
  USING (
    scope = 'global'
    OR (scope = 'customer' AND customer_id IN (
      SELECT uc.customer_id FROM public.users_customers uc
      WHERE uc.user_id = (select auth.uid())
    ))
  );