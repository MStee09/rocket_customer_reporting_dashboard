/*
  # Fix Remaining Auth Policy for Shared Reports

  1. Changes
    - Fix "Authenticated users can create shared reports" policy
    - Wrap auth.uid() with SELECT to avoid re-evaluation per row

  2. Notes
    - This is a cleanup for a policy that was missed in previous optimization passes
*/

-- Drop and recreate the "Authenticated users can create shared reports" policy
DROP POLICY IF EXISTS "Authenticated users can create shared reports" ON shared_reports;

CREATE POLICY "Authenticated users can create shared reports"
  ON shared_reports
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);
