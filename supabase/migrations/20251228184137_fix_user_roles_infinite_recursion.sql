/*
  # Fix User Roles Infinite Recursion

  1. Problem
    - The "Admins can read all roles" policy queries user_roles to check admin status
    - This causes infinite recursion since the policy triggers itself
    
  2. Solution
    - Use JWT claims directly instead of querying user_roles table
    - This avoids the self-referential query
    
  3. Security
    - Maintains same access control, just uses different check mechanism
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;

-- Recreate using JWT claims (no self-reference)
CREATE POLICY "Admins can read all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    (SELECT (current_setting('request.jwt.claims', true)::json->>'user_role')) = 'admin'
  );