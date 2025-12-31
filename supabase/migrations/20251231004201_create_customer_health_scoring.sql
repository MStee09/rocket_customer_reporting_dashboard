/*
  # Customer Health Scoring System

  1. New Tables
    - `customer_health_scores` - Stores calculated health scores for each customer
      - `id` (uuid, primary key)
      - `customer_id` (integer, references customer)
      - `overall_score` (integer, 0-100)
      - `status` (text: thriving, healthy, watch, at-risk, critical)
      - Component scores and metrics
    - `customer_health_history` - Tracks score changes over time
    - `customer_health_alerts` - Stores health-related alerts

  2. Security
    - Enable RLS on all tables
    - Admin-only access policies

  3. Indexes
    - Optimized for filtering by status, score, and customer
*/

-- Customer Health Scores table
CREATE TABLE IF NOT EXISTS customer_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer NOT NULL REFERENCES customer(customer_id),
  overall_score integer NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  status text NOT NULL CHECK (status IN ('thriving', 'healthy', 'watch', 'at-risk', 'critical')),
  volume_trend_score integer NOT NULL DEFAULT 0,
  revenue_retention_score integer NOT NULL DEFAULT 0,
  engagement_score integer NOT NULL DEFAULT 0,
  recency_score integer NOT NULL DEFAULT 0,
  shipments_current_period integer NOT NULL DEFAULT 0,
  shipments_previous_period integer NOT NULL DEFAULT 0,
  revenue_current_period numeric NOT NULL DEFAULT 0,
  revenue_previous_period numeric NOT NULL DEFAULT 0,
  days_since_last_shipment integer,
  last_shipment_date date,
  volume_change_percent numeric,
  revenue_change_percent numeric,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id)
);

-- Customer Health History table
CREATE TABLE IF NOT EXISTS customer_health_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer NOT NULL REFERENCES customer(customer_id),
  overall_score integer NOT NULL,
  status text NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

-- Health Alerts table
CREATE TABLE IF NOT EXISTS customer_health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer NOT NULL REFERENCES customer(customer_id),
  alert_type text NOT NULL CHECK (alert_type IN ('volume_drop', 'revenue_drop', 'inactivity', 'status_change')),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  message text NOT NULL,
  is_acknowledged boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_customer_id ON customer_health_scores(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_status ON customer_health_scores(status);
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_overall_score ON customer_health_scores(overall_score);
CREATE INDEX IF NOT EXISTS idx_customer_health_history_customer_id ON customer_health_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_history_recorded_at ON customer_health_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_customer_health_alerts_customer_id ON customer_health_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_alerts_severity ON customer_health_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_customer_health_alerts_is_acknowledged ON customer_health_alerts(is_acknowledged);

-- Enable RLS
ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_health_scores
CREATE POLICY "Admins can view all health scores"
  ON customer_health_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert health scores"
  ON customer_health_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update health scores"
  ON customer_health_scores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can delete health scores"
  ON customer_health_scores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- RLS Policies for customer_health_history
CREATE POLICY "Admins can view health history"
  ON customer_health_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert health history"
  ON customer_health_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

-- RLS Policies for customer_health_alerts
CREATE POLICY "Admins can view all alerts"
  ON customer_health_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert alerts"
  ON customer_health_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update alerts"
  ON customer_health_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can delete alerts"
  ON customer_health_alerts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );