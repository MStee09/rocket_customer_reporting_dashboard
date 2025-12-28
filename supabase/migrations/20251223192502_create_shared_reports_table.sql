/*
  # Create Shared Reports Table

  1. New Tables
    - `shared_reports`
      - `id` (uuid, primary key)
      - `share_token` (text, unique) - URL-safe token for public access
      - `customer_id` (int, foreign key) - Customer who owns the report
      - `report_id` (uuid) - ID of the AI report being shared
      - `report_name` (text) - Cached report name for quick display
      - `report_definition` (jsonb) - Cached report definition to avoid joins
      - `is_active` (boolean) - Whether the link is active
      - `expires_at` (timestamptz, nullable) - When the link expires
      - `view_count` (int) - Number of times the report was viewed
      - `created_by` (uuid, foreign key) - User who created the share
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `shared_reports` table
    - Add policies for authenticated users to create/manage their own shares
    - No RLS needed for public viewing (handled by share_token validation in app)

  3. Indexes
    - Index on share_token for fast lookup
    - Index on report_id for management queries

  4. Notes
    - The share_token allows unauthenticated public access
    - Expired or inactive reports return 404 to the public
    - View count is incremented each time the report is accessed
*/

-- Create shared_reports table
CREATE TABLE IF NOT EXISTS shared_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token text UNIQUE NOT NULL,
  customer_id int NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  report_id uuid NOT NULL,
  report_name text NOT NULL,
  report_definition jsonb NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  view_count int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_reports_share_token ON shared_reports(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_reports_report_id ON shared_reports(report_id);
CREATE INDEX IF NOT EXISTS idx_shared_reports_customer_id ON shared_reports(customer_id);

-- Enable RLS
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view shares for their customer
CREATE POLICY "Users can view shares for their customer"
  ON shared_reports
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Policy: Authenticated users can create shares for their customer
CREATE POLICY "Users can create shares for their customer"
  ON shared_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update shares for their customer
CREATE POLICY "Users can update shares for their customer"
  ON shared_reports
  FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete shares for their customer
CREATE POLICY "Users can delete shares for their customer"
  ON shared_reports
  FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Function to generate unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate a random 16-character token
    new_token := encode(gen_random_bytes(12), 'base64');
    -- Make it URL-safe
    new_token := replace(replace(replace(new_token, '/', '_'), '+', '-'), '=', '');
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM shared_reports WHERE share_token = new_token) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$$;
