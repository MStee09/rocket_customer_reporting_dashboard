/*
  # Fix user_roles RLS Policy
  
  1. Problem
    - Users cannot read their own role from user_roles table
    - This prevents admin detection in the frontend
    
  2. Solution
    - Drop existing policies and create simpler, more reliable ones
    - Ensure authenticated users can always read their own role
    
  3. Security
    - Users can only read their own role row
    - Admins can read all roles (checked via direct table lookup, not JWT)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;

-- Create a simple policy that lets users read their own role
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create admin policy that checks the user_roles table directly
-- This avoids JWT claim issues
CREATE POLICY "Admins can read all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.user_role = 'admin'
    )
  );