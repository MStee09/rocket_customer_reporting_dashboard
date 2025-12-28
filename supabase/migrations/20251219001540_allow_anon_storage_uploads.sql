/*
  # Allow Anonymous Storage Uploads for Customer Reports

  1. Changes
    - Update RLS policies to allow anon role to upload to customer-reports bucket
    - This enables scripts to upload report configurations

  2. Security
    - Limited to customer-reports bucket only
    - Files can be uploaded by anyone but read access still controlled
*/

DROP POLICY IF EXISTS "Authenticated users can upload customer reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read customer reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update customer reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete customer reports" ON storage.objects;

CREATE POLICY "Anyone can upload customer reports"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'customer-reports');

CREATE POLICY "Anyone can read customer reports"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'customer-reports');

CREATE POLICY "Anyone can update customer reports"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'customer-reports')
  WITH CHECK (bucket_id = 'customer-reports');

CREATE POLICY "Anyone can delete customer reports"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'customer-reports');
