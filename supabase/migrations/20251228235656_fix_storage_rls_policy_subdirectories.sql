/*
  # Fix Storage RLS Policy for Subdirectories

  1. Problem
    - The "Users can read own customer reports" policy used split_part(name, '.', 1)
    - For files in subdirectories like "4586648/ai-reports/report.json", this returns
      "4586648/ai-reports/report" which cannot be cast to integer
    - This caused customers/admins to not see reports stored in subdirectories

  2. Fix
    - Change to split_part(name, '/', 1) to correctly extract customer ID from path
    - This works for both root files (4586648.json) and subdirectory files (4586648/ai-reports/x.json)

  3. Impact
    - AI reports, custom reports in subdirectories will now be visible
    - Admin viewing as customer will see correct reports
*/

DROP POLICY IF EXISTS "Users can read own customer reports" ON storage.objects;

CREATE POLICY "Users can read own customer reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-reports'
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
    OR (
      split_part(name, '/', 1)::integer IN (
        SELECT users_customers.customer_id
        FROM users_customers
        WHERE users_customers.user_id = auth.uid()
      )
    )
  )
);
