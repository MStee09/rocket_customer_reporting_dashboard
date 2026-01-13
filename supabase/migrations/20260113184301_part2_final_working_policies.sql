/*
  # Security Fix Part 2: Final Working Policy Fixes

  Fixes duplicate policies with verified column names and SELECT wrapping optimization
*/

-- Fix ai_feedback policies
DROP POLICY IF EXISTS "Users can insert own feedback" ON ai_feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON ai_feedback;
CREATE POLICY "Users insert feedback" ON ai_feedback FOR INSERT TO authenticated 
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own feedback" ON ai_feedback;
DROP POLICY IF EXISTS "Users can read their own feedback" ON ai_feedback;
CREATE POLICY "Users read own feedback" ON ai_feedback FOR SELECT TO authenticated 
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all feedback" ON ai_feedback;
DROP POLICY IF EXISTS "Admins can read all feedback" ON ai_feedback;
CREATE POLICY "Admins read all feedback" ON ai_feedback FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'));

-- Fix ai_usage_log policies
DROP POLICY IF EXISTS "Users can view own usage" ON ai_usage_log;
CREATE POLICY "Users view own usage" ON ai_usage_log FOR SELECT TO authenticated 
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all usage" ON ai_usage_log;
CREATE POLICY "Admins view all usage" ON ai_usage_log FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'));

-- Fix widget_alerts policies (consolidate many duplicates)
DROP POLICY IF EXISTS "Customers view own widget alerts" ON widget_alerts;
DROP POLICY IF EXISTS "Customers manage own widget alerts" ON widget_alerts;
DROP POLICY IF EXISTS "Admins view all widget alerts" ON widget_alerts;
DROP POLICY IF EXISTS "Admins manage all widget alerts" ON widget_alerts;
DROP POLICY IF EXISTS "Admins can view all widget alerts" ON widget_alerts;
DROP POLICY IF EXISTS "Users can view alerts for their customer" ON widget_alerts;
DROP POLICY IF EXISTS "Admins can update widget alerts" ON widget_alerts;
DROP POLICY IF EXISTS "Users can update alerts for their customer" ON widget_alerts;

CREATE POLICY "Customers view alerts" ON widget_alerts FOR SELECT TO authenticated 
USING (
  customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin')
);

DROP POLICY IF EXISTS "Admins can insert widget alerts" ON widget_alerts;
CREATE POLICY "Admins insert alerts" ON widget_alerts FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'));

CREATE POLICY "Customers update alerts" ON widget_alerts FOR UPDATE TO authenticated 
USING (
  customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin')
);

-- Fix user_roles policy
DROP POLICY IF EXISTS "Allow authenticated users to read own role" ON user_roles;
CREATE POLICY "Users read own role" ON user_roles FOR SELECT TO authenticated 
USING (user_id = (SELECT auth.uid()));

-- Fix ai_settings policies
DROP POLICY IF EXISTS "Admins can update AI settings" ON ai_settings;
DROP POLICY IF EXISTS "Admins can update ai_settings" ON ai_settings;
DROP POLICY IF EXISTS "Admins can insert AI settings" ON ai_settings;
DROP POLICY IF EXISTS "Admins can read ai_settings" ON ai_settings;
CREATE POLICY "Admins manage AI settings" ON ai_settings FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'));

-- Fix ai_insight_log policies
DROP POLICY IF EXISTS "Admins can view insight logs" ON ai_insight_log;
DROP POLICY IF EXISTS "Admins can read all insight logs" ON ai_insight_log;
CREATE POLICY "Admins read insight logs" ON ai_insight_log FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'));

DROP POLICY IF EXISTS "Customers can read own insight logs" ON ai_insight_log;
DROP POLICY IF EXISTS "Users can read their customer insight logs" ON ai_insight_log;
CREATE POLICY "Customers read insight logs" ON ai_insight_log FOR SELECT TO authenticated 
USING (customer_id IN (SELECT customer_id::text FROM users_customers WHERE user_id = (SELECT auth.uid())));

-- Fix analytics_hub_sections policies
DROP POLICY IF EXISTS "Users can manage their analytics sections" ON analytics_hub_sections;
DROP POLICY IF EXISTS "Users can view their analytics sections" ON analytics_hub_sections;
CREATE POLICY "Users manage analytics sections" ON analytics_hub_sections FOR ALL TO authenticated 
USING (customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = (SELECT auth.uid())));

-- Fix analytics_hub_widgets policies
DROP POLICY IF EXISTS "Users can view their analytics widgets" ON analytics_hub_widgets;
DROP POLICY IF EXISTS "Users can manage their analytics widgets" ON analytics_hub_widgets;
CREATE POLICY "Users manage analytics widgets" ON analytics_hub_widgets FOR ALL TO authenticated 
USING (section_id IN (SELECT id FROM analytics_hub_sections WHERE customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = (SELECT auth.uid()))));

-- Fix pinned_reports policies
DROP POLICY IF EXISTS "Users can view their pinned reports" ON pinned_reports;
DROP POLICY IF EXISTS "Users can manage their pinned reports" ON pinned_reports;
CREATE POLICY "Users manage pinned reports" ON pinned_reports FOR ALL TO authenticated 
USING (customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = (SELECT auth.uid())));

-- Fix pulse_dashboard_config policies
DROP POLICY IF EXISTS "Users can view their pulse config" ON pulse_dashboard_config;
DROP POLICY IF EXISTS "Users can manage their pulse config" ON pulse_dashboard_config;
CREATE POLICY "Users manage pulse config" ON pulse_dashboard_config FOR ALL TO authenticated 
USING (customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = (SELECT auth.uid())));

-- Fix hub_sections policies
DROP POLICY IF EXISTS "Users can view their hub sections" ON hub_sections;
DROP POLICY IF EXISTS "Users can manage their hub sections" ON hub_sections;
CREATE POLICY "Users manage hub sections" ON hub_sections FOR ALL TO authenticated 
USING (customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = (SELECT auth.uid())));

-- Fix saved_views policies
DROP POLICY IF EXISTS "Users can delete own saved views" ON saved_views;
DROP POLICY IF EXISTS "Users can view own saved views" ON saved_views;
DROP POLICY IF EXISTS "Users can insert own saved views" ON saved_views;
DROP POLICY IF EXISTS "Users can update own saved views" ON saved_views;
CREATE POLICY "Users manage saved views" ON saved_views FOR ALL TO authenticated 
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Fix overly permissive policies
DROP POLICY IF EXISTS "System can insert runs" ON scheduled_report_runs;
DROP POLICY IF EXISTS "System can update runs" ON scheduled_report_runs;
CREATE POLICY "Admins manage runs" ON scheduled_report_runs FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'));

DROP POLICY IF EXISTS "Allow authenticated insert" ON widget_version_history;
CREATE POLICY "Admins insert version history" ON widget_version_history FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'));

-- Fix shared_reports policies (customer-based)
DROP POLICY IF EXISTS "Users can update shared reports they have access to" ON shared_reports;
DROP POLICY IF EXISTS "Users can update shares for their customer" ON shared_reports;
DROP POLICY IF EXISTS "Authenticated users can create shared reports" ON shared_reports;
DROP POLICY IF EXISTS "Users can create shares for their customer" ON shared_reports;

CREATE POLICY "Users create shares" ON shared_reports FOR INSERT TO authenticated 
WITH CHECK (customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Users update own customer shares" ON shared_reports FOR UPDATE TO authenticated 
USING (customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = (SELECT auth.uid())))
WITH CHECK (customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = (SELECT auth.uid())));