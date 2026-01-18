import { useState, useEffect, useCallback } from 'react';
import {
  getAnomalyDashboardSummary,
  getAdminAnomalySummary,
  runAnomalyScan,
  AnomalySummary,
  AdminAnomalySummary,
} from '../services/anomalyDetectionService';

interface UseAnomalyDashboardOptions {
  customerId?: number;
  isAdmin?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAnomalyDashboard({
  customerId,
  isAdmin = false,
  autoRefresh = true,
  refreshInterval = 60000,
}: UseAnomalyDashboardOptions) {
  const [summary, setSummary] = useState<AnomalySummary | AdminAnomalySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      let data: AnomalySummary | AdminAnomalySummary;

      if (isAdmin) {
        data = await getAdminAnomalySummary();
      } else if (customerId) {
        data = await getAnomalyDashboardSummary(customerId);
      } else {
        return;
      }

      setSummary(data);
      setError(null);
    } catch (err) {
      console.error('[useAnomalyDashboard] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [customerId, isAdmin]);

  useEffect(() => {
    fetchSummary();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchSummary, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSummary, autoRefresh, refreshInterval]);

  const triggerScan = useCallback(async (force: boolean = false) => {
    setScanning(true);
    try {
      const result = await runAnomalyScan(isAdmin ? undefined : customerId, force);
      await fetchSummary();
      return result;
    } catch (err) {
      console.error('[useAnomalyDashboard] Scan error:', err);
      throw err;
    } finally {
      setScanning(false);
    }
  }, [customerId, isAdmin, fetchSummary]);

  return {
    summary,
    loading,
    error,
    scanning,
    refetch: fetchSummary,
    triggerScan,
  };
}
