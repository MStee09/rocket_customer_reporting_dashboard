/*
  # Create Customer Intelligence System Tables

  1. New Tables
    - `customer_intelligence_profiles`
      - `id` (uuid, primary key) - Unique identifier for each profile
      - `customer_id` (integer, unique, not null) - References customer table
      - `priorities` (jsonb) - Customer priorities and focus areas
      - `products` (jsonb) - Product categories and preferences
      - `key_markets` (jsonb) - Primary markets and regions
      - `terminology` (jsonb) - Customer-specific terminology mappings
      - `benchmark_period` (text) - Preferred comparison period
      - `account_notes` (text) - General account notes
      - `created_at` (timestamptz) - Profile creation timestamp
      - `created_by` (uuid) - User who created the profile
      - `updated_at` (timestamptz) - Last modification timestamp
      - `updated_by` (uuid) - User who last modified the profile

    - `customer_intelligence_history`
      - `id` (uuid, primary key) - Unique identifier for each history entry
      - `profile_id` (uuid) - References customer_intelligence_profiles
      - `customer_id` (integer) - Customer ID for quick lookups
      - `timestamp` (timestamptz) - When the change occurred
      - `user_id` (uuid) - User who made the change
      - `user_email` (text) - Email of user for audit trail
      - `change_type` (text) - Type of change: add, remove, modify, create
      - `field_changed` (text) - Which field was modified
      - `previous_value` (jsonb) - Value before change
      - `new_value` (jsonb) - Value after change
      - `user_input` (text) - Original user input/request
      - `ai_interpretation` (text) - AI's interpretation of the change
      - `correlation_data` (jsonb) - Related data and context

    - `ai_learning_notifications`
      - `id` (uuid, primary key) - Unique identifier for notification
      - `customer_id` (integer) - Related customer
      - `customer_name` (text) - Customer name for quick reference
      - `created_at` (timestamptz) - When notification was created
      - `conversation_id` (text) - Link to conversation context
      - `user_query` (text) - Original user question
      - `unknown_term` (text) - Term or concept AI didn't understand
      - `ai_response` (text) - AI's response to the user
      - `suggested_field` (text) - AI's suggestion for which field applies
      - `suggested_keywords` (text[]) - Suggested keywords for mapping
      - `confidence` (text) - Confidence level: low, medium, high
      - `status` (text) - Status: pending, reviewed, dismissed
      - `resolved_by` (uuid) - Admin who resolved the notification
      - `resolved_at` (timestamptz) - When it was resolved
      - `resolution_type` (text) - How it was resolved
      - `resolution_notes` (text) - Notes about the resolution

    - `saved_views`
      - `id` (uuid, primary key) - Unique identifier for saved view
      - `user_id` (uuid, not null) - User who owns the view
      - `customer_id` (integer) - Optional customer context
      - `name` (text, not null) - Display name for the view
      - `description` (text) - Description of what the view shows
      - `view_type` (text, not null) - Type: dashboard, report, chart, etc.
      - `view_config` (jsonb, not null) - Configuration for the view
      - `is_pinned` (boolean) - Whether view is pinned to top
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last modification timestamp

  2. Security
    - Enable RLS on all tables
    - customer_intelligence_profiles: Admins only for all operations
    - customer_intelligence_history: Admins only for read and insert
    - ai_learning_notifications: Admins only for all operations
    - saved_views: Users can only access their own views

  3. Indexes
    - idx_intel_profiles_customer - Fast customer profile lookups
    - idx_intel_history_customer - Fast customer history lookups
    - idx_intel_history_timestamp - Time-based history queries
    - idx_learning_notifications_status - Filter by status
    - idx_saved_views_user - User's saved views lookup

  4. Notes
    - All tables use UUID primary keys for consistency
    - JSONB fields allow flexible data structures
    - Audit trail captured in history table
    - RLS ensures data security and privacy
*/

-- Create customer_intelligence_profiles table
CREATE TABLE IF NOT EXISTS customer_intelligence_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer UNIQUE NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
  priorities jsonb DEFAULT '[]'::jsonb,
  products jsonb DEFAULT '[]'::jsonb,
  key_markets jsonb DEFAULT '[]'::jsonb,
  terminology jsonb DEFAULT '[]'::jsonb,
  benchmark_period text DEFAULT '',
  account_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create customer_intelligence_history table
CREATE TABLE IF NOT EXISTS customer_intelligence_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES customer_intelligence_profiles(id) ON DELETE CASCADE,
  customer_id integer DEFAULT 0,
  timestamp timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  user_email text DEFAULT '',
  change_type text NOT NULL,
  field_changed text NOT NULL,
  previous_value jsonb,
  new_value jsonb NOT NULL,
  user_input text DEFAULT '',
  ai_interpretation text DEFAULT '',
  correlation_data jsonb DEFAULT '{}'::jsonb
);

-- Create ai_learning_notifications table
CREATE TABLE IF NOT EXISTS ai_learning_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer DEFAULT 0,
  customer_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  conversation_id text DEFAULT '',
  user_query text NOT NULL,
  unknown_term text NOT NULL,
  ai_response text DEFAULT '',
  suggested_field text DEFAULT '',
  suggested_keywords text[] DEFAULT ARRAY[]::text[],
  confidence text DEFAULT 'medium',
  status text DEFAULT 'pending',
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolution_type text DEFAULT '',
  resolution_notes text DEFAULT ''
);

-- Create saved_views table
CREATE TABLE IF NOT EXISTS saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id integer,
  name text NOT NULL,
  description text DEFAULT '',
  view_type text NOT NULL,
  view_config jsonb NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_intel_profiles_customer 
  ON customer_intelligence_profiles(customer_id);

CREATE INDEX IF NOT EXISTS idx_intel_history_customer 
  ON customer_intelligence_history(customer_id);

CREATE INDEX IF NOT EXISTS idx_intel_history_timestamp 
  ON customer_intelligence_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_learning_notifications_status 
  ON ai_learning_notifications(status);

CREATE INDEX IF NOT EXISTS idx_saved_views_user 
  ON saved_views(user_id);

-- Enable RLS on all tables
ALTER TABLE customer_intelligence_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_intelligence_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_intelligence_profiles
CREATE POLICY "Admins can view all intelligence profiles"
  ON customer_intelligence_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert intelligence profiles"
  ON customer_intelligence_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update intelligence profiles"
  ON customer_intelligence_profiles FOR UPDATE
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

CREATE POLICY "Admins can delete intelligence profiles"
  ON customer_intelligence_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- RLS Policies for customer_intelligence_history
CREATE POLICY "Admins can view intelligence history"
  ON customer_intelligence_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert intelligence history"
  ON customer_intelligence_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- RLS Policies for ai_learning_notifications
CREATE POLICY "Admins can view learning notifications"
  ON ai_learning_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert learning notifications"
  ON ai_learning_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update learning notifications"
  ON ai_learning_notifications FOR UPDATE
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

CREATE POLICY "Admins can delete learning notifications"
  ON ai_learning_notifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- RLS Policies for saved_views
CREATE POLICY "Users can view own saved views"
  ON saved_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved views"
  ON saved_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved views"
  ON saved_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved views"
  ON saved_views FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add indexes for foreign keys (performance optimization)
CREATE INDEX IF NOT EXISTS idx_intel_profiles_created_by 
  ON customer_intelligence_profiles(created_by);

CREATE INDEX IF NOT EXISTS idx_intel_profiles_updated_by 
  ON customer_intelligence_profiles(updated_by);

CREATE INDEX IF NOT EXISTS idx_intel_history_profile 
  ON customer_intelligence_history(profile_id);

CREATE INDEX IF NOT EXISTS idx_intel_history_user 
  ON customer_intelligence_history(user_id);

CREATE INDEX IF NOT EXISTS idx_learning_notifications_customer 
  ON ai_learning_notifications(customer_id);

CREATE INDEX IF NOT EXISTS idx_learning_notifications_resolved_by 
  ON ai_learning_notifications(resolved_by);

CREATE INDEX IF NOT EXISTS idx_saved_views_customer 
  ON saved_views(customer_id);
