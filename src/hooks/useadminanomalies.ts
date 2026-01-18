import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminAnomaly {
  id: string;
  customer_id: number;
  customer_name: string;
  anomaly_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  change_percent: number;
  detected_at: string;
}

export interface CustomerAnomalySummary {
  customer_id: number;
  customer_name: string;
  critical_count: number;
  warning_count: number;
  info_count: number;
  total: number;
}

export interface AdminAnomalySummary {
  total_new: number;
  total_acknowledged: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  customers_affected: number;
  by_type: Record<string, number>;
  anomalies_by_customer: CustomerAnomalySummary[];
  recent_critical: AdminAnomaly[];
}

interface UseAdminAnomaliesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAdminAnomalies({
  autoRefresh = true,
  refreshInterval = 60000
}: UseAdminAnomaliesOptions = {}) {
  const [summary, setSummary] = useState<AdminAnomalySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_anomaly_summary');

      if (rpcError) throw rpcError;
      
      setSummary(data as AdminAnomalySummary);
      setError(null);
    } catch (err) {
      console.error('[useAdminAnomalies] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin anomaly summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchSummary, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSummary, autoRefresh, refreshInterval]);

  const acknowledgeAnomaly = async (anomalyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('update_anomaly_status', {
      p_anomaly_id: anomalyId,
      p_status: 'acknowledged',
      p_user_id: user?.id
    });
    fetchSummary();
  };

  const dismissAnomaly = async (anomalyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('update_anomaly_status', {
      p_anomaly_id: anomalyId,
      p_status: 'dismissed',
      p_user_id: user?.id
    });
    fetchSummary();
  };

  const runScan = async (customerId?: number, force: boolean = true) => {
    try {
      setLoading(true);
      
      const response = await supabase.functions.invoke('run-anomaly-detection', {
        body: { customer_id: customerId, force }
      });
      
      if (response.error) throw response.error;
      
      // Refresh the summary after scan
      await fetchSummary();
      
      return response.data;
    } catch (err) {
      console.error('[useAdminAnomalies] Scan error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
    acknowledgeAnomaly,
    dismissAnomaly,
    runScan,
    // Convenience accessors
    totalNew: summary?.total_new ?? 0,
    criticalCount: summary?.critical_count ?? 0,
    warningCount: summary?.warning_count ?? 0,
    customersAffected: summary?.customers_affected ?? 0,
    recentCritical: summary?.recent_critical ?? [],
    anomaliesByCustomer: summary?.anomalies_by_customer ?? []
  };
}
