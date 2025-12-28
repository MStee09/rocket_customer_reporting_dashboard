/*
  # Create dashboard_widgets table

  1. New Tables
    - `dashboard_widgets`
      - `id` (uuid, primary key) - Unique identifier for each dashboard widget instance
      - `customer_id` (int, nullable) - Customer who owns this dashboard (null for admin)
      - `widget_id` (text) - ID of the widget to display
      - `position` (int) - Position/order on the dashboard
      - `size` (text) - Widget size: 'small', 'medium', 'large'
      - `tab` (text) - Which tab/section: 'overview', 'operations', 'analytics'
      - `config` (jsonb) - Custom configuration overrides
      - `created_at` (timestamptz) - When added to dashboard
      - `updated_at` (timestamptz) - Last modified

  2. Security
    - Enable RLS on `dashboard_widgets` table
    - Customers can view/manage their own dashboard widgets
    - Admins can view/manage all dashboard widgets

  3. Indexes
    - Index on customer_id for fast customer dashboard lookups
    - Composite index on (customer_id, tab, position) for ordered retrieval
*/

-- Create dashboard_widgets table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id int REFERENCES customer(customer_id) ON DELETE CASCADE,
  widget_id text NOT NULL,
  position int NOT NULL DEFAULT 0,
  size text DEFAULT 'medium',
  tab text DEFAULT 'overview',
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_customer_id ON dashboard_widgets(customer_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_customer_tab_pos ON dashboard_widgets(customer_id, tab, position);

-- Enable RLS
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Customers can view their own dashboard widgets
CREATE POLICY "Customers can view own dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'customer'
    )
  );

-- Customers can insert their own dashboard widgets
CREATE POLICY "Customers can insert own dashboard widgets"
  ON dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT customer_id
      FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'customer'
    )
  );

-- Customers can update their own dashboard widgets
CREATE POLICY "Customers can update own dashboard widgets"
  ON dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'customer'
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT customer_id
      FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'customer'
    )
  );

-- Customers can delete their own dashboard widgets
CREATE POLICY "Customers can delete own dashboard widgets"
  ON dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'customer'
    )
  );

-- Admins can view all dashboard widgets
CREATE POLICY "Admins can view all dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- Admins can insert any dashboard widgets
CREATE POLICY "Admins can insert any dashboard widgets"
  ON dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- Admins can update any dashboard widgets
CREATE POLICY "Admins can update any dashboard widgets"
  ON dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- Admins can delete any dashboard widgets
CREATE POLICY "Admins can delete any dashboard widgets"
  ON dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );
