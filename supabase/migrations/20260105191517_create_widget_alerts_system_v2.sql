/*
  # Widget Alerts System for Living Dashboard

  1. New Tables
    - `widget_alerts` - Stores alerts for dashboard widgets

  2. Security
    - Enable RLS on widget_alerts
    - Admins can see all alerts
    - Users can only see alerts for their assigned customer

  3. Functions
    - `get_dashboard_alerts` - Get grouped alerts by widget
    - `dismiss_widget_alert` - Dismiss single alert
    - `snooze_widget_alert` - Snooze single alert
    - `dismiss_widget_alerts` - Dismiss all alerts for a widget
    - `snooze_widget` - Snooze all alerts for a widget
*/

DROP FUNCTION IF EXISTS dismiss_widget_alert(uuid, text);
DROP FUNCTION IF EXISTS snooze_widget_alert(uuid, integer);
DROP FUNCTION IF EXISTS dismiss_widget_alerts(integer, text);
DROP FUNCTION IF EXISTS snooze_widget(integer, text, integer);
DROP FUNCTION IF EXISTS get_dashboard_alerts(integer);

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical', 'success');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'dismissed', 'snoozed', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS widget_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  widget_key text NOT NULL,
  alert_type text NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'warning',
  status alert_status NOT NULL DEFAULT 'active',
  title text NOT NULL,
  description text NOT NULL,
  change_percent numeric,
  current_value numeric,
  previous_value numeric,
  investigate_query text,
  methodology text,
  snoozed_until timestamptz,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widget_alerts_customer_id ON widget_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_widget_key ON widget_alerts(widget_key);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_status ON widget_alerts(status);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_customer_status ON widget_alerts(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_widget_alerts_severity ON widget_alerts(severity);

ALTER TABLE widget_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all widget alerts" ON widget_alerts;
CREATE POLICY "Admins can view all widget alerts"
  ON widget_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view alerts for their customer" ON widget_alerts;
CREATE POLICY "Users can view alerts for their customer"
  ON widget_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_customers uc
      WHERE uc.user_id = auth.uid()
      AND uc.customer_id = widget_alerts.customer_id
    )
  );

DROP POLICY IF EXISTS "Admins can insert widget alerts" ON widget_alerts;
CREATE POLICY "Admins can insert widget alerts"
  ON widget_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update widget alerts" ON widget_alerts;
CREATE POLICY "Admins can update widget alerts"
  ON widget_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update alerts for their customer" ON widget_alerts;
CREATE POLICY "Users can update alerts for their customer"
  ON widget_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_customers uc
      WHERE uc.user_id = auth.uid()
      AND uc.customer_id = widget_alerts.customer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_customers uc
      WHERE uc.user_id = auth.uid()
      AND uc.customer_id = widget_alerts.customer_id
    )
  );

CREATE OR REPLACE FUNCTION get_dashboard_alerts(p_customer_id integer)
RETURNS TABLE (
  widget_key text,
  alert_count bigint,
  max_severity text,
  alerts jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wa.widget_key,
    COUNT(*)::bigint AS alert_count,
    MAX(wa.severity::text) AS max_severity,
    jsonb_agg(
      jsonb_build_object(
        'id', wa.id,
        'alert_type', wa.alert_type,
        'severity', wa.severity,
        'title', wa.title,
        'description', wa.description,
        'change_percent', wa.change_percent,
        'current_value', wa.current_value,
        'previous_value', wa.previous_value,
        'investigate_query', wa.investigate_query,
        'methodology', wa.methodology,
        'triggered_at', wa.triggered_at
      )
      ORDER BY
        CASE wa.severity
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          WHEN 'info' THEN 3
          WHEN 'success' THEN 4
        END,
        wa.triggered_at DESC
    ) AS alerts
  FROM widget_alerts wa
  WHERE wa.customer_id = p_customer_id
    AND wa.status = 'active'
    AND (wa.snoozed_until IS NULL OR wa.snoozed_until < now())
  GROUP BY wa.widget_key;
END;
$$;

CREATE OR REPLACE FUNCTION dismiss_widget_alert(p_alert_id uuid, p_action text DEFAULT 'dismissed')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE widget_alerts
  SET
    status = p_action::alert_status,
    dismissed_at = CASE WHEN p_action = 'dismissed' THEN now() ELSE dismissed_at END,
    acknowledged_at = CASE WHEN p_action = 'acknowledged' THEN now() ELSE acknowledged_at END,
    updated_at = now()
  WHERE id = p_alert_id;
END;
$$;

CREATE OR REPLACE FUNCTION snooze_widget_alert(p_alert_id uuid, p_minutes integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE widget_alerts
  SET
    status = 'snoozed',
    snoozed_until = now() + (p_minutes || ' minutes')::interval,
    updated_at = now()
  WHERE id = p_alert_id;
END;
$$;

CREATE OR REPLACE FUNCTION dismiss_widget_alerts(p_customer_id integer, p_widget_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE widget_alerts
  SET
    status = 'dismissed',
    dismissed_at = now(),
    updated_at = now()
  WHERE customer_id = p_customer_id
    AND widget_key = p_widget_key
    AND status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION snooze_widget(p_customer_id integer, p_widget_key text, p_minutes integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE widget_alerts
  SET
    status = 'snoozed',
    snoozed_until = now() + (p_minutes || ' minutes')::interval,
    updated_at = now()
  WHERE customer_id = p_customer_id
    AND widget_key = p_widget_key
    AND status = 'active';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'widget_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE widget_alerts;
  END IF;
END $$;
