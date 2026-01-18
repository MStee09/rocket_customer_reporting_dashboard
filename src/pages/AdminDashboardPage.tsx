import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Package, DollarSign, TrendingUp, Users, Activity, AlertTriangle, Calculator } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, addMonths, addDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MetricCard } from '../components/dashboard/MetricCard';
import { CustomerActivityTable } from '../components/dashboard/CustomerActivityTable';
import { TopCustomersTable } from '../components/dashboard/TopCustomersTable';
import { CustomerHealthMatrix } from '../components/admin/CustomerHealthMatrix';
import { HealthAlertsPanel } from '../components/admin/HealthAlertsPanel';
import { AdminUnifiedInsightsCard } from '../components/admin/adminunifiedinsightscard';
import { formatCurrency } from '../utils/dateUtils';
import { CustomerData } from '../types/dashboard';
import { useCustomerHealth } from '../hooks/useCustomerHealth';

export function AdminDashboardPage() {
  const [dateRange, setDateRange] = useState('last6months');
  const { setViewingAsCustomerId } = useAuth();

  const {
    scores: healthScores,
    alerts: healthAlerts,
    summary: healthSummary,
    isLoading: isLoadingHealth,
    selectedStatus,
    filterByStatus,
    acknowledgeAlert,
    dismissAlert,
    recalculateScores
  } = useCustomerHealth();

  const [isRecalculating, setIsRecalculating] = useState(false);

  const [metrics, setMetrics] = useState({
    totalShipments: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    avgRevenuePerShipment: 0,
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [topCustomersData, setTopCustomersData] = useState<CustomerData[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  const computedDateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateRange) {
      case 'last7':
        start = subDays(now, 7);
        break;
      case 'last30':
        start = subDays(now, 30);
        break;
      case 'last90':
        start = subDays(now, 90);
        break;
      case 'last6months':
        start = subMonths(now, 6);
        break;
      case 'lastyear':
        start = subMonths(now, 12);
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'thisQuarter':
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case 'thisYear':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'upcoming':
        start = now;
        end = addMonths(now, 12);
        break;
      case 'next30':
        start = now;
        end = addDays(now, 30);
        break;
      case 'next90':
        start = now;
        end = addDays(now, 90);
        break;
      default:
        start = subMonths(now, 6);
    }

    return { start, end };
  }, [dateRange]);

  const startDate = format(computedDateRange.start, 'yyyy-MM-dd');
  const endDate = format(computedDateRange.end, 'yyyy-MM-dd');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingMetrics(true);
      setIsLoadingCustomers(true);

      const { data: shipments } = await supabase
        .from('shipment')
        .select('customer_id, retail')
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      const { data: customers } = await supabase
        .from('customer')
        .select('customer_id, company_name')
        .eq('is_active', true);

      if (shipments) {
        const totalShipments = shipments.length;
        const totalRevenue = shipments.reduce((sum, s) => sum + (s.retail || 0), 0);
        const uniqueCustomers = new Set(shipments.map(s => s.customer_id)).size;
        const avgRevenuePerShipment = totalShipments > 0 ? totalRevenue / totalShipments : 0;

        setMetrics({
          totalShipments,
          totalRevenue,
          activeCustomers: uniqueCustomers,
          avgRevenuePerShipment,
        });

        if (customers) {
          const customerMap = new Map(
            customers.map((c) => [c.customer_id, c.company_name])
          );

          const customerStats = new Map<
            number,
            { shipmentCount: number; totalSpend: number }
          >();

          shipments.forEach((s) => {
            const current = customerStats.get(s.customer_id) || {
              shipmentCount: 0,
              totalSpend: 0,
            };
            customerStats.set(s.customer_id, {
              shipmentCount: current.shipmentCount + 1,
              totalSpend: current.totalSpend + (s.retail || 0),
            });
          });

          const topCustomers: CustomerData[] = Array.from(customerStats.entries())
            .map(([customerId, stats]) => ({
              customerId,
              customerName: customerMap.get(customerId) || `Customer ${customerId}`,
              shipmentCount: stats.shipmentCount,
              totalSpend: stats.totalSpend,
              avgCostPerShipment: stats.totalSpend / stats.shipmentCount,
            }))
            .sort((a, b) => b.totalSpend - a.totalSpend)
            .slice(0, 10);

          setTopCustomersData(topCustomers);
        }
      }

      setIsLoadingMetrics(false);
      setIsLoadingCustomers(false);
    };

    fetchData();
  }, [startDate, endDate]);

  const handleCustomerClick = (customerId: number) => {
    setViewingAsCustomerId(customerId);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleRecalculateHealth = async () => {
    setIsRecalculating(true);
    try {
      await recalculateScores();
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-6 py-8 max-w-[1600px]">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Admin Dashboard</h1>
            <p className="text-slate-600">Overview of all customers and operations</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500 text-sm"
            >
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="last6months">Last 6 Months</option>
              <option value="lastyear">Last Year</option>
              <option value="thisMonth">This Month</option>
              <option value="thisQuarter">This Quarter</option>
              <option value="thisYear">This Year</option>
              <option value="next30">Next 30 Days</option>
              <option value="next90">Next 90 Days</option>
              <option value="upcoming">Upcoming (Next Year)</option>
            </select>
            <button
              onClick={handleRecalculateHealth}
              disabled={isRecalculating}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <Calculator className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
              {isRecalculating ? 'Calculating...' : 'Calculate Health'}
            </button>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <AdminUnifiedInsightsCard
            dateRange={computedDateRange}
            onCustomerClick={handleCustomerClick}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <MetricCard
              label="Total Shipments"
              value={metrics.totalShipments}
              icon={Package}
              iconColor="info"
              isLoading={isLoadingMetrics}
            />
            <MetricCard
              label="Total Revenue"
              value={formatCurrency(metrics.totalRevenue.toString())}
              icon={DollarSign}
              iconColor="success"
              isLoading={isLoadingMetrics}
            />
            <MetricCard
              label="Active Customers"
              value={metrics.activeCustomers}
              icon={Users}
              iconColor="coral"
              isLoading={isLoadingMetrics}
            />
            <MetricCard
              label="Avg per Shipment"
              value={formatCurrency(metrics.avgRevenuePerShipment.toString())}
              icon={TrendingUp}
              iconColor="orange"
              isLoading={isLoadingMetrics}
            />
            <MetricCard
              label="Avg Health Score"
              value={healthSummary?.avgScore ?? 0}
              icon={Activity}
              iconColor="info"
              isLoading={isLoadingHealth}
            />
            <MetricCard
              label="At Risk Customers"
              value={healthSummary?.atRiskCount ?? 0}
              icon={AlertTriangle}
              iconColor="warning"
              isLoading={isLoadingHealth}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <CustomerActivityTable
                startDate={startDate}
                endDate={endDate}
                onCustomerClick={handleCustomerClick}
              />
            </div>
            <div className="lg:col-span-2">
              <TopCustomersTable
                data={topCustomersData}
                isLoading={isLoadingCustomers}
                onCustomerClick={handleCustomerClick}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CustomerHealthMatrix
                scores={healthScores}
                isLoading={isLoadingHealth}
                selectedStatus={selectedStatus}
                statusCounts={healthSummary?.statusCounts ?? { thriving: 0, healthy: 0, watch: 0, 'at-risk': 0, critical: 0 }}
                onStatusFilter={filterByStatus}
                onCustomerClick={handleCustomerClick}
              />
            </div>
            <div>
              <HealthAlertsPanel
                alerts={healthAlerts}
                isLoading={isLoadingHealth}
                onAcknowledge={acknowledgeAlert}
                onDismiss={dismissAlert}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
