/*
  # Create Dashboard Layouts Storage Bucket

  1. Storage Bucket
    - Create `dashboard-layouts` bucket for storing dashboard configurations
    - Public: false (only authenticated users can access)

  2. Security Policies
    - Authenticated users can read and write their own customer's dashboard layout
    - Admins can read and write all dashboard layouts
    - Layout files are stored as: dashboard-layouts/{customer_id}.json

  3. Notes
    - Layouts are stored as JSON files per customer
    - Each customer has one JSON file containing their dashboard layout and hidden widgets
    - Admin users (from user_roles table) have full access
    - Customers can customize their own dashboards
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('dashboard-layouts', 'dashboard-layouts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own customer dashboard layouts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dashboard-layouts'
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
    OR
    split_part(name, '.', 1)::integer IN (
      SELECT customer_id FROM users_customers
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can upload own customer dashboard layouts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dashboard-layouts'
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
    OR
    split_part(name, '.', 1)::integer IN (
      SELECT customer_id FROM users_customers
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update own customer dashboard layouts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dashboard-layouts'
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
    OR
    split_part(name, '.', 1)::integer IN (
      SELECT customer_id FROM users_customers
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'dashboard-layouts'
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
    OR
    split_part(name, '.', 1)::integer IN (
      SELECT customer_id FROM users_customers
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete own customer dashboard layouts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dashboard-layouts'
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
    OR
    split_part(name, '.', 1)::integer IN (
      SELECT customer_id FROM users_customers
      WHERE user_id = auth.uid()
    )
  )
);
