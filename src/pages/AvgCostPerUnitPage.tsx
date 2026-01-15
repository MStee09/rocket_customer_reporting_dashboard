import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, Package, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { customerMetricsConfig } from '../config/customerMetrics';
import { CategoryConfig } from '../types/metrics';

type Category = string;

interface ShipmentStatus {
  status_name: string;
}

interface ShipmentWithStatus {
  load_id: number;
  retail: number | null;
  pickup_date: string;
  shipment_status: ShipmentStatus | null;
}

interface ShipmentItem {
  load_id: number;
  quantity: number | null;
  description: string | null;
}

interface QuantityByCategory {
  total: number;
  [category: string]: number;
}

interface LineChartDataPoint {
  month: string;
  Overall: number;
  [category: string]: string | number | null;
}

interface CategoryMetric {
  avgCostPerUnit: number;
  totalRevenue: number;
  totalQuantity: number;
  shipmentCount: number;
  percentChange: number;
}

interface MonthlyMetric {
  month: string;
  avgCostPerUnit: number;
  totalRevenue: number;
  totalQuantity: number;
  shipmentCount: number;
  categories: {
    [category: string]: {
      avgCostPerUnit: number;
      revenue: number;
      quantity: number;
      count: number;
    };
  };
}

interface OverallMetrics {
  avgCostPerUnit: number;
  totalRevenue: number;
  totalQuantity: number;
  totalShipments: number;
  percentChange: number;
  categories: {
    [category: string]: CategoryMetric;
  };
}

type DatePreset = 'last30' | 'last90' | 'last6months' | 'lastyear' | 'custom';

export function AvgCostPerUnitPage() {
  const navigate = useNavigate();
  const { effectiveCustomerIds, isAdmin, isViewingAsCustomer } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyMetric[]>([]);
  const [overallMetrics, setOverallMetrics] = useState<OverallMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>('last6months');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const metricConfig = effectiveCustomerIds
      ?.map((id) => customerMetricsConfig[id])
      .flat()
      .find((m) => m?.key === 'avg-cost-per-unit');

    if (metricConfig?.config?.categories) {
      setCategories(metricConfig.config.categories);
      setHasAccess(true);
    } else {
      setHasAccess(false);
      setIsLoading(false);
    }
  }, [effectiveCustomerIds]);

  useEffect(() => {
    if (hasAccess && categories.length > 0) {
      updateDateRange(datePreset);
    }
  }, [hasAccess, categories]);

  useEffect(() => {
    if (startDate && endDate) {
      loadMetrics();
    }
  }, [startDate, endDate]);

  const updateDateRange = (preset: DatePreset) => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (preset) {
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
      default:
        return;
    }

    setDatePreset(preset);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const categorizeItem = (description: string | null): string => {
    if (!description) {
      const defaultCategory = categories.find((c) => c.isDefault);
      return defaultCategory?.name || 'OTHER';
    }

    const desc = description.toUpperCase();

    for (const category of categories) {
      if (category.keywords.length === 0 && category.isDefault) {
        continue;
      }
      for (const keyword of category.keywords) {
        if (desc.includes(keyword.toUpperCase())) {
          return category.name;
        }
      }
    }

    const defaultCategory = categories.find((c) => c.isDefault);
    return defaultCategory?.name || 'OTHER';
  };

  const handleCategoryClick = (category: Category) => {
    navigate(`/shipments?category=${encodeURIComponent(category)}`);
  };

  const loadMetrics = async () => {
    setIsLoading(true);

    try {
      let query = supabase
        .from('shipment')
        .select(`
          load_id,
          retail,
          pickup_date,
          shipment_status:status_id(status_name)
        `);

      if (!isAdmin() || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments, error } = await query
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate)
        .not('status_id', 'is', null);

      if (error) throw error;

      if (!shipments || shipments.length === 0) {
        setMonthlyData([]);
        setOverallMetrics(null);
        setIsLoading(false);
        return;
      }

      const filteredShipments = (shipments as ShipmentWithStatus[]).filter(
        (s) =>
          s.shipment_status?.status_name &&
          s.shipment_status.status_name.toLowerCase() !== 'cancelled' &&
          s.shipment_status.status_name.toLowerCase() !== 'quoted'
      );

      const { data: items, error: itemsError } = await supabase
        .from('shipment_item')
        .select('load_id, quantity, description')
        .in('load_id', filteredShipments.map((s) => s.load_id));

      if (itemsError) throw itemsError;

      const quantityByLoadIdAndCategory = ((items || []) as ShipmentItem[]).reduce<Record<number, QuantityByCategory>>((acc, item) => {
        const category = categorizeItem(item.description);
        const loadId = item.load_id;

        if (!acc[loadId]) {
          acc[loadId] = {
            total: 0,
          };
          categories.forEach((cat) => {
            acc[loadId][cat.name] = 0;
          });
        }

        const qty = item.quantity || 0;
        acc[loadId].total += qty;
        acc[loadId][category] += qty;

        return acc;
      }, {});

      type MonthlyMetricData = {
        revenue: number;
        quantity: number;
        count: number;
        categories: {
          [category: string]: {
            revenue: number;
            quantity: number;
            count: number;
          };
        };
      };

      const monthlyMetrics: { [key: string]: MonthlyMetricData } = {};

      filteredShipments.forEach((shipment) => {
        const loadData = quantityByLoadIdAndCategory[shipment.load_id];
        if (!loadData || loadData.total === 0 || !shipment.retail) return;

        const monthKey = format(new Date(shipment.pickup_date), 'yyyy-MM');

        if (!monthlyMetrics[monthKey]) {
          const categoryData: { [category: string]: { revenue: number; quantity: number; count: number } } = {};
          categories.forEach((cat) => {
            categoryData[cat.name] = { revenue: 0, quantity: 0, count: 0 };
          });

          monthlyMetrics[monthKey] = {
            revenue: 0,
            quantity: 0,
            count: 0,
            categories: categoryData,
          };
        }

        monthlyMetrics[monthKey].revenue += shipment.retail;
        monthlyMetrics[monthKey].quantity += loadData.total;
        monthlyMetrics[monthKey].count += 1;

        categories.forEach((category) => {
          const categoryQty = loadData[category.name];
          if (categoryQty > 0) {
            const categoryRevenue = (shipment.retail * categoryQty) / loadData.total;
            monthlyMetrics[monthKey].categories[category.name].revenue += categoryRevenue;
            monthlyMetrics[monthKey].categories[category.name].quantity += categoryQty;
            monthlyMetrics[monthKey].categories[category.name].count += 1;
          }
        });
      });

      const monthlyDataArray: MonthlyMetric[] = Object.entries(monthlyMetrics)
        .map(([month, metrics]) => {
          const categoryData: { [category: string]: { avgCostPerUnit: number; revenue: number; quantity: number; count: number } } = {};

          categories.forEach((cat) => {
            const catMetrics = metrics.categories[cat.name];
            categoryData[cat.name] = {
              avgCostPerUnit: catMetrics.quantity > 0 ? catMetrics.revenue / catMetrics.quantity : 0,
              revenue: catMetrics.revenue,
              quantity: catMetrics.quantity,
              count: catMetrics.count,
            };
          });

          return {
            month: format(new Date(month + '-01'), 'MMM yyyy'),
            avgCostPerUnit: metrics.revenue / metrics.quantity,
            totalRevenue: metrics.revenue,
            totalQuantity: metrics.quantity,
            shipmentCount: metrics.count,
            categories: categoryData,
          };
        })
        .sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        });

      const totalRevenue = Object.values(monthlyMetrics).reduce((sum, m) => sum + m.revenue, 0);
      const totalQuantity = Object.values(monthlyMetrics).reduce((sum, m) => sum + m.quantity, 0);
      const totalShipments = Object.values(monthlyMetrics).reduce((sum, m) => sum + m.count, 0);
      const avgCostPerUnit = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

      let percentChange = 0;
      if (monthlyDataArray.length >= 2) {
        const currentAvg = monthlyDataArray[monthlyDataArray.length - 1].avgCostPerUnit;
        const previousAvg = monthlyDataArray[monthlyDataArray.length - 2].avgCostPerUnit;
        if (previousAvg > 0) {
          percentChange = ((currentAvg - previousAvg) / previousAvg) * 100;
        }
      }

      const categoryMetrics: { [category: string]: CategoryMetric } = {};

      categories.forEach((category) => {
        const catRevenue = Object.values(monthlyMetrics).reduce(
          (sum, m) => sum + m.categories[category.name].revenue,
          0
        );
        const catQuantity = Object.values(monthlyMetrics).reduce(
          (sum, m) => sum + m.categories[category.name].quantity,
          0
        );
        const catShipments = Object.values(monthlyMetrics).reduce(
          (sum, m) => sum + m.categories[category.name].count,
          0
        );

        categoryMetrics[category.name] = {
          avgCostPerUnit: catQuantity > 0 ? catRevenue / catQuantity : 0,
          totalRevenue: catRevenue,
          totalQuantity: catQuantity,
          shipmentCount: catShipments,
          percentChange: 0,
        };

        if (monthlyDataArray.length >= 2) {
          const currentCatAvg = monthlyDataArray[monthlyDataArray.length - 1].categories[category.name].avgCostPerUnit;
          const previousCatAvg = monthlyDataArray[monthlyDataArray.length - 2].categories[category.name].avgCostPerUnit;
          if (previousCatAvg > 0) {
            categoryMetrics[category.name].percentChange = ((currentCatAvg - previousCatAvg) / previousCatAvg) * 100;
          }
        }
      });

      setMonthlyData(monthlyDataArray);
      setOverallMetrics({
        avgCostPerUnit,
        totalRevenue,
        totalQuantity,
        totalShipments,
        percentChange,
        categories: categoryMetrics,
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (!hasAccess) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Report Not Available</h3>
          <p className="text-slate-600">
            You do not have access to this metric. Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Average Cost Per Unit</h1>
        <p className="text-slate-600 mt-1">Track your cost efficiency over time</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-rocket-600" />
          <h2 className="text-lg font-bold text-slate-800">Date Range</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <button
            onClick={() => updateDateRange('last30')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              datePreset === 'last30'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => updateDateRange('last90')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              datePreset === 'last90'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 90 Days
          </button>
          <button
            onClick={() => updateDateRange('last6months')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              datePreset === 'last6months'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 6 Months
          </button>
          <button
            onClick={() => updateDateRange('lastyear')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              datePreset === 'lastyear'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last Year
          </button>
          <button
            onClick={() => setDatePreset('custom')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              datePreset === 'custom'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Custom
          </button>
        </div>

        {datePreset === 'custom' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
              />
            </div>
          </div>
        )}
      </div>

      {!overallMetrics ? (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Data Available</h3>
          <p className="text-slate-600">
            No shipments found for the selected date range, or all shipments are cancelled/quoted.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-br from-rocket-500 to-rocket-600 rounded-xl shadow-xl border border-rocket-400 p-8 mb-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8" />
              <h2 className="text-xl font-semibold">Overall Average Cost Per Unit</h2>
            </div>
            <div className="flex items-end gap-4">
              <div className="text-5xl font-bold">
                {formatCurrency(overallMetrics.avgCostPerUnit)}
              </div>
              {overallMetrics.percentChange !== 0 && (
                <div
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${
                    overallMetrics.percentChange > 0
                      ? 'bg-red-500/20 text-red-100'
                      : 'bg-green-500/20 text-green-100'
                  }`}
                >
                  {overallMetrics.percentChange > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(overallMetrics.percentChange).toFixed(1)}% vs previous month
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
              <div className="text-sm font-medium text-slate-600 mb-1">Total Shipments</div>
              <div className="text-3xl font-bold text-slate-800">
                {formatNumber(overallMetrics.totalShipments)}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
              <div className="text-sm font-medium text-slate-600 mb-1">Total Units</div>
              <div className="text-3xl font-bold text-slate-800">
                {formatNumber(overallMetrics.totalQuantity)}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
              <div className="text-sm font-medium text-slate-600 mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-slate-800">
                {formatCurrency(overallMetrics.totalRevenue)}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Category Breakdown</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category) => {
                const metrics = overallMetrics.categories[category.name];
                const hexToRgb = (hex: string) => {
                  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                  return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                  } : { r: 100, g: 100, b: 100 };
                };
                const rgb = hexToRgb(category.color);

                return (
                  <button
                    key={category.name}
                    onClick={() => handleCategoryClick(category.name)}
                    className="rounded-xl shadow-lg p-6 text-white text-left transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
                    style={{
                      background: `linear-gradient(to bottom right, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}), rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)}))`,
                      borderColor: category.color,
                      borderWidth: '1px',
                    }}
                  >
                    <div className="text-sm font-semibold mb-2 opacity-90">{category.name}</div>
                    <div className="text-3xl font-bold mb-2">
                      {metrics.totalQuantity > 0 ? formatCurrency(metrics.avgCostPerUnit) : 'N/A'}
                    </div>
                    <div className="flex items-center justify-between text-xs opacity-90">
                      <span>{formatNumber(metrics.totalQuantity)} units</span>
                      {metrics.percentChange !== 0 && metrics.totalQuantity > 0 && (
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                            metrics.percentChange > 0
                              ? 'bg-red-500/30'
                              : 'bg-green-500/30'
                          }`}
                        >
                          {metrics.percentChange > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {Math.abs(metrics.percentChange).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Category Comparison</h2>
            {categories.some((cat) => overallMetrics.categories[cat.name].totalQuantity > 0) ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={categories.map((category) => ({
                    category: category.name,
                    avgCostPerUnit: overallMetrics.categories[category.name].avgCostPerUnit,
                    totalRevenue: overallMetrics.categories[category.name].totalRevenue,
                    totalQuantity: overallMetrics.categories[category.name].totalQuantity,
                    shipmentCount: overallMetrics.categories[category.name].shipmentCount,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="category"
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'avgCostPerUnit') {
                        return [formatCurrency(value), 'Avg Cost Per Unit'];
                      }
                      if (name === 'totalRevenue') {
                        return [formatCurrency(value), 'Total Revenue'];
                      }
                      if (name === 'totalQuantity') {
                        return [formatNumber(value), 'Total Units'];
                      }
                      if (name === 'shipmentCount') {
                        return [formatNumber(value), 'Shipments'];
                      }
                      return [value, name];
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                  />
                  <Bar dataKey="avgCostPerUnit" radius={[8, 8, 0, 0]}>
                    {categories.map((cat, index) => (
                      <Cell key={`cell-${index}`} fill={cat.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-600">
                No category data available
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Monthly Trend by Category</h2>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={450}>
                <LineChart
                  data={monthlyData.map((m) => {
                    const chartData: LineChartDataPoint = {
                      month: m.month,
                      Overall: m.avgCostPerUnit,
                    };
                    categories.forEach((cat) => {
                      chartData[cat.name] = m.categories[cat.name]?.avgCostPerUnit || null;
                    });
                    return chartData;
                  })}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    formatter={(value: number | null) => {
                      if (value === null || value === 0) return ['N/A', ''];
                      return [formatCurrency(value), ''];
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Overall"
                    stroke="#475569"
                    strokeWidth={3}
                    dot={{ fill: '#475569', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Overall"
                  />
                  {categories.map((cat) => (
                    <Line
                      key={cat.name}
                      type="monotone"
                      dataKey={cat.name}
                      stroke={cat.color}
                      strokeWidth={2}
                      dot={{ fill: cat.color, r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      name={cat.name}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-600">
                No monthly data available for the selected period
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AvgCostPerUnitPage;
