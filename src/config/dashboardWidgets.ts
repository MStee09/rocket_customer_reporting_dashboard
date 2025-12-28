import { WidgetDefinition, WidgetCalculateParams } from '../types/widgets';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/dateUtils';
import { getSecureTable, getSelectFields } from '../utils/getSecureTable';

export const dashboardWidgets: Record<string, WidgetDefinition> = {
  total_shipments: {
    id: 'total_shipments',
    name: 'Total Shipments',
    description: 'Count of all shipments in date range',
    type: 'number',
    icon: 'Package',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id', { count: 'exact', head: true });

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { count } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      return { value: count || 0 };
    },
  },

  in_transit: {
    id: 'in_transit',
    name: 'In Transit',
    description: 'Shipments currently in transit',
    type: 'number',
    icon: 'Truck',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id, shipment_status:status_id(is_completed, is_cancelled)');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const inTransit = shipments?.filter(
        (s: any) => s.shipment_status && !s.shipment_status.is_completed && !s.shipment_status.is_cancelled
      ).length || 0;

      return { value: inTransit };
    },
  },

  delivered_month: {
    id: 'delivered_month',
    name: 'Delivered This Month',
    description: 'Shipments delivered in current month',
    type: 'number',
    icon: 'CheckCircle',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id, delivery_date, shipment_status:status_id(is_completed)');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const deliveredThisMonth = shipments?.filter(
        (s: any) =>
          s.shipment_status?.is_completed &&
          s.delivery_date &&
          new Date(s.delivery_date) >= firstDayOfMonth
      ).length || 0;

      return { value: deliveredThisMonth };
    },
  },

  total_cost: {
    id: 'total_cost',
    name: 'Total Cost',
    description: 'Total shipping spend',
    type: 'currency',
    icon: 'DollarSign',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);
      const selectFields = getSelectFields('retail, cost', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select(selectFields);

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const totalCost = shipments?.reduce((sum: number, s: any) => sum + (parseFloat(s.retail) || 0), 0) || 0;

      let subtitle: string | undefined;
      if (isAdmin && !isViewingAsCustomer) {
        const totalCarrierCost = shipments?.reduce((sum: number, s: any) => sum + (parseFloat(s.cost) || 0), 0) || 0;
        const margin = totalCost - totalCarrierCost;
        subtitle = `Margin: ${formatCurrency(margin.toString())}`;
      }

      return { value: formatCurrency(totalCost.toString()), subtitle };
    },
  },

  avg_cost_shipment: {
    id: 'avg_cost_shipment',
    name: 'Avg Cost Per Shipment',
    description: 'Average cost across all shipments',
    type: 'currency',
    icon: 'TrendingUp',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('retail');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const totalCost = shipments?.reduce((sum: number, s: any) => sum + (parseFloat(s.retail) || 0), 0) || 0;
      const avgCost = shipments && shipments.length > 0 ? totalCost / shipments.length : 0;

      return { value: formatCurrency(avgCost.toString()) };
    },
  },

  monthly_spend: {
    id: 'monthly_spend',
    name: 'Monthly Spend Trend',
    description: 'Spending over time',
    type: 'line_chart',
    icon: 'LineChart',
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('retail, pickup_date, shipment_status:status_id(status_name)');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const filteredShipments = shipments?.filter(
        (s: any) =>
          s.shipment_status?.status_name &&
          s.shipment_status.status_name.toLowerCase() !== 'cancelled' &&
          s.shipment_status.status_name.toLowerCase() !== 'quoted'
      ) || [];

      const monthlyMetrics: { [key: string]: { cost: number; count: number } } = {};

      filteredShipments.forEach((shipment: any) => {
        if (!shipment.retail || !shipment.pickup_date) return;
        const monthKey = format(new Date(shipment.pickup_date), 'yyyy-MM');

        if (!monthlyMetrics[monthKey]) {
          monthlyMetrics[monthKey] = { cost: 0, count: 0 };
        }

        monthlyMetrics[monthKey].cost += parseFloat(shipment.retail);
        monthlyMetrics[monthKey].count += 1;
      });

      const chartData = Object.entries(monthlyMetrics)
        .map(([month, metrics]) => ({
          month: format(new Date(month + '-01'), 'MMM yyyy'),
          totalCost: metrics.cost,
          shipmentCount: metrics.count,
        }))
        .sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        });

      return { chartData };
    },
  },

  mode_breakdown: {
    id: 'mode_breakdown',
    name: 'Shipments by Mode',
    description: 'LTL vs Truckload vs other modes',
    type: 'pie_chart',
    icon: 'PieChart',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id, shipment_mode:mode_id(mode_name)');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const modeCounts: { [key: string]: number } = {};

      shipments?.forEach((s: any) => {
        const modeName = s.shipment_mode?.mode_name || 'Unknown';
        modeCounts[modeName] = (modeCounts[modeName] || 0) + 1;
      });

      const chartData = Object.entries(modeCounts).map(([name, value]) => ({
        name,
        value,
      }));

      return { chartData };
    },
  },

  carrier_mix: {
    id: 'carrier_mix',
    name: 'Carrier Mix',
    description: 'Shipment distribution by carrier',
    type: 'pie_chart',
    icon: 'Truck',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const shipmentTable = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let shipmentQuery = supabase
        .from(shipmentTable)
        .select('load_id, rate_carrier_id');

      if (!isAdmin || isViewingAsCustomer) {
        shipmentQuery = shipmentQuery.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await shipmentQuery
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (!shipments || shipments.length === 0) {
        return { chartData: [] };
      }

      const carrierIds = shipments
        .map((s: any) => s.rate_carrier_id)
        .filter((id: number) => id != null);

      if (carrierIds.length === 0) {
        return { chartData: [] };
      }

      const uniqueCarrierIds = [...new Set(carrierIds)];

      const { data: carriers } = await supabase
        .from('carrier')
        .select('carrier_id, carrier_name')
        .in('carrier_id', uniqueCarrierIds);

      const carrierMap = new Map(carriers?.map((c: any) => [c.carrier_id, c.carrier_name]) || []);
      const carrierCounts: { [key: string]: number } = {};

      carrierIds.forEach((carrierId: number) => {
        const carrierName = carrierMap.get(carrierId) || 'Unknown';
        carrierCounts[carrierName] = (carrierCounts[carrierName] || 0) + 1;
      });

      const chartData = Object.entries(carrierCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      return { chartData };
    },
  },

  top_lanes: {
    id: 'top_lanes',
    name: 'Top Lanes',
    description: 'Highest volume shipping lanes',
    type: 'table',
    icon: 'Map',
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const shipmentTable = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let shipmentQuery = supabase
        .from(shipmentTable)
        .select('load_id, retail');

      if (!isAdmin || isViewingAsCustomer) {
        shipmentQuery = shipmentQuery.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await shipmentQuery
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (!shipments || shipments.length === 0) {
        return { tableData: [], columns: [] };
      }

      const loadIds = shipments.map((s: any) => s.load_id);

      const addressTable = getSecureTable('shipment_address', isAdmin, isViewingAsCustomer);

      const { data: addresses } = await supabase
        .from(addressTable)
        .select('load_id, state, address_type')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);

      if (!addresses) {
        return { tableData: [], columns: [] };
      }

      const shipmentMap = new Map(shipments.map((s: any) => [s.load_id, parseFloat(s.retail) || 0]));

      const lanes: { [key: string]: { count: number; totalCost: number } } = {};

      const addressByLoadId: { [key: number]: { origin?: string; dest?: string } } = {};
      addresses.forEach((addr: any) => {
        if (!addressByLoadId[addr.load_id]) {
          addressByLoadId[addr.load_id] = {};
        }
        if (addr.address_type === 1) {
          addressByLoadId[addr.load_id].origin = addr.state || 'Unknown';
        } else if (addr.address_type === 2) {
          addressByLoadId[addr.load_id].dest = addr.state || 'Unknown';
        }
      });

      Object.entries(addressByLoadId).forEach(([loadId, addrs]) => {
        if (addrs.origin && addrs.dest) {
          const laneKey = `${addrs.origin} → ${addrs.dest}`;
          if (!lanes[laneKey]) {
            lanes[laneKey] = { count: 0, totalCost: 0 };
          }
          lanes[laneKey].count += 1;
          lanes[laneKey].totalCost += shipmentMap.get(Number(loadId)) || 0;
        }
      });

      const tableData = Object.entries(lanes)
        .map(([lane, data]) => {
          const [origin, destination] = lane.split(' → ');
          return {
            origin,
            destination,
            shipmentCount: data.count,
            avgCost: formatCurrency((data.totalCost / data.count).toString()),
            totalCost: formatCurrency(data.totalCost.toString()),
          };
        })
        .sort((a, b) => b.shipmentCount - a.shipmentCount)
        .slice(0, 10);

      const columns = [
        { key: 'origin', label: 'Origin' },
        { key: 'destination', label: 'Destination' },
        { key: 'shipmentCount', label: 'Shipments' },
        { key: 'avgCost', label: 'Avg Cost' },
        { key: 'totalCost', label: 'Total Cost' },
      ];

      return { tableData, columns };
    },
  },

  flow_map: {
    id: 'flow_map',
    name: 'Shipment Flow Map',
    description: 'Visual map of shipment origins and destinations',
    type: 'map',
    icon: 'Globe',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const shipmentTable = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let shipmentQuery = supabase
        .from(shipmentTable)
        .select('load_id, retail');

      if (!isAdmin || isViewingAsCustomer) {
        shipmentQuery = shipmentQuery.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await shipmentQuery
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (!shipments || shipments.length === 0) {
        return { mapData: { stateData: [] } };
      }

      const loadIds = shipments.map((s: any) => s.load_id);

      const addressTable = getSecureTable('shipment_address', isAdmin, isViewingAsCustomer);

      const { data: addresses } = await supabase
        .from(addressTable)
        .select('load_id, state, address_type')
        .in('load_id', loadIds)
        .eq('address_type', 2);

      if (!addresses) {
        return { mapData: { stateData: [] } };
      }

      const shipmentMap = new Map(shipments.map((s: any) => [s.load_id, parseFloat(s.retail) || 0]));
      const stateMetrics: { [key: string]: { totalCost: number; count: number } } = {};

      addresses.forEach((addr: any) => {
        if (addr.state) {
          const cost = shipmentMap.get(addr.load_id) || 0;
          if (!stateMetrics[addr.state]) {
            stateMetrics[addr.state] = { totalCost: 0, count: 0 };
          }
          stateMetrics[addr.state].totalCost += cost;
          stateMetrics[addr.state].count += 1;
        }
      });

      const stateData = Object.entries(stateMetrics).map(([stateCode, metrics]) => ({
        stateCode,
        avgCost: metrics.totalCost / metrics.count,
        shipmentCount: metrics.count,
        isOutlier: false,
      }));

      return { mapData: { stateData } };
    },
  },

  on_time_pct: {
    id: 'on_time_pct',
    name: 'On-Time Delivery %',
    description: 'Percentage delivered by expected date',
    type: 'percentage',
    icon: 'Clock',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('delivery_date, expected_delivery_date, shipment_status:status_id(is_completed)')
        .not('delivery_date', 'is', null);

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const completedShipments = shipments?.filter((s: any) => s.shipment_status?.is_completed) || [];

      if (completedShipments.length === 0) {
        return { value: 0 };
      }

      let onTimeCount = 0;

      completedShipments.forEach((s: any) => {
        if (s.expected_delivery_date && s.delivery_date) {
          const expectedDate = new Date(s.expected_delivery_date);
          const actualDate = new Date(s.delivery_date);
          if (actualDate <= expectedDate) {
            onTimeCount++;
          }
        }
      });

      const percentage = (onTimeCount / completedShipments.length) * 100;

      return { value: Math.round(percentage) };
    },
  },

  avg_transit_days: {
    id: 'avg_transit_days',
    name: 'Avg Transit Days',
    description: 'Average days from pickup to delivery',
    type: 'number',
    icon: 'Calendar',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('pickup_date, delivery_date')
        .not('delivery_date', 'is', null);

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (!shipments || shipments.length === 0) {
        return { value: 0 };
      }

      let totalTransitDays = 0;
      let transitDaysCount = 0;

      shipments.forEach((s: any) => {
        if (s.pickup_date && s.delivery_date) {
          const pickupDate = new Date(s.pickup_date);
          const deliveryDate = new Date(s.delivery_date);
          const transitDays = (deliveryDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24);
          if (transitDays >= 0) {
            totalTransitDays += transitDays;
            transitDaysCount++;
          }
        }
      });

      const avgDays = transitDaysCount > 0 ? totalTransitDays / transitDaysCount : 0;

      return { value: Math.round(avgDays * 10) / 10 };
    },
  },

  accessorial_pct: {
    id: 'accessorial_pct',
    name: 'Accessorial % of Total',
    description: 'Accessorial charges as percentage of total cost',
    type: 'percentage',
    icon: 'Percent',
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }: WidgetCalculateParams) => {
      const shipmentTable = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let shipmentQuery = supabase
        .from(shipmentTable)
        .select('load_id, retail');

      if (!isAdmin || isViewingAsCustomer) {
        shipmentQuery = shipmentQuery.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await shipmentQuery
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (!shipments || shipments.length === 0) {
        return { value: 0 };
      }

      const totalCost = shipments.reduce((sum: number, s: any) => sum + (parseFloat(s.retail) || 0), 0);

      const loadIds = shipments.map((s: any) => s.load_id);

      const accessorialTable = getSecureTable('shipment_accessorial', isAdmin, isViewingAsCustomer);

      const { data: accessorials } = await supabase
        .from(accessorialTable)
        .select('load_id, charge_amount')
        .in('load_id', loadIds);

      const totalAccessorials = accessorials?.reduce((sum: number, a: any) => sum + (parseFloat(a.charge_amount) || 0), 0) || 0;

      const percentage = totalCost > 0 ? (totalAccessorials / totalCost) * 100 : 0;

      return { value: Math.round(percentage) };
    },
  },

  top_customers: {
    id: 'top_customers',
    name: 'Top Customers',
    description: 'Customers by total spend',
    type: 'table',
    icon: 'Users',
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
    adminOnly: true,
    calculate: async ({ supabase, dateRange }: WidgetCalculateParams) => {
      const { data: shipments } = await supabase
        .from('shipment')
        .select('load_id, customer_id, retail')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (!shipments || shipments.length === 0) {
        return { tableData: [], columns: [] };
      }

      const customerIds = [...new Set(shipments.map((s: any) => s.customer_id).filter((id: number) => id != null))];

      if (customerIds.length === 0) {
        return { tableData: [], columns: [] };
      }

      const { data: customers } = await supabase
        .from('customer')
        .select('customer_id, company_name')
        .in('customer_id', customerIds);

      const customerMap = new Map(customers?.map((c: any) => [c.customer_id, c.company_name]) || []);
      const customerMetrics: { [key: number]: { count: number; totalSpend: number } } = {};

      shipments.forEach((shipment: any) => {
        const customerId = shipment.customer_id;
        if (customerId) {
          if (!customerMetrics[customerId]) {
            customerMetrics[customerId] = { count: 0, totalSpend: 0 };
          }
          customerMetrics[customerId].count += 1;
          customerMetrics[customerId].totalSpend += parseFloat(shipment.retail) || 0;
        }
      });

      const tableData = Object.entries(customerMetrics)
        .map(([customerId, metrics]) => ({
          customerName: customerMap.get(Number(customerId)) || 'Unknown',
          shipmentCount: metrics.count,
          totalSpend: formatCurrency(metrics.totalSpend.toString()),
          avgCostPerShipment: formatCurrency((metrics.totalSpend / metrics.count).toString()),
        }))
        .sort((a, b) => parseFloat(b.totalSpend.replace(/[$,]/g, '')) - parseFloat(a.totalSpend.replace(/[$,]/g, '')))
        .slice(0, 10);

      const columns = [
        { key: 'customerName', label: 'Customer' },
        { key: 'shipmentCount', label: 'Shipments' },
        { key: 'totalSpend', label: 'Total Spend' },
        { key: 'avgCostPerShipment', label: 'Avg Cost' },
      ];

      return { tableData, columns };
    },
  },
};
