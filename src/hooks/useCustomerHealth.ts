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
