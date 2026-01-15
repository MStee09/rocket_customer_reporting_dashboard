import { supabase } from '../lib/supabase';
import { ReportConfig } from '../types/reports';
import { format } from 'date-fns';

interface ReportCategory {
  name: string;
  keywords: string[];
  isDefault?: boolean;
}

interface ShipmentWithStatus {
  load_id: number;
  retail: number | null;
  pickup_date: string;
  shipment_status: { status_name: string } | null;
}

interface ShipmentItem {
  load_id: number;
  quantity: number | null;
  description: string | null;
}

interface QuantityByLoadIdAndCategory {
  [loadId: number]: {
    total: number;
    [categoryName: string]: number;
  };
}

export interface MonthlyMetric {
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

export interface CategoryMetric {
  avgCostPerUnit: number;
  totalRevenue: number;
  totalQuantity: number;
  shipmentCount: number;
  percentChange: number;
}

export interface OverallMetrics {
  avgCostPerUnit: number;
  totalRevenue: number;
  totalQuantity: number;
  totalShipments: number;
  percentChange: number;
  categories: {
    [category: string]: CategoryMetric;
  };
}

export interface ReportExecutionResult {
  monthlyData: MonthlyMetric[];
  overallMetrics: OverallMetrics | null;
}

function categorizeItem(description: string | null, categories: ReportCategory[]): string {
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
}

export async function executeReport(
  report: ReportConfig,
  startDate: string,
  endDate: string,
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean
): Promise<ReportExecutionResult> {
  if (report.type === 'category_breakdown' && report.config.categories) {
    return await executeCategoryBreakdownReport(
      report,
      startDate,
      endDate,
      effectiveCustomerIds,
      isAdmin,
      isViewingAsCustomer
    );
  }

  throw new Error(`Report type ${report.type} not yet implemented`);
}

async function executeCategoryBreakdownReport(
  report: ReportConfig,
  startDate: string,
  endDate: string,
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean
): Promise<ReportExecutionResult> {
  const categories = report.config.categories || [];

  let query = supabase
    .from('shipment')
    .select(`
      load_id,
      retail,
      pickup_date,
      shipment_status:status_id(status_name)
    `);

  if (!isAdmin || isViewingAsCustomer) {
    query = query.in('customer_id', effectiveCustomerIds);
  }

  const { data: shipments, error } = await query
    .gte('pickup_date', startDate)
    .lte('pickup_date', endDate)
    .not('status_id', 'is', null);

  if (error) throw error;

  if (!shipments || shipments.length === 0) {
    return {
      monthlyData: [],
      overallMetrics: null,
    };
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

  const quantityByLoadIdAndCategory = ((items || []) as ShipmentItem[]).reduce<QuantityByLoadIdAndCategory>(
    (acc, item) => {
      const category = categorizeItem(item.description, categories);
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
    },
    {}
  );

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

  return {
    monthlyData: monthlyDataArray,
    overallMetrics: {
      avgCostPerUnit,
      totalRevenue,
      totalQuantity,
      totalShipments,
      percentChange,
      categories: categoryMetrics,
    },
  };
}
