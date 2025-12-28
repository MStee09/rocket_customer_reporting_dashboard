/*
  # Fix Auth RLS Performance - Glossary Tables

  1. Performance Improvements
    - Wrap JWT function calls in SELECT to prevent per-row re-evaluation
    - Applies to glossary_global, glossary_customer, glossary_learning_queue, glossary_audit_log
    
  2. Changes
    - Updates all glossary table policies to use optimized auth calls
    
  3. Security
    - No permission changes, only performance optimization
*/

-- Glossary Global
DROP POLICY IF EXISTS "Admins can insert global glossary" ON glossary_global;
CREATE POLICY "Admins can insert global glossary"
  ON glossary_global FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update global glossary" ON glossary_global;
CREATE POLICY "Admins can update global glossary"
  ON glossary_global FOR UPDATE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete global glossary" ON glossary_global;
CREATE POLICY "Admins can delete global glossary"
  ON glossary_global FOR DELETE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- Glossary Customer
DROP POLICY IF EXISTS "Admins can insert customer glossary" ON glossary_customer;
CREATE POLICY "Admins can insert customer glossary"
  ON glossary_customer FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update customer glossary" ON glossary_customer;
CREATE POLICY "Admins can update customer glossary"
  ON glossary_customer FOR UPDATE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete customer glossary" ON glossary_customer;
CREATE POLICY "Admins can delete customer glossary"
  ON glossary_customer FOR DELETE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- Glossary Learning Queue
DROP POLICY IF EXISTS "Admins can read learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can read learning queue"
  ON glossary_learning_queue FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can insert learning queue"
  ON glossary_learning_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can update learning queue"
  ON glossary_learning_queue FOR UPDATE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can delete learning queue"
  ON glossary_learning_queue FOR DELETE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- Glossary Audit Log
DROP POLICY IF EXISTS "Admins can read audit log" ON glossary_audit_log;
CREATE POLICY "Admins can read audit log"
  ON glossary_audit_log FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );