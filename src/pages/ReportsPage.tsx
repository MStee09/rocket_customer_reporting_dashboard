import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getSecureTable } from '../utils/getSecureTable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ReportData {
  customerStats: any[];
  carrierStats: any[];
  modeDistribution: any[];
  statusDistribution: any[];
}

import { chartColors } from '../config/chartTheme';
const COLORS = chartColors.primary;

export function ReportsPage() {
  const { isAdmin, effectiveCustomerIds, isViewingAsCustomer } = useAuth();
  const [data, setData] = useState<ReportData>({
    customerStats: [],
    carrierStats: [],
    modeDistribution: [],
    statusDistribution: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer]);

  const loadReportData = async () => {
    setIsLoading(true);

    const table = getSecureTable('shipment', isAdmin(), isViewingAsCustomer);

    let query = supabase
      .from(table)
      .select(`
        load_id,
        customer_id,
        customer:customer_id(company_name),
        carrier:rate_carrier_id(carrier_name),
        shipment_mode:mode_id(mode_name),
        shipment_status:status_id(status_name)
      `);

    if (!isAdmin() || isViewingAsCustomer) {
      query = query.in('customer_id', effectiveCustomerIds);
    }

    const { data: shipments } = await query;

    if (shipments) {
      const customerCounts: { [key: string]: number } = {};
      const carrierCounts: { [key: string]: number } = {};
      const modeCounts: { [key: string]: number } = {};
      const statusCounts: { [key: string]: number } = {};

      shipments.forEach((s: any) => {
        const customerName = s.customer?.company_name || 'Unknown';
        customerCounts[customerName] = (customerCounts[customerName] || 0) + 1;

        const carrierName = s.carrier?.carrier_name || 'Unknown';
        carrierCounts[carrierName] = (carrierCounts[carrierName] || 0) + 1;

        const modeName = s.shipment_mode?.mode_name || 'Unknown';
        modeCounts[modeName] = (modeCounts[modeName] || 0) + 1;

        const statusName = s.shipment_status?.status_name || 'Unknown';
        statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
      });

      const customerStats = Object.entries(customerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const carrierStats = Object.entries(carrierCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const modeDistribution = Object.entries(modeCounts).map(([name, value]) => ({
        name,
        value,
      }));

      const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
      }));

      setData({
        customerStats,
        carrierStats,
        modeDistribution,
        statusDistribution,
      });
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
        </div>
      </div>
    );
  }

  const showCustomerComparison = isAdmin() && !isViewingAsCustomer;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Reports & Analytics</h1>
        <p className="text-slate-600 mt-1">Visual insights into your freight data</p>
      </div>

      <div className={`grid ${showCustomerComparison ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-3xl mx-auto'} gap-6 mb-6`}>
        {showCustomerComparison && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-rocket-600" />
              <h2 className="text-xl font-bold text-slate-800">Top 10 Customers by Volume</h2>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.customerStats} margin={{ bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} fontSize={10} interval={0} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={chartColors.primary[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-rocket-600" />
            <h2 className="text-xl font-bold text-slate-800">Top 10 Carriers by Volume</h2>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.carrierStats} margin={{ bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} fontSize={10} interval={0} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={chartColors.primary[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Mode Distribution</h2>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={data.modeDistribution}
                cx="50%"
                cy="40%"
                labelLine={false}
                label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.modeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ paddingTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={data.statusDistribution}
                cx="50%"
                cy="40%"
                labelLine={false}
                label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ paddingTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
