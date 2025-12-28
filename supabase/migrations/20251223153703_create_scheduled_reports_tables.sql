/*
  # Scheduled Reports System
  
  1. New Tables
    - `scheduled_reports` - Main schedule configuration
      - `id` (uuid, primary key)
      - `customer_id` (integer) - Links to customer
      - `created_by` (uuid) - User who created schedule
      - `report_type` (text) - 'ai_report' or 'custom_report'
      - `report_id` (text) - References source report
      - `report_name` (text) - Cached name for display
      - `name` (text) - Schedule name
      - `description` (text) - Optional description
      - `is_active` (boolean) - Whether schedule is active
      - `frequency` (text) - 'daily', 'weekly', 'monthly', 'quarterly'
      - `timezone` (text) - Timezone for scheduling
      - `day_of_week` (integer) - 0-6 for weekly schedules
      - `day_of_month` (integer) - 1-31 for monthly schedules
      - `run_time` (time) - Time of day to run
      - `date_range_type` (text) - Type of dynamic date range
      - `rolling_value` (integer) - Number for rolling window
      - `rolling_unit` (text) - 'days', 'weeks', 'months'
      - `delivery_email` (boolean) - Send via email
      - `delivery_notification` (boolean) - Create in-app notification
      - `email_recipients` (text[]) - List of email addresses
      - `email_subject` (text) - Email subject template
      - `email_body` (text) - Email body template
      - `format_pdf` (boolean) - Generate PDF
      - `format_csv` (boolean) - Generate CSV
      - Execution tracking columns for last/next run
      
    - `scheduled_report_runs` - Execution history
      - Tracks each run with status, dates, file paths
      
    - `notifications` - In-app notifications
      - User notifications for completed reports
      
  2. Security
    - Enable RLS on all tables
    - Users can manage their own schedules
    - Admins can view all schedules
    - Users can only see their own notifications
*/

-- Main schedule configuration table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  customer_id INTEGER,
  created_by UUID,
  
  report_type TEXT NOT NULL,
  report_id TEXT NOT NULL,
  report_name TEXT NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  frequency TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/Chicago',
  day_of_week INTEGER,
  day_of_month INTEGER,
  run_time TIME DEFAULT '07:00',
  
  date_range_type TEXT NOT NULL,
  rolling_value INTEGER,
  rolling_unit TEXT,
  
  delivery_email BOOLEAN DEFAULT true,
  delivery_notification BOOLEAN DEFAULT true,
  email_recipients TEXT[] DEFAULT '{}',
  email_subject TEXT,
  email_body TEXT,
  format_pdf BOOLEAN DEFAULT true,
  format_csv BOOLEAN DEFAULT false,
  
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_run_error TEXT,
  run_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution history table
CREATE TABLE IF NOT EXISTS scheduled_report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  
  date_range_start DATE,
  date_range_end DATE,
  record_count INTEGER,
  
  pdf_storage_path TEXT,
  csv_storage_path TEXT,
  
  emails_sent INTEGER DEFAULT 0,
  email_recipients TEXT[],
  notifications_created INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  
  scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE SET NULL,
  scheduled_run_id UUID REFERENCES scheduled_report_runs(id) ON DELETE SET NULL,
  report_url TEXT,
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_customer ON scheduled_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by ON scheduled_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_runs_report ON scheduled_report_runs(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_runs_status ON scheduled_report_runs(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_reports

-- Users can view schedules they created OR schedules for customers they have access to
CREATE POLICY "Users can view their schedules"
  ON scheduled_reports
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM users_customers
      WHERE users_customers.user_id = auth.uid()
      AND users_customers.customer_id = scheduled_reports.customer_id
    )
  );

CREATE POLICY "Users can create schedules"
  ON scheduled_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own schedules"
  ON scheduled_reports
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Users can delete their own schedules"
  ON scheduled_reports
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- RLS Policies for scheduled_report_runs
CREATE POLICY "Users can view runs for their schedules"
  ON scheduled_report_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_reports
      WHERE scheduled_reports.id = scheduled_report_runs.scheduled_report_id
      AND (
        scheduled_reports.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.user_role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM users_customers
          WHERE users_customers.user_id = auth.uid()
          AND users_customers.customer_id = scheduled_reports.customer_id
        )
      )
    )
  );

CREATE POLICY "System can insert runs"
  ON scheduled_report_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update runs"
  ON scheduled_report_runs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());