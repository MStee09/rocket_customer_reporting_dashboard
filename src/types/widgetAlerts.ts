export type WidgetState = 'ambient' | 'active';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';

export type AlertStatus = 'active' | 'acknowledged' | 'dismissed' | 'snoozed' | 'resolved';

export type AlertType =
  | 'volume_spike'
  | 'volume_drop'
  | 'spend_spike'
  | 'spend_drop'
  | 'carrier_concentration'
  | 'carrier_cost_up'
  | 'carrier_cost_down'
  | 'mode_shift'
  | 'new_region'
  | 'regional_spike'
  | 'on_time_drop'
  | 'transit_time_increase'
  | 'cost_per_unit_spike'
  | 'spend_anomaly'
  | 'volume_anomaly'
  | 'carrier_shift';

export interface WidgetAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  change_percent?: number;
  current_value?: number;
  previous_value?: number;
  investigate_query?: string;
  methodology?: string;
  triggered_at: string;
}

export interface WidgetAlertGroup {
  widget_key: string;
  alert_count: number;
  max_severity: AlertSeverity;
  alerts: WidgetAlert[];
}

export interface DashboardAlertContextValue {
  alertsByWidget: Record<string, WidgetAlert[]>;
  totalAlerts: number;
  widgetsWithAlerts: string[];
  isLoading: boolean;
  error: Error | null;
  getAlertsForWidget: (widgetKey: string) => WidgetAlert[];
  getStateForWidget: (widgetKey: string) => WidgetState;
  getMaxSeverityForWidget: (widgetKey: string) => AlertSeverity | null;
  dismissAlert: (alertId: string) => Promise<void>;
  snoozeAlert: (alertId: string, minutes: number) => Promise<void>;
  dismissAllForWidget: (widgetKey: string) => Promise<void>;
  snoozeAllForWidget: (widgetKey: string, minutes: number) => Promise<void>;
  refetch: () => void;
  inspectorWidgetKey: string | null;
  openInspector: (widgetKey: string) => void;
  closeInspector: () => void;
}

export const SEVERITY_COLORS: Record<AlertSeverity, {
  bg: string;
  text: string;
  border: string;
  badge: string;
  dot: string;
  ring: string;
}> = {
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-500',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    ring: 'ring-red-500/30',
  },
  warning: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-500',
    ring: 'ring-orange-500/30',
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
    ring: 'ring-blue-500/30',
  },
  success: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-500',
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
    ring: 'ring-green-500/30',
  },
};

export function getSeverityScore(severity: AlertSeverity): number {
  const scores: Record<AlertSeverity, number> = { critical: 3, warning: 2, info: 1, success: 0 };
  return scores[severity] ?? 0;
}

export function getMaxSeverity(alerts: WidgetAlert[]): AlertSeverity | null {
  if (!alerts || alerts.length === 0) return null;
  return alerts.reduce((max, alert) => {
    return getSeverityScore(alert.severity) > getSeverityScore(max) ? alert.severity : max;
  }, alerts[0].severity);
}

export const ALERT_WIDGET_MAP: Record<AlertType, string> = {
  volume_spike: 'total_shipments',
  volume_drop: 'total_shipments',
  spend_spike: 'total_spend',
  spend_drop: 'total_spend',
  carrier_concentration: 'carrier_mix',
  carrier_cost_up: 'carrier_mix',
  carrier_cost_down: 'carrier_mix',
  mode_shift: 'shipments_by_mode',
  new_region: 'flow_map',
  regional_spike: 'cost_by_state',
  on_time_drop: 'on_time_pct',
  transit_time_increase: 'avg_transit_days',
  cost_per_unit_spike: 'avg_cost_per_shipment',
  spend_anomaly: 'total_spend',
  volume_anomaly: 'total_shipments',
  carrier_shift: 'carrier_mix',
};
