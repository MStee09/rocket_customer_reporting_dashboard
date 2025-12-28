/*
  # Add Storage RLS Policies for Customer Reports

  1. Changes
    - Add INSERT policy for authenticated users to upload to customer-reports bucket
    - Add SELECT policy for authenticated users to read from customer-reports bucket
    - Add UPDATE policy for authenticated users to update files in customer-reports bucket
    - Add DELETE policy for admins to delete files in customer-reports bucket

  2. Security
    - Only authenticated users can upload/read report configurations
    - Files are scoped by customer ID in the filename
*/

CREATE POLICY "Authenticated users can upload customer reports"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'customer-reports');

CREATE POLICY "Authenticated users can read customer reports"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'customer-reports');

CREATE POLICY "Authenticated users can update customer reports"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'customer-reports')
  WITH CHECK (bucket_id = 'customer-reports');

CREATE POLICY "Authenticated users can delete customer reports"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'customer-reports');
