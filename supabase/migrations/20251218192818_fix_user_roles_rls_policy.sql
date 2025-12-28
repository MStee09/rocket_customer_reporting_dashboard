/*
  # Fix user_roles RLS policy

  1. Changes
    - Drop the supabase_auth_admin policy
    - Add policy allowing authenticated users to read their own role
    - Add policy allowing admins to read all roles
    
  2. Security
    - Users can only read their own role
    - Admins can read all roles
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow auth admin to read user roles" ON user_roles;

-- Allow users to read their own role
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to read all roles (for user management page)
CREATE POLICY "Admins can read all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');
