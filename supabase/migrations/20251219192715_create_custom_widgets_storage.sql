/*
  # Create custom-widgets storage bucket

  1. New Bucket
    - `custom-widgets` bucket for storing custom widget definitions
    - Organized structure:
      - admin/ - admin-created widgets
      - customer/{customer_id}/ - customer-specific widgets (future)

  2. Security
    - Enable RLS on storage.objects
    - Admins can manage all custom widgets
    - Authenticated users can read admin widgets
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custom-widgets',
  'custom-widgets',
  false,
  1048576,
  ARRAY['application/json']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can manage all custom widgets"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'custom-widgets' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'custom-widgets' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can read admin widgets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'custom-widgets' AND
    name LIKE 'admin/%'
  );
