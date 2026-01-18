import { supabase } from '../lib/supabase';

export interface AnomalyScanResult {
  success: boolean;
  customer_id?: number;
  anomalies_found?: number;
  skipped?: boolean;
  reason?: string;
  scan_period?: {
    baseline_start: string;
    baseline_end: string;
    current_start: string;
    current_end: string;
  };
  scanned_at?: string;
  error?: string;
}

export interface BatchScanResult {
  success: boolean;
  customers_scanned: number;
  total_anomalies_found: number;
  scan_completed_at: string;
  details: Array<{
    customer_id: number;
    result: AnomalyScanResult;
  }>;
}

export interface AnomalySummary {
  total_new: number;
  total_acknowledged: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  by_type: Record<string, number>;
  recent_anomalies: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    change_percent: number;
    detected_at: string;
  }>;
}

export interface AdminAnomalySummary extends AnomalySummary {
  customers_affected: number;
  anomalies_by_customer: Array<{
    customer_id: number;
    customer_name: string;
    critical_count: number;
    warning_count: number;
    info_count: number;
    total: number;
  }>;
  recent_critical: Array<{
    id: string;
    customer_id: number;
    customer_name: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    change_percent: number;
    detected_at: string;
  }>;
}

export interface AnomalyConfig {
  id: number;
  customer_id: number | null;
  detect_spend_anomalies: boolean;
  detect_volume_anomalies: boolean;
  detect_concentration_risk: boolean;
  detect_lane_anomalies: boolean;
  spend_warning_threshold: number;
  spend_critical_threshold: number;
  volume_warning_threshold: number;
  volume_critical_threshold: number;
  concentration_risk_threshold: number;
  baseline_period_days: number;
  comparison_period_days: number;
  is_active: boolean;
  last_scan_at: string | null;
  scan_frequency_hours: number;
}

const getEdgeFunctionUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/run-anomaly-detection`;
};

export async function runAnomalyScan(
  customerId?: number,
  force: boolean = false
): Promise<AnomalyScanResult | BatchScanResult> {
  const url = getEdgeFunctionUrl();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      customer_id: customerId,
      force,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run anomaly scan');
  }

  return response.json();
}

export async function getAnomalyDashboardSummary(
  customerId: number
): Promise<AnomalySummary> {
  const { data, error } = await supabase.rpc('get_anomaly_dashboard_summary', {
    p_customer_id: customerId,
  });

  if (error) throw error;
  return data;
}

export async function getAdminAnomalySummary(): Promise<AdminAnomalySummary> {
  const { data, error } = await supabase.rpc('get_admin_anomaly_summary');

  if (error) throw error;
  return data;
}

export async function getAnomalyConfig(
  customerId?: number
): Promise<AnomalyConfig | null> {
  let query = supabase
    .from('anomaly_detection_config')
    .select('*');

  if (customerId) {
    query = query.eq('customer_id', customerId);
  } else {
    query = query.is('customer_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateAnomalyConfig(
  customerId: number,
  config: Partial<AnomalyConfig>
): Promise<AnomalyConfig> {
  const { data, error } = await supabase
    .from('anomaly_detection_config')
    .upsert({
      customer_id: customerId,
      ...config,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'customer_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cleanupOldAnomalies(
  retentionDays: number = 90
): Promise<number> {
  const { data, error } = await supabase.rpc('cleanup_old_anomalies', {
    p_retention_days: retentionDays,
  });

  if (error) throw error;
  return data;
}
