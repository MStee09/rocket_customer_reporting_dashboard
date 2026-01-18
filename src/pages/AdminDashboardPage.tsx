import { useState, useEffect } from 'react';
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

  const getDateRange = () => {
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
      default:
        start = subMonths(now, 6);
    }

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    };
  };

  const { start: startDate, end: endDate } = getDateRange();

  const fetchMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const { data, error } = await supabase
        .from('shipment')
        .select('load_id, retail, customer_id')
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (error) throw error;

      const totalShipments = data?.length || 0;
      const totalRevenue = data?.reduce((sum, s) => sum + (s.retail || 0), 0) || 0;
      const uniqueCustomers = new Set(data?.map(s => s.customer_id)).size;

      setMetrics({
        totalShipments,
        totalRevenue,
        activeCustomers: uniqueCustomers,
        avgRevenuePerShipment: totalShipments > 0 ? totalRevenue / totalShipments : 0,
      });
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchTopCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('shipment')
        .select(`
          customer_id,
          retail,
          customer:customer_id (
            company_name
          )
        `)
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (error) throw error;

      // Aggregate by customer
      const customerMap = new Map<number, { name: string; spend: number; shipments: number }>();
      
      data?.forEach((s: any) => {
        const existing = customerMap.get(s.customer_id) || {
          name: s.customer?.company_name || `Customer ${s.customer_id}`,
          spend: 0,
          shipments: 0,
        };
        existing.spend += s.retail || 0;
        existing.shipments += 1;
        customerMap.set(s.customer_id, existing);
      });

      const customers: CustomerData[] = Array.from(customerMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          totalSpend: data.spend,
          shipmentCount: data.shipments,
          avgCost: data.shipments > 0 ? data.spend / data.shipments : 0,
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 10);

      setTopCustomersData(customers);
    } catch (err) {
      console.error('Error fetching top customers:', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchTopCustomers();
  }, [dateRange]);

  const handleRefresh = () => {
    fetchMetrics();
    fetchTopCustomers();
  };

  const handleCustomerClick = (customerId: number) => {
    setViewingAsCustomerId(customerId);
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
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500">Overview of all customers and operations</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="last6months">Last 6 Months</option>
              <option value="lastyear">Last Year</option>
              <option value="thisMonth">This Month</option>
              <option value="thisQuarter">This Quarter</option>
              <option value="thisYear">This Year</option>
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
          {/* AI Insights Card - unified cross-customer view */}
          <AdminUnifiedInsightsCard 
            dateRange={{
              start: new Date(startDate),
              end: new Date(endDate),
            }}
            onCustomerClick={handleCustomerClick} 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <MetricCard
              label="Total Shipments"
              value={metrics?.totalShipments ?? 0}
              icon={Package}
              iconColor="info"
              isLoading={isLoadingMetrics}
            />
            <MetricCard
              label="Total Revenue"
              value={formatCurrency(String(metrics?.totalRevenue ?? 0))}
              icon={DollarSign}
              iconColor="success"
              isLoading={isLoadingMetrics}
            />
            <MetricCard
              label="Active Customers"
              value={metrics?.activeCustomers ?? 0}
              icon={Users}
              iconColor="coral"
              isLoading={isLoadingMetrics}
            />
            <MetricCard
              label="Avg per Shipment"
              value={formatCurrency(String(metrics?.avgRevenuePerShipment ?? 0))}
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
