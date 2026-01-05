import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { DashboardAlertProvider } from '../contexts/DashboardAlertContext';
import {
  PulseHeader,
  ExploreAnalyticsCTA,
  ExecutiveMetricsRow,
  SpendTrendChart,
  TopCarriersCompact,
} from '../components/pulse';
import { UnifiedInsightsCard } from '../components/dashboard/UnifiedInsightsCard';
import { AnomalyAlerts } from '../components/ai/AnomalyAlerts';
import { AlertInspectorPanel } from '../components/dashboard/widgets';
import { AdminDashboardPage } from './AdminDashboardPage';
import type { Anomaly } from '../hooks/useAnomalies';

export function PulseDashboardPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('last30');
  const { user, isAdmin, effectiveCustomerIds, isViewingAsCustomer, effectiveCustomerId } = useAuth();

  const showAdminDashboard = isAdmin() && !isViewingAsCustomer;
  const customerId = effectiveCustomerIds.length > 0 ? effectiveCustomerIds[0] : undefined;

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateRange) {
      case 'last7': start = subDays(now, 7); break;
      case 'last30': start = subDays(now, 30); break;
      case 'last90': start = subDays(now, 90); break;
      case 'thisMonth': start = startOfMonth(now); end = endOfMonth(now); break;
      case 'lastMonth': start = startOfMonth(subMonths(now, 1)); end = endOfMonth(subMonths(now, 1)); break;
      default: start = subDays(now, 30);
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  const handleInvestigateAnomaly = useCallback((anomaly: Anomaly) => {
    const query = `Investigate this anomaly: ${anomaly.title}. ${anomaly.description}. Why did ${anomaly.metric} change by ${anomaly.change_percent}%?`;
    navigate(`/ai-studio?query=${encodeURIComponent(query)}`);
  }, [navigate]);

  const handleExploreAnalytics = useCallback(() => {
    navigate('/analytics');
  }, [navigate]);

  if (showAdminDashboard) {
    return <AdminDashboardPage />;
  }

  return (
    <DashboardAlertProvider customerId={customerId}>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <PulseHeader
            userName={user?.email?.split('@')[0] || 'User'}
            isViewingAsCustomer={isViewingAsCustomer}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />

          <div className="space-y-6 mt-6">
            {effectiveCustomerId && (
              <UnifiedInsightsCard
                customerId={effectiveCustomerId}
                isAdmin={isAdmin()}
                dateRange={{
                  start: new Date(startDate),
                  end: new Date(endDate),
                }}
              />
            )}

            {effectiveCustomerId && (
              <AnomalyAlerts
                customerId={String(effectiveCustomerId)}
                onInvestigate={handleInvestigateAnomaly}
              />
            )}

            {customerId && (
              <ExecutiveMetricsRow
                customerId={customerId.toString()}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {customerId && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SpendTrendChart
                  customerId={customerId.toString()}
                  startDate={startDate}
                  endDate={endDate}
                />
                <TopCarriersCompact
                  customerId={customerId.toString()}
                  startDate={startDate}
                  endDate={endDate}
                />
              </div>
            )}

            <ExploreAnalyticsCTA onClick={handleExploreAnalytics} />
          </div>
        </div>
      </div>

      <AlertInspectorPanel />
    </DashboardAlertProvider>
  );
}
