/*
  # Fix Scheduled Reports RLS Policies for Admins

  1. Problem
    - Current SELECT policy is broken - references wrong table structure
    - Admins cannot see all scheduled reports across customers
    - Customer users cannot see their own schedules properly

  2. Changes
    - Drop broken SELECT policy
    - Create admin SELECT policy (admins can view all)
    - Create customer SELECT policy using users_customers table
    - Fix UPDATE/DELETE policies to include admin access

  3. Security
    - Admins (user_role = 'admin' in user_roles) can view/manage all scheduled reports
    - Customers can only view/manage schedules for their assigned customer via users_customers
*/

-- Drop the broken SELECT policy
DROP POLICY IF EXISTS "Users can view their schedules" ON scheduled_reports;

-- Create admin SELECT policy
CREATE POLICY "Admins can view all schedules"
  ON scheduled_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Create customer SELECT policy using users_customers
CREATE POLICY "Customers can view their schedules"
  ON scheduled_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_customers
      WHERE users_customers.user_id = auth.uid()
      AND users_customers.customer_id = scheduled_reports.customer_id
    )
    OR created_by = auth.uid()
  );

-- Drop and recreate UPDATE policy to include admins
DROP POLICY IF EXISTS "Users can update their own schedules" ON scheduled_reports;

CREATE POLICY "Users can update schedules"
  ON scheduled_reports
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Drop and recreate DELETE policy to include admins
DROP POLICY IF EXISTS "Users can delete their own schedules" ON scheduled_reports;

CREATE POLICY "Users can delete schedules"
  ON scheduled_reports
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Fix INSERT policy to work properly
DROP POLICY IF EXISTS "Users can create schedules" ON scheduled_reports;

CREATE POLICY "Users can create schedules"
  ON scheduled_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM users_customers
      WHERE users_customers.user_id = auth.uid()
      AND users_customers.customer_id = scheduled_reports.customer_id
    )
  );