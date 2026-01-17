/*
  # Create Anomaly Detection System

  1. New Tables
    - `detected_anomalies`
      - `id` (uuid, primary key)
      - `customer_id` (integer, foreign key)
      - `anomaly_type` (text) - type of anomaly detected
      - `severity` (text) - info, warning, critical
      - `title` (text) - brief title
      - `description` (text) - detailed description
      - `metric` (text) - metric that triggered the anomaly
      - `current_value` (numeric) - current metric value
      - `baseline_value` (numeric) - expected/baseline value
      - `change_percent` (numeric) - percentage change
      - `affected_dimension` (text) - dimension affected (carrier, state, etc)
      - `affected_value` (text) - specific value affected
      - `status` (text) - new, acknowledged, resolved, dismissed
      - `detection_date` (timestamptz) - when anomaly was detected
      - `suggested_actions` (jsonb) - array of suggested actions
      - `acknowledged_by` (uuid) - user who acknowledged
      - `acknowledged_at` (timestamptz)
      - `resolved_by` (uuid) - user who resolved
      - `resolved_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `detected_anomalies` table
    - Add policies for authenticated users to read and update their customer's anomalies

  3. Functions
    - `get_customer_anomalies` - retrieve anomalies for a customer
    - `update_anomaly_status` - update anomaly status with user tracking
*/

CREATE TABLE IF NOT EXISTS public.detected_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer NOT NULL REFERENCES public.customer(customer_id) ON DELETE CASCADE,
  anomaly_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  metric text NOT NULL,
  current_value numeric NOT NULL,
  baseline_value numeric NOT NULL,
  change_percent numeric NOT NULL,
  affected_dimension text,
  affected_value text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'dismissed')),
  detection_date timestamptz NOT NULL DEFAULT now(),
  suggested_actions jsonb DEFAULT '[]'::jsonb,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_detected_anomalies_customer_id ON public.detected_anomalies(customer_id);
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_status ON public.detected_anomalies(status);
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_severity ON public.detected_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_detection_date ON public.detected_anomalies(detection_date DESC);

ALTER TABLE public.detected_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their customer anomalies"
  ON public.detected_anomalies FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT uc.customer_id
      FROM public.users_customers uc
      WHERE uc.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.user_role = 'admin'
    )
  );

CREATE POLICY "Users can update their customer anomalies"
  ON public.detected_anomalies FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT uc.customer_id
      FROM public.users_customers uc
      WHERE uc.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.user_role = 'admin'
    )
  );

DROP FUNCTION IF EXISTS public.get_customer_anomalies(text, text, integer);

CREATE FUNCTION public.get_customer_anomalies(
  p_customer_id text,
  p_status text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  customer_id text,
  anomaly_type text,
  severity text,
  title text,
  description text,
  metric text,
  current_value numeric,
  baseline_value numeric,
  change_percent numeric,
  affected_dimension text,
  affected_value text,
  status text,
  detection_date timestamptz,
  suggested_actions jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    da.id,
    da.customer_id::text,
    da.anomaly_type,
    da.severity,
    da.title,
    da.description,
    da.metric,
    da.current_value,
    da.baseline_value,
    da.change_percent,
    da.affected_dimension,
    da.affected_value,
    da.status,
    da.detection_date,
    da.suggested_actions,
    da.created_at
  FROM public.detected_anomalies da
  WHERE da.customer_id = p_customer_id::integer
    AND (p_status IS NULL OR da.status = p_status)
  ORDER BY da.detection_date DESC
  LIMIT p_limit;
END;
$$;

DROP FUNCTION IF EXISTS public.update_anomaly_status(uuid, text, uuid);

CREATE FUNCTION public.update_anomaly_status(
  p_anomaly_id uuid,
  p_status text,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.detected_anomalies
  SET
    status = p_status,
    acknowledged_by = CASE WHEN p_status = 'acknowledged' THEN p_user_id ELSE acknowledged_by END,
    acknowledged_at = CASE WHEN p_status = 'acknowledged' THEN now() ELSE acknowledged_at END,
    resolved_by = CASE WHEN p_status = 'resolved' THEN p_user_id ELSE resolved_by END,
    resolved_at = CASE WHEN p_status = 'resolved' THEN now() ELSE resolved_at END,
    updated_at = now()
  WHERE id = p_anomaly_id;
END;
$$;
