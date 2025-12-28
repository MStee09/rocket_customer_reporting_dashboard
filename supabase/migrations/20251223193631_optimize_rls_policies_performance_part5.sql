/*
  # Optimize RLS Policies for Performance (Part 5)

  1. Changes
    - Optimize field_business_context policies
    - Optimize glossary system policies (global, customer, learning_queue, audit_log)
    - Use SELECT wrappers for auth.uid() and current_setting()

  2. Notes
    - Improves query performance at scale
    - Policies are dropped and recreated with optimized versions
*/

-- Optimize field_business_context policies
DROP POLICY IF EXISTS "Admins can read all field context" ON field_business_context;
CREATE POLICY "Admins can read all field context"
  ON field_business_context
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Non-admins can read visible fields only" ON field_business_context;
CREATE POLICY "Non-admins can read visible fields only"
  ON field_business_context
  FOR SELECT
  TO authenticated
  USING (is_visible_to_customers = true);

DROP POLICY IF EXISTS "Admins can insert field context" ON field_business_context;
CREATE POLICY "Admins can insert field context"
  ON field_business_context
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can update field context" ON field_business_context;
CREATE POLICY "Admins can update field context"
  ON field_business_context
  FOR UPDATE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin')
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete field context" ON field_business_context;
CREATE POLICY "Admins can delete field context"
  ON field_business_context
  FOR DELETE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

-- Optimize glossary_global policies
DROP POLICY IF EXISTS "Admins can insert global glossary" ON glossary_global;
CREATE POLICY "Admins can insert global glossary"
  ON glossary_global
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can update global glossary" ON glossary_global;
CREATE POLICY "Admins can update global glossary"
  ON glossary_global
  FOR UPDATE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin')
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete global glossary" ON glossary_global;
CREATE POLICY "Admins can delete global glossary"
  ON glossary_global
  FOR DELETE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

-- Optimize glossary_customer policies
DROP POLICY IF EXISTS "Users can read own customer glossary" ON glossary_customer;
CREATE POLICY "Users can read own customer glossary"
  ON glossary_customer
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert customer glossary" ON glossary_customer;
CREATE POLICY "Admins can insert customer glossary"
  ON glossary_customer
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can update customer glossary" ON glossary_customer;
CREATE POLICY "Admins can update customer glossary"
  ON glossary_customer
  FOR UPDATE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin')
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete customer glossary" ON glossary_customer;
CREATE POLICY "Admins can delete customer glossary"
  ON glossary_customer
  FOR DELETE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

-- Optimize glossary_learning_queue policies
DROP POLICY IF EXISTS "Admins can read learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can read learning queue"
  ON glossary_learning_queue
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can insert learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can insert learning queue"
  ON glossary_learning_queue
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can update learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can update learning queue"
  ON glossary_learning_queue
  FOR UPDATE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin')
  WITH CHECK ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can delete learning queue"
  ON glossary_learning_queue
  FOR DELETE
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

-- Optimize glossary_audit_log policies
DROP POLICY IF EXISTS "Admins can read audit log" ON glossary_audit_log;
CREATE POLICY "Admins can read audit log"
  ON glossary_audit_log
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Authenticated users can insert audit log" ON glossary_audit_log;
CREATE POLICY "Authenticated users can insert audit log"
  ON glossary_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);
