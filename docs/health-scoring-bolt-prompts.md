# Customer Health Scoring - Bolt Implementation Prompts

## Overview
This document contains copy-paste prompts for implementing Customer Health Scoring in phases. Each phase builds on the previous one. Wait for each phase to complete before moving to the next.

---

## Phase 1: Database Migration & Types

**Copy and paste this into Bolt:**

```
Create a new Supabase migration for customer health scoring. The migration should:

1. Create a file: supabase/migrations/20251231000000_create_customer_health_scoring.sql

2. The migration should create:

-- Customer Health Scores table (stores calculated scores)
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

-- Customer Health History table (tracks score changes over time)
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
CREATE INDEX idx_customer_health_scores_customer_id ON customer_health_scores(customer_id);
CREATE INDEX idx_customer_health_scores_status ON customer_health_scores(status);
CREATE INDEX idx_customer_health_scores_overall_score ON customer_health_scores(overall_score);
CREATE INDEX idx_customer_health_history_customer_id ON customer_health_history(customer_id);
CREATE INDEX idx_customer_health_history_recorded_at ON customer_health_history(recorded_at);
CREATE INDEX idx_customer_health_alerts_customer_id ON customer_health_alerts(customer_id);
CREATE INDEX idx_customer_health_alerts_severity ON customer_health_alerts(severity);
CREATE INDEX idx_customer_health_alerts_is_acknowledged ON customer_health_alerts(is_acknowledged);

-- Enable RLS
ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_health_scores (admin only)
CREATE POLICY "Admins can view all health scores"
  ON customer_health_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can manage health scores"
  ON customer_health_scores FOR ALL
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

CREATE POLICY "Admins can manage health history"
  ON customer_health_history FOR ALL
  TO authenticated
  USING (
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

CREATE POLICY "Admins can manage alerts"
  ON customer_health_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND user_role = 'admin'
    )
  );

3. Also create the TypeScript types file: src/types/customerHealth.ts

export type HealthStatus = 'thriving' | 'healthy' | 'watch' | 'at-risk' | 'critical';
export type AlertType = 'volume_drop' | 'revenue_drop' | 'inactivity' | 'status_change';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface CustomerHealthScore {
  id: string;
  customer_id: number;
  overall_score: number;
  status: HealthStatus;
  volume_trend_score: number;
  revenue_retention_score: number;
  engagement_score: number;
  recency_score: number;
  shipments_current_period: number;
  shipments_previous_period: number;
  revenue_current_period: number;
  revenue_previous_period: number;
  days_since_last_shipment: number | null;
  last_shipment_date: string | null;
  volume_change_percent: number | null;
  revenue_change_percent: number | null;
  calculated_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string;
}

export interface CustomerHealthHistory {
  id: string;
  customer_id: number;
  overall_score: number;
  status: HealthStatus;
  recorded_at: string;
}

export interface CustomerHealthAlert {
  id: string;
  customer_id: number;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  is_acknowledged: boolean;
  is_dismissed: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  // Joined fields
  customer_name?: string;
}

export interface HealthScoreSummary {
  totalCustomers: number;
  avgScore: number;
  atRiskCount: number;
  atRiskRevenue: number;
  statusCounts: Record<HealthStatus, number>;
}

This migration uses delivery_date for all time-based calculations since the database only contains delivered shipments.
```

---

## Phase 2: Health Score Calculation Function

**Copy and paste this into Bolt:**

```
Add a PostgreSQL function to calculate customer health scores. Add this to the same migration file or create a new one:

supabase/migrations/20251231000001_create_health_score_functions.sql

-- Function to calculate health score for a single customer
CREATE OR REPLACE FUNCTION calculate_customer_health_score(p_customer_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipments_current integer;
  v_shipments_previous integer;
  v_revenue_current numeric;
  v_revenue_previous numeric;
  v_last_shipment_date date;
  v_days_since_last integer;
  v_volume_score integer;
  v_revenue_score integer;
  v_engagement_score integer;
  v_recency_score integer;
  v_overall_score integer;
  v_status text;
  v_volume_change numeric;
  v_revenue_change numeric;
BEGIN
  -- Get current period metrics (last 30 days) using delivery_date
  SELECT COUNT(*), COALESCE(SUM(retail), 0)
  INTO v_shipments_current, v_revenue_current
  FROM shipment
  WHERE customer_id = p_customer_id
    AND delivery_date >= CURRENT_DATE - 30
    AND delivery_date <= CURRENT_DATE;
  
  -- Get previous period metrics (31-60 days ago)
  SELECT COUNT(*), COALESCE(SUM(retail), 0)
  INTO v_shipments_previous, v_revenue_previous
  FROM shipment
  WHERE customer_id = p_customer_id
    AND delivery_date >= CURRENT_DATE - 60
    AND delivery_date < CURRENT_DATE - 30;
  
  -- Get most recent delivery date
  SELECT MAX(delivery_date) INTO v_last_shipment_date
  FROM shipment 
  WHERE customer_id = p_customer_id;
  
  -- Calculate days since last shipment
  v_days_since_last := CASE 
    WHEN v_last_shipment_date IS NOT NULL 
    THEN CURRENT_DATE - v_last_shipment_date 
    ELSE 999 
  END;
  
  -- Calculate Volume Score (0-25)
  IF v_shipments_previous = 0 THEN
    v_volume_score := CASE WHEN v_shipments_current > 0 THEN 25 ELSE 0 END;
    v_volume_change := NULL;
  ELSE
    v_volume_change := ((v_shipments_current::numeric - v_shipments_previous) / v_shipments_previous) * 100;
    v_volume_score := CASE
      WHEN v_volume_change >= 10 THEN 25
      WHEN v_volume_change >= 0 THEN 20
      WHEN v_volume_change >= -10 THEN 15
      WHEN v_volume_change >= -25 THEN 10
      WHEN v_volume_change >= -50 THEN 5
      ELSE 0
    END;
  END IF;
  
  -- Calculate Revenue Score (0-25)
  IF v_revenue_previous = 0 THEN
    v_revenue_score := CASE WHEN v_revenue_current > 0 THEN 25 ELSE 0 END;
    v_revenue_change := NULL;
  ELSE
    v_revenue_change := ((v_revenue_current - v_revenue_previous) / v_revenue_previous) * 100;
    v_revenue_score := CASE
      WHEN v_revenue_change >= 10 THEN 25
      WHEN v_revenue_change >= 0 THEN 20
      WHEN v_revenue_change >= -10 THEN 15
      WHEN v_revenue_change >= -25 THEN 10
      WHEN v_revenue_change >= -50 THEN 5
      ELSE 0
    END;
  END IF;
  
  -- Calculate Engagement Score (0-25)
  v_engagement_score := CASE
    WHEN v_shipments_current >= 10 THEN 25
    WHEN v_shipments_current >= 5 THEN 20
    WHEN v_shipments_current >= 2 THEN 15
    WHEN v_shipments_current >= 1 THEN 10
    ELSE 0
  END;
  
  -- Calculate Recency Score (0-25)
  v_recency_score := CASE
    WHEN v_days_since_last <= 7 THEN 25
    WHEN v_days_since_last <= 14 THEN 20
    WHEN v_days_since_last <= 21 THEN 15
    WHEN v_days_since_last <= 30 THEN 10
    WHEN v_days_since_last <= 45 THEN 5
    ELSE 0
  END;
  
  -- Calculate overall score
  v_overall_score := v_volume_score + v_revenue_score + v_engagement_score + v_recency_score;
  
  -- Determine status
  v_status := CASE
    WHEN v_overall_score >= 85 THEN 'thriving'
    WHEN v_overall_score >= 70 THEN 'healthy'
    WHEN v_overall_score >= 50 THEN 'watch'
    WHEN v_overall_score >= 25 THEN 'at-risk'
    ELSE 'critical'
  END;
  
  RETURN jsonb_build_object(
    'customer_id', p_customer_id,
    'overall_score', v_overall_score,
    'status', v_status,
    'volume_trend_score', v_volume_score,
    'revenue_retention_score', v_revenue_score,
    'engagement_score', v_engagement_score,
    'recency_score', v_recency_score,
    'shipments_current_period', v_shipments_current,
    'shipments_previous_period', v_shipments_previous,
    'revenue_current_period', v_revenue_current,
    'revenue_previous_period', v_revenue_previous,
    'days_since_last_shipment', v_days_since_last,
    'last_shipment_date', v_last_shipment_date,
    'volume_change_percent', v_volume_change,
    'revenue_change_percent', v_revenue_change
  );
END;
$$;

-- Function to recalculate all customer health scores
CREATE OR REPLACE FUNCTION recalculate_all_health_scores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer record;
  v_score jsonb;
  v_count integer := 0;
  v_old_status text;
BEGIN
  -- Loop through all active customers
  FOR v_customer IN 
    SELECT customer_id FROM customer WHERE is_active = true
  LOOP
    -- Get the old status for comparison
    SELECT status INTO v_old_status 
    FROM customer_health_scores 
    WHERE customer_id = v_customer.customer_id;
    
    -- Calculate new score
    v_score := calculate_customer_health_score(v_customer.customer_id);
    
    -- Upsert the score
    INSERT INTO customer_health_scores (
      customer_id, overall_score, status,
      volume_trend_score, revenue_retention_score, engagement_score, recency_score,
      shipments_current_period, shipments_previous_period,
      revenue_current_period, revenue_previous_period,
      days_since_last_shipment, last_shipment_date,
      volume_change_percent, revenue_change_percent,
      calculated_at, updated_at
    ) VALUES (
      v_customer.customer_id,
      (v_score->>'overall_score')::integer,
      v_score->>'status',
      (v_score->>'volume_trend_score')::integer,
      (v_score->>'revenue_retention_score')::integer,
      (v_score->>'engagement_score')::integer,
      (v_score->>'recency_score')::integer,
      (v_score->>'shipments_current_period')::integer,
      (v_score->>'shipments_previous_period')::integer,
      (v_score->>'revenue_current_period')::numeric,
      (v_score->>'revenue_previous_period')::numeric,
      (v_score->>'days_since_last_shipment')::integer,
      (v_score->>'last_shipment_date')::date,
      (v_score->>'volume_change_percent')::numeric,
      (v_score->>'revenue_change_percent')::numeric,
      now(), now()
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      overall_score = EXCLUDED.overall_score,
      status = EXCLUDED.status,
      volume_trend_score = EXCLUDED.volume_trend_score,
      revenue_retention_score = EXCLUDED.revenue_retention_score,
      engagement_score = EXCLUDED.engagement_score,
      recency_score = EXCLUDED.recency_score,
      shipments_current_period = EXCLUDED.shipments_current_period,
      shipments_previous_period = EXCLUDED.shipments_previous_period,
      revenue_current_period = EXCLUDED.revenue_current_period,
      revenue_previous_period = EXCLUDED.revenue_previous_period,
      days_since_last_shipment = EXCLUDED.days_since_last_shipment,
      last_shipment_date = EXCLUDED.last_shipment_date,
      volume_change_percent = EXCLUDED.volume_change_percent,
      revenue_change_percent = EXCLUDED.revenue_change_percent,
      calculated_at = EXCLUDED.calculated_at,
      updated_at = EXCLUDED.updated_at;
    
    -- Record history
    INSERT INTO customer_health_history (customer_id, overall_score, status)
    VALUES (v_customer.customer_id, (v_score->>'overall_score')::integer, v_score->>'status');
    
    -- Generate alerts if needed
    -- Status change alert
    IF v_old_status IS NOT NULL AND v_old_status != v_score->>'status' THEN
      IF (v_score->>'status') IN ('at-risk', 'critical') THEN
        INSERT INTO customer_health_alerts (customer_id, alert_type, severity, message)
        VALUES (
          v_customer.customer_id,
          'status_change',
          CASE WHEN (v_score->>'status') = 'critical' THEN 'critical' ELSE 'high' END,
          'Customer status changed from ' || v_old_status || ' to ' || (v_score->>'status')
        );
      END IF;
    END IF;
    
    -- Volume drop alert
    IF (v_score->>'volume_change_percent')::numeric < -30 THEN
      INSERT INTO customer_health_alerts (customer_id, alert_type, severity, message)
      SELECT v_customer.customer_id, 'volume_drop',
        CASE WHEN (v_score->>'volume_change_percent')::numeric < -50 THEN 'high' ELSE 'medium' END,
        'Volume dropped ' || ABS((v_score->>'volume_change_percent')::numeric)::integer || '% vs prior period'
      WHERE NOT EXISTS (
        SELECT 1 FROM customer_health_alerts 
        WHERE customer_id = v_customer.customer_id 
        AND alert_type = 'volume_drop'
        AND created_at > now() - interval '7 days'
        AND NOT is_dismissed
      );
    END IF;
    
    -- Inactivity alert
    IF (v_score->>'days_since_last_shipment')::integer > 14 THEN
      INSERT INTO customer_health_alerts (customer_id, alert_type, severity, message)
      SELECT v_customer.customer_id, 'inactivity',
        CASE 
          WHEN (v_score->>'days_since_last_shipment')::integer > 30 THEN 'critical'
          WHEN (v_score->>'days_since_last_shipment')::integer > 21 THEN 'high'
          ELSE 'medium'
        END,
        'No shipments in ' || (v_score->>'days_since_last_shipment')::integer || ' days'
      WHERE NOT EXISTS (
        SELECT 1 FROM customer_health_alerts 
        WHERE customer_id = v_customer.customer_id 
        AND alert_type = 'inactivity'
        AND created_at > now() - interval '7 days'
        AND NOT is_dismissed
      );
    END IF;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_customer_health_score(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_health_scores() TO authenticated;
```

---

## Phase 3: Service Layer

**Copy and paste this into Bolt:**

```
Create the customer health service file: src/services/customerHealthService.ts

import { supabase } from '../lib/supabase';
import type { 
  CustomerHealthScore, 
  CustomerHealthAlert, 
  CustomerHealthHistory,
  HealthScoreSummary,
  HealthStatus 
} from '../types/customerHealth';

export const customerHealthService = {
  // Fetch all health scores with customer names
  async getHealthScores(): Promise<CustomerHealthScore[]> {
    const { data, error } = await supabase
      .from('customer_health_scores')
      .select(`
        *,
        customer:customer_id (company_name)
      `)
      .order('overall_score', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(score => ({
      ...score,
      customer_name: score.customer?.company_name || `Customer ${score.customer_id}`
    }));
  },

  // Fetch health scores filtered by status
  async getHealthScoresByStatus(status: HealthStatus): Promise<CustomerHealthScore[]> {
    const { data, error } = await supabase
      .from('customer_health_scores')
      .select(`
        *,
        customer:customer_id (company_name)
      `)
      .eq('status', status)
      .order('overall_score', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(score => ({
      ...score,
      customer_name: score.customer?.company_name || `Customer ${score.customer_id}`
    }));
  },

  // Get summary statistics
  async getSummary(): Promise<HealthScoreSummary> {
    const { data, error } = await supabase
      .from('customer_health_scores')
      .select('overall_score, status, revenue_previous_period');

    if (error) throw error;

    const scores = data || [];
    const statusCounts: Record<HealthStatus, number> = {
      thriving: 0,
      healthy: 0,
      watch: 0,
      'at-risk': 0,
      critical: 0
    };

    let totalScore = 0;
    let atRiskRevenue = 0;

    scores.forEach(score => {
      statusCounts[score.status as HealthStatus]++;
      totalScore += score.overall_score;
      if (score.status === 'at-risk' || score.status === 'critical') {
        atRiskRevenue += score.revenue_previous_period || 0;
      }
    });

    return {
      totalCustomers: scores.length,
      avgScore: scores.length > 0 ? Math.round(totalScore / scores.length) : 0,
      atRiskCount: statusCounts['at-risk'] + statusCounts.critical,
      atRiskRevenue,
      statusCounts
    };
  },

  // Get active alerts (not acknowledged or dismissed)
  async getActiveAlerts(): Promise<CustomerHealthAlert[]> {
    const { data, error } = await supabase
      .from('customer_health_alerts')
      .select(`
        *,
        customer:customer_id (company_name)
      `)
      .eq('is_acknowledged', false)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(alert => ({
      ...alert,
      customer_name: alert.customer?.company_name || `Customer ${alert.customer_id}`
    }));
  },

  // Acknowledge an alert
  async acknowledgeAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_health_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) throw error;
  },

  // Dismiss an alert
  async dismissAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_health_alerts')
      .update({ is_dismissed: true })
      .eq('id', alertId);

    if (error) throw error;
  },

  // Get health history for a customer
  async getCustomerHistory(customerId: number, days: number = 30): Promise<CustomerHealthHistory[]> {
    const { data, error } = await supabase
      .from('customer_health_history')
      .select('*')
      .eq('customer_id', customerId)
      .gte('recorded_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Trigger recalculation of all health scores
  async recalculateAllScores(): Promise<number> {
    const { data, error } = await supabase.rpc('recalculate_all_health_scores');
    if (error) throw error;
    return data as number;
  },

  // Calculate score for a single customer
  async calculateCustomerScore(customerId: number): Promise<CustomerHealthScore> {
    const { data, error } = await supabase.rpc('calculate_customer_health_score', {
      p_customer_id: customerId
    });
    if (error) throw error;
    return data as CustomerHealthScore;
  }
};
```

---

## Phase 4: React Hook

**Copy and paste this into Bolt:**

```
Create the customer health hook: src/hooks/useCustomerHealth.ts

import { useState, useEffect, useCallback } from 'react';
import { customerHealthService } from '../services/customerHealthService';
import type { 
  CustomerHealthScore, 
  CustomerHealthAlert, 
  HealthScoreSummary,
  HealthStatus 
} from '../types/customerHealth';

export function useCustomerHealth() {
  const [scores, setScores] = useState<CustomerHealthScore[]>([]);
  const [alerts, setAlerts] = useState<CustomerHealthAlert[]>([]);
  const [summary, setSummary] = useState<HealthScoreSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<HealthStatus | 'all'>('all');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [scoresData, alertsData, summaryData] = await Promise.all([
        selectedStatus === 'all' 
          ? customerHealthService.getHealthScores()
          : customerHealthService.getHealthScoresByStatus(selectedStatus),
        customerHealthService.getActiveAlerts(),
        customerHealthService.getSummary()
      ]);

      setScores(scoresData);
      setAlerts(alertsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch health data'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await customerHealthService.acknowledgeAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await customerHealthService.dismissAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  };

  const recalculateScores = async () => {
    try {
      setIsLoading(true);
      await customerHealthService.recalculateAllScores();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to recalculate scores'));
    } finally {
      setIsLoading(false);
    }
  };

  const filterByStatus = (status: HealthStatus | 'all') => {
    setSelectedStatus(status);
  };

  return {
    scores,
    alerts,
    summary,
    isLoading,
    error,
    selectedStatus,
    filterByStatus,
    acknowledgeAlert,
    dismissAlert,
    recalculateScores,
    refresh: fetchData
  };
}
```

---

## Phase 5: UI Components - Health Matrix

**Copy and paste this into Bolt:**

```
Create the CustomerHealthMatrix component: src/components/admin/CustomerHealthMatrix.tsx

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import type { CustomerHealthScore, HealthStatus } from '../../types/customerHealth';
import { formatCurrency } from '../../utils/dateUtils';

interface Props {
  scores: CustomerHealthScore[];
  isLoading: boolean;
  selectedStatus: HealthStatus | 'all';
  statusCounts: Record<HealthStatus, number>;
  onStatusFilter: (status: HealthStatus | 'all') => void;
  onCustomerClick?: (customerId: number) => void;
}

const STATUS_CONFIG: Record<HealthStatus, { bg: string; text: string; bar: string }> = {
  thriving: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  healthy: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' },
  watch: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' },
  'at-risk': { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
};

export function CustomerHealthMatrix({
  scores,
  isLoading,
  selectedStatus,
  statusCounts,
  onStatusFilter,
  onCustomerClick
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getTrendIcon = (volumeChange: number | null, revenueChange: number | null) => {
    const avgChange = ((volumeChange || 0) + (revenueChange || 0)) / 2;
    if (avgChange > 5) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (avgChange < -5) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-slate-400" />;
  };

  const getTriggers = (score: CustomerHealthScore): string[] => {
    const triggers: string[] = [];
    if (score.volume_change_percent && score.volume_change_percent < -30) {
      triggers.push(`Volume down ${Math.abs(Math.round(score.volume_change_percent))}%`);
    }
    if (score.days_since_last_shipment && score.days_since_last_shipment > 14) {
      triggers.push(`No activity ${score.days_since_last_shipment} days`);
    }
    if (score.revenue_change_percent && score.revenue_change_percent < -30) {
      triggers.push(`Revenue down ${Math.abs(Math.round(score.revenue_change_percent))}%`);
    }
    return triggers;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="h-6 bg-slate-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Customer Health Matrix</h3>
          <div className="flex items-center gap-1">
            {(['thriving', 'healthy', 'watch', 'at-risk', 'critical'] as HealthStatus[]).map(status => (
              <button
                key={status}
                onClick={() => onStatusFilter(selectedStatus === status ? 'all' : status)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  selectedStatus === status
                    ? `${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].text}`
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].bar}`}></span>
                {statusCounts[status]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {scores.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No customers found. Run health score calculation to populate data.
          </div>
        ) : (
          scores.map(score => {
            const triggers = getTriggers(score);
            const config = STATUS_CONFIG[score.status];
            
            return (
              <div
                key={score.id}
                className={`flex items-center gap-3 p-4 border-b hover:bg-slate-50 cursor-pointer transition-colors ${
                  hoveredId === score.id ? 'bg-slate-50' : ''
                }`}
                onMouseEnter={() => setHoveredId(score.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onCustomerClick?.(score.customer_id)}
              >
                <div className={`w-1 h-14 rounded-full ${config.bar}`}></div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800 truncate">
                      {score.customer_name}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatCurrency(score.revenue_current_period.toString())}</span>
                      <span>•</span>
                      <span>{score.shipments_current_period} ships</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${config.bar} rounded-full transition-all`}
                        style={{ width: `${score.overall_score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-8">
                      {score.overall_score}
                    </span>
                    {getTrendIcon(score.volume_change_percent, score.revenue_change_percent)}
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>

                  {triggers.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {triggers.map((trigger, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

---

## Phase 6: UI Components - Alerts Panel

**Copy and paste this into Bolt:**

```
Create the HealthAlertsPanel component: src/components/admin/HealthAlertsPanel.tsx

import { Bell, Check, X, AlertTriangle } from 'lucide-react';
import type { CustomerHealthAlert, AlertSeverity } from '../../types/customerHealth';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  alerts: CustomerHealthAlert[];
  isLoading: boolean;
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { bg: string; icon: string }> = {
  critical: { bg: 'bg-red-100', icon: 'text-red-600' },
  high: { bg: 'bg-orange-100', icon: 'text-orange-600' },
  medium: { bg: 'bg-amber-100', icon: 'text-amber-600' },
  low: { bg: 'bg-blue-100', icon: 'text-blue-600' },
};

export function HealthAlertsPanel({ alerts, isLoading, onAcknowledge, onDismiss }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="h-6 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-slate-800">Health Alerts</h3>
        </div>
        {alerts.length > 0 && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            {alerts.length}
          </span>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No active alerts</p>
          </div>
        ) : (
          alerts.map(alert => {
            const config = SEVERITY_CONFIG[alert.severity];
            
            return (
              <div key={alert.id} className="p-4 border-b hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded ${config.bg}`}>
                    <AlertTriangle className={`w-4 h-4 ${config.icon}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800">
                        {alert.customer_name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{alert.message}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Acknowledge
                      </button>
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

---

## Phase 7: Update AdminDashboardPage

**Copy and paste this into Bolt:**

```
Update the AdminDashboardPage.tsx to include the new health scoring components. Add these imports and integrate the new components:

First, add the imports at the top of src/pages/AdminDashboardPage.tsx:

import { Activity, AlertTriangle } from 'lucide-react';
import { useCustomerHealth } from '../hooks/useCustomerHealth';
import { CustomerHealthMatrix } from '../components/admin/CustomerHealthMatrix';
import { HealthAlertsPanel } from '../components/admin/HealthAlertsPanel';

Then update the component to include these new sections. Add the health hook usage:

const {
  scores: healthScores,
  alerts: healthAlerts,
  summary: healthSummary,
  isLoading: isLoadingHealth,
  selectedStatus,
  filterByStatus,
  acknowledgeAlert,
  dismissAlert,
  recalculateScores
} = useCustomerHealth();

Update the metrics grid to be 6 columns (adding 2 new health KPIs). After the existing 4 MetricCards, add:

<MetricCard
  label="Avg Health Score"
  value={healthSummary?.avgScore || 0}
  icon={Activity}
  iconColor="success"
  isLoading={isLoadingHealth}
/>
<MetricCard
  label="At Risk"
  value={healthSummary?.atRiskCount || 0}
  icon={AlertTriangle}
  iconColor="coral"
  isLoading={isLoadingHealth}
/>

Change the grid from "lg:grid-cols-4" to "lg:grid-cols-6" for the metric cards.

Then add a new section below the existing tables for the health components:

{/* Customer Health Section */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    <CustomerHealthMatrix
      scores={healthScores}
      isLoading={isLoadingHealth}
      selectedStatus={selectedStatus}
      statusCounts={healthSummary?.statusCounts || {
        thriving: 0,
        healthy: 0,
        watch: 0,
        'at-risk': 0,
        critical: 0
      }}
      onStatusFilter={filterByStatus}
      onCustomerClick={handleCustomerClick}
    />
  </div>
  <div>
    <HealthAlertsPanel
      alerts={healthAlerts}
      isLoading={isLoadingHealth}
      onAcknowledge={acknowledgeAlert}
      onDismiss={dismissAlert}
    />
  </div>
</div>

Also add a "Recalculate Health Scores" button near the Refresh button in the header:

<button
  onClick={recalculateScores}
  disabled={isLoadingHealth}
  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 transition-colors text-sm disabled:opacity-50"
>
  <Activity className="w-4 h-4" />
  Calculate Health
</button>
```

---

## Phase 8: Initial Data Population (Run in Supabase SQL Editor)

**After all phases are deployed, run this SQL in your Supabase SQL Editor to populate initial health scores:**

```sql
-- Run the health score calculation for all customers
SELECT recalculate_all_health_scores();

-- Verify the data was created
SELECT 
  status, 
  COUNT(*) as count,
  ROUND(AVG(overall_score)) as avg_score
FROM customer_health_scores
GROUP BY status
ORDER BY avg_score DESC;
```

---

## Summary of Files Created/Modified

### New Files:
1. `supabase/migrations/20251231000000_create_customer_health_scoring.sql`
2. `supabase/migrations/20251231000001_create_health_score_functions.sql`
3. `src/types/customerHealth.ts`
4. `src/services/customerHealthService.ts`
5. `src/hooks/useCustomerHealth.ts`
6. `src/components/admin/CustomerHealthMatrix.tsx`
7. `src/components/admin/HealthAlertsPanel.tsx`

### Modified Files:
1. `src/pages/AdminDashboardPage.tsx`

---

## Testing Checklist

After implementation, verify:
- [ ] Migration runs without errors
- [ ] Health scores table is created
- [ ] RLS policies are working (admin-only access)
- [ ] `recalculate_all_health_scores()` function populates data
- [ ] AdminDashboardPage shows new health KPI cards
- [ ] CustomerHealthMatrix displays customer scores
- [ ] Status filters work correctly
- [ ] HealthAlertsPanel shows active alerts
- [ ] Acknowledge/Dismiss buttons work
- [ ] Clicking a customer row triggers `onCustomerClick`
