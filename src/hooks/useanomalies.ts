import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Anomaly {
  id: string;
  anomaly_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric: string;
  current_value: number;
  baseline_value: number;
  change_percent: number;
  affected_dimension?: string;
  affected_value?: string;
  status: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
  detection_date: string;
  suggested_actions: Array<{ action: string; priority: string }>;
  created_at: string;
}

interface UseAnomaliesOptions {
  customerId: string;
  status?: string | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAnomalies({
  customerId,
  status = 'new',
  autoRefresh = true,
  refreshInterval = 60000
}: UseAnomaliesOptions) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    if (!customerId) return;

    try {
      const { data, error: rpcError } = await supabase.rpc('get_customer_anomalies', {
        p_customer_id: customerId,
        p_status: status,
        p_limit: 20
      });

      if (rpcError) throw rpcError;
      setAnomalies(data || []);
      setError(null);
    } catch (err) {
      console.error('[useAnomalies] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  }, [customerId, status]);

  useEffect(() => {
    fetchAnomalies();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchAnomalies, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAnomalies, autoRefresh, refreshInterval]);

  const acknowledgeAnomaly = async (anomalyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('update_anomaly_status', {
      p_anomaly_id: anomalyId,
      p_status: 'acknowledged',
      p_user_id: user?.id
    });
    fetchAnomalies();
  };

  const dismissAnomaly = async (anomalyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('update_anomaly_status', {
      p_anomaly_id: anomalyId,
      p_status: 'dismissed',
      p_user_id: user?.id
    });
    fetchAnomalies();
  };

  const resolveAnomaly = async (anomalyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('update_anomaly_status', {
      p_anomaly_id: anomalyId,
      p_status: 'resolved',
      p_user_id: user?.id
    });
    fetchAnomalies();
  };

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const warningCount = anomalies.filter(a => a.severity === 'warning').length;
  const newCount = anomalies.filter(a => a.status === 'new').length;

  return {
    anomalies,
    loading,
    error,
    criticalCount,
    warningCount,
    newCount,
    refetch: fetchAnomalies,
    acknowledgeAnomaly,
    dismissAnomaly,
    resolveAnomaly
  };
}
