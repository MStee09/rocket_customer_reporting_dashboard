import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { customerMetricsConfig } from '../config/customerMetrics';
import { MetricConfig } from '../types/metrics';

export function useCustomerMetrics() {
  const { effectiveCustomerIds, isAdmin, isViewingAsCustomer } = useAuth();

  const metrics = useMemo(() => {
    if (isAdmin() && !isViewingAsCustomer) {
      return [];
    }

    if (!effectiveCustomerIds || effectiveCustomerIds.length === 0) {
      return [];
    }

    const allMetrics: MetricConfig[] = [];
    const seenKeys = new Set<string>();

    effectiveCustomerIds.forEach((customerId) => {
      const customerMetrics = customerMetricsConfig[customerId];
      if (customerMetrics) {
        customerMetrics.forEach((metric) => {
          if (!seenKeys.has(metric.key)) {
            allMetrics.push(metric);
            seenKeys.add(metric.key);
          }
        });
      }
    });

    return allMetrics;
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer]);

  const hasMetric = (metricKey: string): boolean => {
    return metrics.some((metric) => metric.key === metricKey);
  };

  return {
    metrics,
    hasMetric,
  };
}
