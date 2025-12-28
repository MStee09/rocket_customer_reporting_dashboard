/*
  # Knowledge Documents Storage Bucket

  1. New Storage Bucket
    - `knowledge-documents` - Private bucket for storing uploaded knowledge base files
    - Max file size: 10MB
    - Admin-only access

  2. Security
    - Only authenticated admins can upload/download/delete files
    - Files are stored with paths like: global/{filename} or customer/{customer_id}/{filename}
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('knowledge-documents', 'knowledge-documents', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload knowledge documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge-documents'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can view knowledge documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'knowledge-documents'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update knowledge documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'knowledge-documents'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'knowledge-documents'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can delete knowledge documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'knowledge-documents'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );