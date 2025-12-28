import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCustomerMetrics } from '../hooks/useCustomerMetrics';
import { ProtectedRoute } from './ProtectedRoute';

interface MetricProtectedRouteProps {
  children: ReactNode;
  metricKey: string;
}

export function MetricProtectedRoute({ children, metricKey }: MetricProtectedRouteProps) {
  const { hasMetric } = useCustomerMetrics();

  if (!hasMetric(metricKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
