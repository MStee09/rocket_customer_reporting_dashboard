import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, ArrowUpDown, Sparkles, Loader2,
  Truck, DollarSign, Package, Clock, Mail
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/dateUtils';
import { TrendIndicator } from '../components/ui/TrendIndicator';
import { DateRangeSelector, DateRangePreset, DateRange, getDateRangeFromPreset } from '../components/reports/studio/DateRangeSelector';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExportMenu } from '../components/ui/ExportMenu';
import { EmailReportModal } from '../components/reports/EmailReportModal';
import { ColumnConfig } from '../services/exportService';
import { Card } from '../components/ui/Card';

interface CarrierMetrics {
  carrier_name: string;
  carrier_id: number;
  shipment_count: number;
  total_spend: number;
  avg_cost: number;
  market_share: number;
  on_time_pct: number;
}

interface CarrierTrend extends CarrierMetrics {
  prev_spend: number;
  trend_pct: number;
}

interface MonthlyData {
  month: string;
  [carrierName: string]: number | string;
}

interface SummaryMetrics {
  active_carriers: number;
  total_spend: number;
  avg_per_shipment: number;
  on_time_pct: number;
  prev_total_spend: number;
  prev_avg_per_shipment: number;
  prev_on_time_pct: number;
}

interface ShipmentRow {
  carrier_name: string | null;
  carrier_id: number;
  retail: string | number | null;
  delivered_date: string | null;
  delivery_status: string | null;
}

interface PrevShipmentRow {
  carrier_name: string | null;
  retail: string | number | null;
}

interface MonthlyShipmentRow {
  carrier_name: string;
  retail: string | number | null;
  shipped_date: string;
}

import { chartColors } from '../config/chartTheme';
const CHART_COLORS = chartColors.primary;

type SortField = 'carrier_name' | 'shipment_count' | 'total_spend' | 'avg_cost' | 'market_share' | 'trend_pct';
type SortDirection = 'asc' | 'desc';

export function CarriersPage() {
  const navigate = useNavigate();
  const { effectiveCustomerId, isAdmin, isViewingAsCustomer } = useAuth();
  const showAllCustomers = isAdmin() && !isViewingAsCustomer;

  const [datePreset, setDatePreset] = useState<DateRangePreset>('last30');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(true);
  const [carriers, setCarriers] = useState<CarrierTrend[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics | null>(null);
  const [sortField, setSortField] = useState<SortField>('total_spend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showEmailModal, setShowEmailModal] = useState(false);

  const dateRange = useMemo(() => {
    return customDateRange || getDateRangeFromPreset(datePreset);
  }, [datePreset, customDateRange]);

  const prevDateRange = useMemo(() => {
    const diff = dateRange.end.getTime() - dateRange.start.getTime();
    const start = new Date(dateRange.start.getTime() - diff);
    const end = new Date(dateRange.start.getTime() - 1);
    return { start, end };
  }, [dateRange]);

  useEffect(() => {
    loadCarrierData();
  }, [effectiveCustomerId, dateRange, showAllCustomers]);

  async function loadCarrierData() {
    if (!effectiveCustomerId && !showAllCustomers) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];
      const prevStartDate = prevDateRange.start.toISOString().split('T')[0];
      const prevEndDate = prevDateRange.end.toISOString().split('T')[0];

      let currentQuery = supabase
        .from('shipment_report_view')
        .select('carrier_name, carrier_id, retail, delivered_date, delivery_status')
        .gte('shipped_date', startDate)
        .lte('shipped_date', endDate);

      let prevQuery = supabase
        .from('shipment_report_view')
        .select('carrier_name, carrier_id, retail')
        .gte('shipped_date', prevStartDate)
        .lte('shipped_date', prevEndDate);

      if (!showAllCustomers && effectiveCustomerId) {
        currentQuery = currentQuery.eq('customer_id', effectiveCustomerId);
        prevQuery = prevQuery.eq('customer_id', effectiveCustomerId);
      }

      const [currentData, prevData] = await Promise.all([
        currentQuery,
        prevQuery,
      ]);

      if (!currentData.data || !prevData.data) {
        setLoading(false);
        return;
      }

      const carrierMap = new Map<string, CarrierMetrics>();
      let totalSpend = 0;
      let totalShipments = 0;
      let onTimeShipments = 0;

      currentData.data.forEach((row: ShipmentRow) => {
        const key = row.carrier_name || 'Unknown';
        const spend = parseFloat(row.retail) || 0;

        if (!carrierMap.has(key)) {
          carrierMap.set(key, {
            carrier_name: key,
            carrier_id: row.carrier_id,
            shipment_count: 0,
            total_spend: 0,
            avg_cost: 0,
            market_share: 0,
            on_time_pct: 0,
          });
        }

        const carrier = carrierMap.get(key)!;
        carrier.shipment_count++;
        carrier.total_spend += spend;
        totalSpend += spend;
        totalShipments++;

        if (row.delivery_status === 'Delivered' && row.delivered_date) {
          onTimeShipments++;
        }
      });

      const prevCarrierMap = new Map<string, number>();
      let prevTotalSpend = 0;

      prevData.data.forEach((row: PrevShipmentRow) => {
        const key = row.carrier_name || 'Unknown';
        const spend = parseFloat(row.retail) || 0;
        prevCarrierMap.set(key, (prevCarrierMap.get(key) || 0) + spend);
        prevTotalSpend += spend;
      });

      const carriersWithTrends: CarrierTrend[] = Array.from(carrierMap.values()).map((carrier) => {
        carrier.avg_cost = carrier.total_spend / carrier.shipment_count;
        carrier.market_share = (carrier.total_spend / totalSpend) * 100;

        const prevSpend = prevCarrierMap.get(carrier.carrier_name) || 0;
        const trendPct = prevSpend > 0
          ? ((carrier.total_spend - prevSpend) / prevSpend) * 100
          : carrier.total_spend > 0 ? 100 : 0;

        return {
          ...carrier,
          prev_spend: prevSpend,
          trend_pct: trendPct,
        };
      });

      setCarriers(carriersWithTrends);

      const avgPerShipment = totalShipments > 0 ? totalSpend / totalShipments : 0;
      const onTimePct = totalShipments > 0 ? (onTimeShipments / totalShipments) * 100 : 0;

      const prevTotalShipments = prevData.data.length;
      const prevAvgPerShipment = prevTotalShipments > 0 ? prevTotalSpend / prevTotalShipments : 0;

      setSummaryMetrics({
        active_carriers: carrierMap.size,
        total_spend: totalSpend,
        avg_per_shipment: avgPerShipment,
        on_time_pct: onTimePct,
        prev_total_spend: prevTotalSpend,
        prev_avg_per_shipment: prevAvgPerShipment,
        prev_on_time_pct: 0,
      });

      await loadMonthlyTrends(carriersWithTrends.slice(0, 5));
    } catch (error) {
      console.error('Failed to load carrier data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMonthlyTrends(topCarriers: CarrierTrend[]) {
    if ((!effectiveCustomerId && !showAllCustomers) || topCarriers.length === 0) return;

    try {
      const startDate = new Date(dateRange.start);
      startDate.setMonth(startDate.getMonth() - 5);

      let query = supabase
        .from('shipment_report_view')
        .select('carrier_name, retail, shipped_date')
        .gte('shipped_date', startDate.toISOString().split('T')[0])
        .lte('shipped_date', dateRange.end.toISOString().split('T')[0])
        .in('carrier_name', topCarriers.map(c => c.carrier_name));

      if (!showAllCustomers && effectiveCustomerId) {
        query = query.eq('customer_id', effectiveCustomerId);
      }

      const { data } = await query;

      if (!data) return;

      const monthlyMap = new Map<string, MonthlyData>();

      data.forEach((row: MonthlyShipmentRow) => {
        const date = new Date(row.shipped_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const spend = parseFloat(row.retail) || 0;

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { month: monthKey });
        }

        const monthData = monthlyMap.get(monthKey)!;
        monthData[row.carrier_name] = (monthData[row.carrier_name] || 0) + spend;
      });

      const monthlyArray = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

      const formattedMonthly = monthlyArray.map(m => ({
        ...m,
        month: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      }));

      setMonthlyData(formattedMonthly);
    } catch (error) {
      console.error('Failed to load monthly trends:', error);
    }
  }

  const sortedCarriers = useMemo(() => {
    const sorted = [...carriers].sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      if (sortField === 'carrier_name') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  }, [carriers, sortField, sortDirection]);

  const pieData = useMemo(() => {
    return carriers
      .slice(0, 10)
      .map(c => ({
        name: c.carrier_name,
        value: c.total_spend,
      }));
  }, [carriers]);

  const carrierExportColumns: ColumnConfig[] = useMemo(() => [
    { key: 'carrier_name', header: 'Carrier', format: 'text', width: 25 },
    { key: 'shipment_count', header: 'Shipments', format: 'number', width: 12 },
    { key: 'total_spend', header: 'Total Spend', format: 'currency', width: 15 },
    { key: 'avg_cost', header: 'Avg Cost/Shipment', format: 'currency', width: 15 },
    { key: 'market_share', header: 'Market Share %', format: 'number', width: 12 },
    { key: 'trend_pct', header: 'Trend vs Prior %', format: 'number', width: 15 },
    { key: 'prev_spend', header: 'Prior Period Spend', format: 'currency', width: 15 },
  ], []);

  const carrierExportData = useMemo(() => {
    return sortedCarriers.map(c => ({
      carrier_name: c.carrier_name,
      shipment_count: c.shipment_count,
      total_spend: c.total_spend,
      avg_cost: c.avg_cost,
      market_share: parseFloat(c.market_share.toFixed(1)),
      trend_pct: parseFloat(c.trend_pct.toFixed(1)),
      prev_spend: c.prev_spend,
    }));
  }, [sortedCarriers]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  function getTrendChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  function handleAskAI() {
    const carriersContext = carriers.slice(0, 5).map(c =>
      `${c.carrier_name}: ${c.shipment_count} shipments, ${formatCurrency(c.total_spend)}`
    ).join('; ');

    navigate('/ai-studio', {
      state: {
        initialPrompt: `Analyze carrier performance: ${carriersContext}. What insights can you provide?`
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Carrier Performance</h1>
          <p className="text-slate-600 mt-1">Analyze carrier metrics and compare performance</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector
            value={datePreset}
            customRange={customDateRange}
            onChange={(preset, dates) => {
              setDatePreset(preset);
              setCustomDateRange(dates);
            }}
          />
          <ExportMenu
            data={carrierExportData}
            columns={carrierExportColumns}
            filename="carrier-performance"
            title="Carrier Performance Report"
            disabled={carriers.length === 0}
          />
          <button
            onClick={() => setShowEmailModal(true)}
            disabled={carriers.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
        </div>
      </div>

      {summaryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="outlined" padding="lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Carriers</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {summaryMetrics.active_carriers}
                </p>
              </div>
              <div className="p-3 bg-rocket-100 rounded-lg">
                <Truck className="w-6 h-6 text-rocket-600" />
              </div>
            </div>
          </Card>

          <Card variant="outlined" padding="lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Total Spend</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {formatCurrency(summaryMetrics.total_spend)}
                </p>
                <div className="mt-2">
                  <TrendIndicator
                    value={getTrendChange(summaryMetrics.total_spend, summaryMetrics.prev_total_spend)}
                    size="sm"
                  />
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card variant="outlined" padding="lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Avg/Shipment</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {formatCurrency(summaryMetrics.avg_per_shipment)}
                </p>
                <div className="mt-2">
                  <TrendIndicator
                    value={getTrendChange(summaryMetrics.avg_per_shipment, summaryMetrics.prev_avg_per_shipment)}
                    size="sm"
                    positiveDirection="down"
                  />
                </div>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card variant="outlined" padding="lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">On-Time</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {summaryMetrics.on_time_pct.toFixed(1)}%
                </p>
                <div className="mt-2">
                  <TrendIndicator
                    value={getTrendChange(summaryMetrics.on_time_pct, summaryMetrics.prev_on_time_pct)}
                    size="sm"
                  />
                </div>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Clock className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card variant="outlined" padding="none">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Carrier Comparison</h2>
          <button
            onClick={handleAskAI}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Ask AI
          </button>
        </div>

        {carriers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium mb-1">No carrier data</p>
            <p className="text-sm text-slate-500">
              No shipments found for the selected date range
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => handleSort('carrier_name')}
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Carrier
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('shipment_count')}
                    className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-2">
                      Shipments
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('total_spend')}
                    className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-2">
                      Spend
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('avg_cost')}
                    className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-2">
                      Avg Cost
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('market_share')}
                    className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-2">
                      Share
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('trend_pct')}
                    className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-2">
                      Trend
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCarriers.map((carrier, index) => (
                  <tr
                    key={carrier.carrier_id}
                    onClick={() => navigate(`/shipments?carrier=${carrier.carrier_id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {carrier.carrier_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right font-medium">
                      {carrier.shipment_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 text-right font-semibold">
                      {formatCurrency(carrier.total_spend)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">
                      {formatCurrency(carrier.avg_cost)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">
                      {carrier.market_share.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <TrendIndicator value={carrier.trend_pct} size="sm" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {carriers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="outlined" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Spend by Carrier</h3>
            {pieData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${((entry.value / summaryMetrics!.total_spend) * 100).toFixed(1)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card variant="outlined" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Carrier Trend</h3>
            {monthlyData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {carriers.slice(0, 5).map((carrier, index) => (
                    <Line
                      key={carrier.carrier_name}
                      type="monotone"
                      dataKey={carrier.carrier_name}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      <EmailReportModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        reportName="Carrier Performance Report"
        reportData={carrierExportData}
        reportType="custom"
      />
    </div>
  );
}

export default CarriersPage;
