/*
  # Fix Auth RLS Performance - Field Context and User Roles

  1. Performance Improvements
    - Wrap JWT function calls in SELECT to prevent per-row re-evaluation
    - Applies to field_business_context and user_roles tables
    
  2. Changes
    - Updates all policies to use optimized auth calls
    
  3. Security
    - No permission changes, only performance optimization
*/

-- Field Business Context
DROP POLICY IF EXISTS "Admins can read all field context" ON field_business_context;
CREATE POLICY "Admins can read all field context"
  ON field_business_context FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert field context" ON field_business_context;
CREATE POLICY "Admins can insert field context"
  ON field_business_context FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update field context" ON field_business_context;
CREATE POLICY "Admins can update field context"
  ON field_business_context FOR UPDATE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete field context" ON field_business_context;
CREATE POLICY "Admins can delete field context"
  ON field_business_context FOR DELETE
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );

-- User Roles
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
CREATE POLICY "Admins can read all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (select auth.uid())
        AND ur.user_role = 'admin'::user_role
    )
  );