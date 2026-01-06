/**
 * CarrierAnalyticsSection.tsx - FIXED VERSION
 *
 * Uses shipment_report_view (same as CarriersPage) instead of direct table join
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown, Sparkles, Loader2,
  Truck, DollarSign, Package, Clock, Building2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/dateUtils';
import { TrendIndicator } from '../ui/TrendIndicator';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface CarrierAnalyticsSectionProps {
  customerId?: number;
  startDate: string;
  endDate: string;
  onAskAI?: (context: string) => void;
}

const CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'];

type SortField = 'carrier_name' | 'shipment_count' | 'total_spend' | 'avg_cost' | 'market_share' | 'trend_pct';
type SortDirection = 'asc' | 'desc';

export function CarrierAnalyticsSection({
  customerId,
  startDate,
  endDate,
  onAskAI
}: CarrierAnalyticsSectionProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [carriers, setCarriers] = useState<CarrierTrend[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics | null>(null);
  const [sortField, setSortField] = useState<SortField>('total_spend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const prevDateRange = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - diff);
    const prevEnd = new Date(start.getTime() - 1);
    return {
      start: prevStart.toISOString().split('T')[0],
      end: prevEnd.toISOString().split('T')[0],
    };
  }, [startDate, endDate]);

  useEffect(() => {
    loadCarrierData();
  }, [customerId, startDate, endDate]);

  async function loadCarrierData() {
    if (!customerId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: currentData, error: currentError } = await supabase
        .from('shipment_report_view')
        .select('carrier_name, carrier_id, retail, delivered_date, delivery_status, shipped_date')
        .eq('customer_id', customerId)
        .gte('shipped_date', startDate)
        .lte('shipped_date', endDate);

      if (currentError) {
        console.error('Error loading current carrier data:', currentError);
        setLoading(false);
        return;
      }

      const { data: prevData, error: prevError } = await supabase
        .from('shipment_report_view')
        .select('carrier_name, carrier_id, retail')
        .eq('customer_id', customerId)
        .gte('shipped_date', prevDateRange.start)
        .lte('shipped_date', prevDateRange.end);

      if (prevError) {
        console.error('Error loading previous carrier data:', prevError);
      }

      const carrierMap = new Map<string, CarrierMetrics>();
      let totalSpend = 0;
      let totalShipments = 0;
      let onTimeShipments = 0;
      let deliveredShipments = 0;

      (currentData || []).forEach((row: any) => {
        const carrierName = row.carrier_name || 'Unknown';
        const carrierId = row.carrier_id || 0;
        const spend = parseFloat(row.retail) || 0;

        if (!carrierMap.has(carrierName)) {
          carrierMap.set(carrierName, {
            carrier_name: carrierName,
            carrier_id: carrierId,
            shipment_count: 0,
            total_spend: 0,
            avg_cost: 0,
            market_share: 0,
            on_time_pct: 0,
          });
        }

        const carrier = carrierMap.get(carrierName)!;
        carrier.shipment_count++;
        carrier.total_spend += spend;
        totalSpend += spend;
        totalShipments++;

        if (row.delivery_status === 'Delivered' && row.delivered_date) {
          deliveredShipments++;
          onTimeShipments++;
        }
      });

      const prevCarrierMap = new Map<string, number>();
      let prevTotalSpend = 0;
      let prevTotalShipments = 0;

      (prevData || []).forEach((row: any) => {
        const carrierName = row.carrier_name || 'Unknown';
        const spend = parseFloat(row.retail) || 0;
        prevCarrierMap.set(carrierName, (prevCarrierMap.get(carrierName) || 0) + spend);
        prevTotalSpend += spend;
        prevTotalShipments++;
      });

      const carriersWithTrends: CarrierTrend[] = Array.from(carrierMap.values()).map((carrier) => {
        carrier.avg_cost = carrier.shipment_count > 0 ? carrier.total_spend / carrier.shipment_count : 0;
        carrier.market_share = totalSpend > 0 ? (carrier.total_spend / totalSpend) * 100 : 0;

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

      carriersWithTrends.sort((a, b) => b.total_spend - a.total_spend);

      setCarriers(carriersWithTrends);

      const avgPerShipment = totalShipments > 0 ? totalSpend / totalShipments : 0;
      const onTimePct = deliveredShipments > 0 ? (onTimeShipments / deliveredShipments) * 100 : 0;
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
    if (!customerId || topCarriers.length === 0) return;

    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from('shipment_report_view')
        .select('shipped_date, retail, carrier_name')
        .eq('customer_id', customerId)
        .gte('shipped_date', sixMonthsAgo.toISOString().split('T')[0])
        .lte('shipped_date', endDate);

      if (error || !data) {
        console.error('Error loading monthly trends:', error);
        return;
      }

      const monthlyMap = new Map<string, Map<string, number>>();
      const topCarrierNames = new Set(topCarriers.map(c => c.carrier_name));

      data.forEach((row: any) => {
        const carrierName = row.carrier_name || 'Unknown';
        if (!topCarrierNames.has(carrierName)) return;

        const date = new Date(row.shipped_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const spend = parseFloat(row.retail) || 0;

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, new Map());
        }
        const carrierSpend = monthlyMap.get(monthKey)!;
        carrierSpend.set(carrierName, (carrierSpend.get(carrierName) || 0) + spend);
      });

      const monthlyArray: MonthlyData[] = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, carriers]) => {
          const entry: MonthlyData = {
            month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          };
          topCarriers.forEach(c => {
            entry[c.carrier_name] = carriers.get(c.carrier_name) || 0;
          });
          return entry;
        });

      setMonthlyData(monthlyArray);
    } catch (error) {
      console.error('Failed to load monthly trends:', error);
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedCarriers = useMemo(() => {
    return [...carriers].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const modifier = sortDirection === 'asc' ? 1 : -1;

      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal as string) * modifier;
      }
      return ((aVal as number) - (bVal as number)) * modifier;
    });
  }, [carriers, sortField, sortDirection]);

  const pieData = useMemo(() => {
    return carriers
      .slice(0, 6)
      .map((c) => ({ name: c.carrier_name, value: c.total_spend }));
  }, [carriers]);

  const handleAskAI = () => {
    const context = `Analyze carrier performance for this customer.
Top carriers: ${carriers.slice(0, 3).map(c => `${c.carrier_name} (${c.market_share.toFixed(1)}% share, ${formatCurrency(c.total_spend)} spend)`).join(', ')}.
Total spend: ${formatCurrency(summaryMetrics?.total_spend || 0)} across ${summaryMetrics?.active_carriers || 0} carriers.`;

    if (onAskAI) {
      onAskAI(context);
    } else {
      navigate(`/ai-studio?query=${encodeURIComponent(`Analyze my carrier performance: ${context}`)}`);
    }
  };

  const spendTrendPct = summaryMetrics && summaryMetrics.prev_total_spend > 0
    ? ((summaryMetrics.total_spend - summaryMetrics.prev_total_spend) / summaryMetrics.prev_total_spend) * 100
    : 0;

  const avgCostTrendPct = summaryMetrics && summaryMetrics.prev_avg_per_shipment > 0
    ? ((summaryMetrics.avg_per_shipment - summaryMetrics.prev_avg_per_shipment) / summaryMetrics.prev_avg_per_shipment) * 100
    : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          <span className="text-slate-500">Loading carrier analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summaryMetrics && summaryMetrics.active_carriers > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">Active Carriers</span>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {summaryMetrics.active_carriers}
            </div>
            <p className="text-xs text-slate-500 mt-1">Unique carriers used</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">Total Spend</span>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(summaryMetrics.total_spend)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendIndicator value={spendTrendPct} size="sm" />
              <span className="text-xs text-slate-500">vs prev period</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">Avg Cost/Shipment</span>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(summaryMetrics.avg_per_shipment)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendIndicator value={avgCostTrendPct} size="sm" invertColors />
              <span className="text-xs text-slate-500">vs prev period</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">On-Time Delivery</span>
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {summaryMetrics.on_time_pct.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Of delivered shipments</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Carrier Comparison</h3>
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
                {sortedCarriers.map((carrier) => (
                  <tr
                    key={carrier.carrier_id || carrier.carrier_name}
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
      </div>

      {carriers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
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
                    label={(entry) => `${entry.name}: ${((entry.value / (summaryMetrics?.total_spend || 1)) * 100).toFixed(1)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Carrier Trend</h3>
            {monthlyData.length > 0 ? (
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
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                No trend data available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CarrierAnalyticsSection;
