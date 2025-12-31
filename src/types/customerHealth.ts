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
  customer_name?: string;
}

export interface HealthScoreSummary {
  totalCustomers: number;
  avgScore: number;
  atRiskCount: number;
  atRiskRevenue: number;
  statusCounts: Record<HealthStatus, number>;
}
