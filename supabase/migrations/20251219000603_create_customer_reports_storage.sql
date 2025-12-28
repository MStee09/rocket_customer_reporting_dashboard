/*
  # Create Customer Reports Storage Bucket

  1. Storage Bucket
    - Create `customer-reports` bucket for storing report configurations
    - Public: false (only authenticated users can access)

  2. Security Policies
    - Authenticated users can read their own customer's reports
    - Admins can read and write all customer reports
    - Report files are stored as: customer-reports/{customer_id}.json

  3. Notes
    - Reports are stored as JSON files per customer
    - Each customer has one JSON file containing all their reports
    - Admin users (from user_roles table) have full access
*/

-- Create the customer-reports storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-reports', 'customer-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to read their own customer's reports
CREATE POLICY "Users can read own customer reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-reports'
  AND (
    -- Admins can read all reports
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
    OR
    -- Customers can read their own reports
    -- File path format: {customer_id}.json
    (
      split_part(name, '.', 1)::integer IN (
        SELECT customer_id FROM users_customers
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Policy: Allow admins to insert/upload reports
CREATE POLICY "Admins can upload customer reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-reports'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
);

-- Policy: Allow admins to update reports
CREATE POLICY "Admins can update customer reports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'customer-reports'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'customer-reports'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
);

-- Policy: Allow admins to delete reports
CREATE POLICY "Admins can delete customer reports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'customer-reports'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.user_role = 'admin'
  )
);
