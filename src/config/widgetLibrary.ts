import { SupabaseClient } from '@supabase/supabase-js';
import { WidgetSizeLevel } from '../types/widgets';
import { getSecureTable } from '../utils/getSecureTable';
import { loadLookupTables, getLookupDisplayValue } from '../services/lookupService';

export type WidgetCategory = 'volume' | 'financial' | 'geographic' | 'performance' | 'breakdown';
export type WidgetScope = 'global' | 'customer';
export type WidgetType = 'kpi' | 'featured_kpi' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'map';
export type WidgetSize = 'small' | 'medium' | 'wide' | 'tall' | 'large' | 'hero';

export interface WidgetCalculateParams {
  supabase: SupabaseClient;
  effectiveCustomerIds: number[];
  isAdmin: boolean;
  isViewingAsCustomer: boolean;
  dateRange: { start: string; end: string };
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  scope: WidgetScope;
  type: WidgetType;
  size: WidgetSize;
  icon: string;
  iconColor: string;
  gradient?: string;
  tooltip?: string;
  dataDefinition?: string;
  calculate: (params: WidgetCalculateParams) => Promise<any>;
  adminOnly?: boolean;
}

export const widgetLibrary: Record<string, WidgetDefinition> = {
  // ============ GEOGRAPHIC (Hero) ============
  flow_map: {
    id: 'flow_map',
    name: 'Shipment Flow Map',
    description: 'Visual map showing shipment origins, destinations, and routes across the US',
    category: 'geographic',
    scope: 'global',
    type: 'map',
    size: 'hero',
    icon: 'Globe',
    iconColor: 'bg-blue-500',
    tooltip: 'Interactive map showing origin to destination shipping lanes',
    dataDefinition: 'Each line connects pickup and delivery locations. Line thickness indicates volume.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      console.log('[flow_map] Starting calculation', {
        effectiveCustomerIds,
        isAdmin,
        isViewingAsCustomer,
        dateRange
      });

      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments, error: shipmentsError } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      console.log('[flow_map] Shipments query result:', {
        shipmentsCount: shipments?.length || 0,
        error: shipmentsError
      });

      if (!shipments || shipments.length === 0) {
        console.log('[flow_map] No shipments found');
        return {
          effectiveCustomerIds,
          isAdmin,
          isViewingAsCustomer,
          startDate: dateRange.start,
          endDate: dateRange.end
        };
      }

      const loadIds = shipments.map(s => s.load_id);
      console.log('[flow_map] Looking up addresses for load_ids:', loadIds.length);

      const addressTable = getSecureTable('shipment_address', isAdmin, isViewingAsCustomer);

      const { data: addresses, error: addressesError } = await supabase
        .from(addressTable)
        .select('load_id, city, state, postal_code, address_type')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);

      console.log('[flow_map] Addresses query result:', {
        addressesCount: addresses?.length || 0,
        error: addressesError
      });

      if (addresses) {
        const origins = addresses.filter(a => a.address_type === 1);
        const destinations = addresses.filter(a => a.address_type === 2);
        console.log('[flow_map] Origins:', origins.length, 'Destinations:', destinations.length);

        const states = new Set(addresses.map(a => a.state).filter(Boolean));
        console.log('[flow_map] Unique states found:', Array.from(states));
      }

      return {
        effectiveCustomerIds,
        isAdmin,
        isViewingAsCustomer,
        startDate: dateRange.start,
        endDate: dateRange.end
      };
    }
  },

  cost_by_state: {
    id: 'cost_by_state',
    name: 'Cost by State',
    description: 'Choropleth map showing shipping costs by destination state',
    category: 'geographic',
    scope: 'global',
    type: 'map',
    size: 'large',
    icon: 'Map',
    iconColor: 'bg-blue-500',
    tooltip: 'Average cost per shipment by destination state. Darker = higher cost.',
    dataDefinition: 'SUM(retail) / COUNT(*) grouped by destination state.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      console.log('[cost_by_state] Starting calculation', {
        effectiveCustomerIds,
        isAdmin,
        isViewingAsCustomer,
        dateRange
      });

      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id, retail');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments, error: shipmentsError } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      console.log('[cost_by_state] Shipments query result:', {
        shipmentsCount: shipments?.length || 0,
        error: shipmentsError
      });

      if (!shipments || shipments.length === 0) {
        console.log('[cost_by_state] No shipments found');
        return { data: [] };
      }

      const loadIds = shipments.map(s => s.load_id);
      console.log('[cost_by_state] Looking up addresses for load_ids:', loadIds.length);

      const addressTable = getSecureTable('shipment_address', isAdmin, isViewingAsCustomer);

      const { data: addresses, error: addressesError } = await supabase
        .from(addressTable)
        .select('load_id, state')
        .in('load_id', loadIds)
        .eq('address_type', 2);

      console.log('[cost_by_state] Addresses query result:', {
        addressesCount: addresses?.length || 0,
        error: addressesError
      });

      const stateStats = (shipments || []).reduce((acc: any, shipment: any) => {
        const address = addresses?.find(a => a.load_id === shipment.load_id);
        const state = address?.state;
        if (state) {
          if (!acc[state]) {
            acc[state] = { count: 0, totalCost: 0 };
          }
          acc[state].count += 1;
          acc[state].totalCost += (shipment.retail || 0);
        }
        return acc;
      }, {});

      console.log('[cost_by_state] State statistics:', stateStats);

      const stateData = Object.entries(stateStats).map(([stateCode, stats]: [string, any]) => {
        const avgCost = stats.count > 0 ? stats.totalCost / stats.count : 0;
        return {
          state: stateCode,
          stateCode,
          shipmentCount: stats.count,
          totalCost: stats.totalCost,
          avgCost,
          isOutlier: false
        };
      });

      const avgCosts = stateData.map(s => s.avgCost).sort((a, b) => a - b);
      if (avgCosts.length > 0) {
        const q1 = avgCosts[Math.floor(avgCosts.length * 0.25)];
        const q3 = avgCosts[Math.floor(avgCosts.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        stateData.forEach(s => {
          s.isOutlier = s.avgCost < lowerBound || s.avgCost > upperBound;
        });
      }

      console.log('[cost_by_state] Final state data:', stateData.length, 'states');

      return { data: stateData };
    }
  },

  // ============ VOLUME ============
  total_shipments: {
    id: 'total_shipments',
    name: 'Total Shipments',
    description: 'Count of all shipments in the selected date range',
    category: 'volume',
    scope: 'global',
    type: 'kpi',
    size: 'small',
    icon: 'Package',
    iconColor: 'bg-blue-500',
    tooltip: 'COUNT(*) of all shipments with pickup_date in range',
    dataDefinition: 'Includes all statuses. Excludes cancelled shipments.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { count } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      return { value: count || 0, label: 'Shipments' };
    }
  },

  in_transit: {
    id: 'in_transit',
    name: 'In Transit',
    description: 'Shipments currently in transit',
    category: 'volume',
    scope: 'global',
    type: 'kpi',
    size: 'small',
    icon: 'Truck',
    iconColor: 'bg-amber-500',
    tooltip: 'COUNT(*) of shipments with pickup_date but no delivery_date',
    dataDefinition: 'Shipments picked up but not yet delivered.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { count } = await query
        .is('delivery_date', null)
        .gte('pickup_date', dateRange.start);

      return { value: count || 0, label: 'In Transit' };
    }
  },

  delivered_month: {
    id: 'delivered_month',
    name: 'Delivered This Month',
    description: 'Shipments delivered in the current month',
    category: 'volume',
    scope: 'global',
    type: 'kpi',
    size: 'small',
    icon: 'CheckCircle',
    iconColor: 'bg-green-500',
    tooltip: 'COUNT(*) of shipments delivered in current calendar month',
    dataDefinition: 'Only shipments with delivery_date set.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { count } = await query
        .not('delivery_date', 'is', null)
        .gte('delivery_date', startOfMonth)
        .lte('delivery_date', endOfMonth);

      return { value: count || 0, label: 'Delivered' };
    }
  },

  shipment_volume_trend: {
    id: 'shipment_volume_trend',
    name: 'Shipment Volume Trend',
    description: 'Daily or weekly shipment counts over time',
    category: 'volume',
    scope: 'global',
    type: 'bar_chart',
    size: 'wide',
    icon: 'BarChart3',
    iconColor: 'bg-blue-500',
    tooltip: 'COUNT(*) grouped by pickup_date over time',
    dataDefinition: 'Daily shipment volume. Each bar = one day.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('pickup_date');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('pickup_date');

      const dailyCounts = (data || []).reduce((acc: any, row: any) => {
        const date = row.pickup_date;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(dailyCounts).map(([date, count]) => ({
        date,
        count
      }));

      return { data: chartData };
    }
  },

  // ============ FINANCIAL ============
  total_cost: {
    id: 'total_cost',
    name: 'Total Cost',
    description: 'Total shipping spend in the date range',
    category: 'financial',
    scope: 'global',
    type: 'featured_kpi',
    size: 'medium',
    icon: 'DollarSign',
    iconColor: 'bg-rocket-600',
    tooltip: 'SUM(retail) for all shipments in date range',
    dataDefinition: 'Includes base freight, fuel, and accessorials.',
    gradient: 'from-rocket-600 to-rocket-700',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('retail');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const total = (data || []).reduce((sum, row) => sum + (row.retail || 0), 0);
      return { value: total, format: 'currency', label: 'Total Spend' };
    }
  },

  avg_cost_shipment: {
    id: 'avg_cost_shipment',
    name: 'Avg Cost Per Shipment',
    description: 'Average shipping cost per shipment',
    category: 'financial',
    scope: 'global',
    type: 'featured_kpi',
    size: 'medium',
    icon: 'TrendingUp',
    iconColor: 'bg-emerald-600',
    tooltip: 'SUM(retail) / COUNT(*) for shipments',
    dataDefinition: 'Average cost across all shipments.',
    gradient: 'from-emerald-600 to-emerald-700',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('retail');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const total = (data || []).reduce((sum, row) => sum + (row.retail || 0), 0);
      const avg = data && data.length > 0 ? total / data.length : 0;
      return { value: avg, format: 'currency', label: 'Avg/Shipment' };
    }
  },

  monthly_spend: {
    id: 'monthly_spend',
    name: 'Monthly Spend Trend',
    description: 'Shipping spend over time',
    category: 'financial',
    scope: 'global',
    type: 'line_chart',
    size: 'wide',
    icon: 'LineChart',
    iconColor: 'bg-blue-500',
    tooltip: 'SUM(retail) grouped by month',
    dataDefinition: 'Monthly spend trend. Each point = one month.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('pickup_date, retail');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('pickup_date');

      const monthlyData = (data || []).reduce((acc: any, row: any) => {
        const month = row.pickup_date.substring(0, 7);
        acc[month] = (acc[month] || 0) + (row.retail || 0);
        return acc;
      }, {});

      const chartData = Object.entries(monthlyData).map(([month, total]) => ({
        month,
        total
      }));

      return { data: chartData };
    }
  },

  accessorial_breakdown: {
    id: 'accessorial_breakdown',
    name: 'Accessorial Charges',
    description: 'Breakdown of accessorial charges by type',
    category: 'financial',
    scope: 'global',
    type: 'bar_chart',
    size: 'wide',
    icon: 'Receipt',
    iconColor: 'bg-orange-500',
    tooltip: 'SUM(charge) grouped by accessorial type',
    dataDefinition: 'Liftgate, residential, limited access, etc.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('id');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (!shipments || shipments.length === 0) {
        return { data: [] };
      }

      const shipmentIds = shipments.map(s => s.id);

      const { data: accessorials } = await supabase
        .from('shipment_accessorial')
        .select('accessorial_type_id, charge')
        .in('shipment_id', shipmentIds);

      const typeData = (accessorials || []).reduce((acc: any, row: any) => {
        const type = row.accessorial_type_id || 'Unknown';
        acc[type] = (acc[type] || 0) + (row.charge || 0);
        return acc;
      }, {});

      const chartData = Object.entries(typeData).map(([type, total]) => ({
        type,
        total
      }));

      return { data: chartData };
    }
  },

  cost_per_mile: {
    id: 'cost_per_mile',
    name: 'Cost Per Mile',
    description: 'Average shipping cost per mile',
    category: 'financial',
    scope: 'global',
    type: 'kpi',
    size: 'small',
    icon: 'Navigation',
    iconColor: 'bg-teal-500',
    tooltip: 'SUM(retail) / SUM(miles)',
    dataDefinition: 'Only shipments with valid mileage.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('retail, miles');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('miles', 'is', null)
        .gt('miles', 0);

      const totalCost = (data || []).reduce((sum, row) => sum + (row.retail || 0), 0);
      const totalMiles = (data || []).reduce((sum, row) => sum + (row.miles || 0), 0);
      const costPerMile = totalMiles > 0 ? totalCost / totalMiles : 0;

      return { value: costPerMile, format: 'currency', label: 'Per Mile' };
    }
  },

  // ============ BREAKDOWN ============
  mode_breakdown: {
    id: 'mode_breakdown',
    name: 'Shipments by Mode',
    description: 'Distribution of shipments by mode (LTL, TL, etc.)',
    category: 'breakdown',
    scope: 'global',
    type: 'pie_chart',
    size: 'tall',
    icon: 'PieChart',
    iconColor: 'bg-cyan-500',
    tooltip: 'COUNT(*) grouped by shipping mode',
    dataDefinition: 'Distribution: LTL, FTL, Parcel, etc.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);
      const lookups = await loadLookupTables();

      let query = supabase
        .from(table)
        .select('mode_id');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const modeCounts = (data || []).reduce((acc: any, row: any) => {
        const modeName = getLookupDisplayValue(lookups, 'mode_id', row.mode_id);
        acc[modeName] = (acc[modeName] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(modeCounts).map(([name, count]) => ({
        name,
        value: count
      }));

      return { data: chartData };
    }
  },

  carrier_mix: {
    id: 'carrier_mix',
    name: 'Carrier Mix',
    description: 'Shipment distribution by carrier',
    category: 'breakdown',
    scope: 'global',
    type: 'pie_chart',
    size: 'tall',
    icon: 'Truck',
    iconColor: 'bg-cyan-500',
    tooltip: 'COUNT(*) grouped by carrier',
    dataDefinition: 'Shipment volume by carrier.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id, rate_carrier_id');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (!shipments || shipments.length === 0) {
        return { data: [] };
      }

      const carrierIds = [...new Set(shipments.map(s => s.rate_carrier_id).filter(id => id != null))];

      if (carrierIds.length === 0) {
        return { data: [] };
      }

      const { data: carriers } = await supabase
        .from('carrier')
        .select('carrier_id, carrier_name')
        .in('carrier_id', carrierIds);

      const carrierMap = new Map((carriers || []).map(c => [c.carrier_id, c.carrier_name]));

      const carrierCounts = (shipments || []).reduce((acc: any, row: any) => {
        const carrierName = carrierMap.get(row.rate_carrier_id) || 'Unknown';
        acc[carrierName] = (acc[carrierName] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(carrierCounts).map(([carrier, count]) => ({
        name: carrier,
        value: count
      }));

      return { data: chartData };
    }
  },

  spend_by_carrier: {
    id: 'spend_by_carrier',
    name: 'Spend by Carrier',
    description: 'Top carriers by total spend',
    category: 'breakdown',
    scope: 'global',
    type: 'bar_chart',
    size: 'wide',
    icon: 'BarChart',
    iconColor: 'bg-cyan-500',
    tooltip: 'SUM(retail) grouped by carrier',
    dataDefinition: 'Total spend per carrier, sorted high to low.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id, retail, rate_carrier_id');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (!shipments || shipments.length === 0) {
        return { data: [] };
      }

      const carrierIds = [...new Set(shipments.map(s => s.rate_carrier_id).filter(id => id != null))];

      if (carrierIds.length === 0) {
        return { data: [] };
      }

      const { data: carriers } = await supabase
        .from('carrier')
        .select('carrier_id, carrier_name')
        .in('carrier_id', carrierIds);

      const carrierMap = new Map((carriers || []).map(c => [c.carrier_id, c.carrier_name]));

      const carrierSpend = (shipments || []).reduce((acc: any, row: any) => {
        const carrierName = carrierMap.get(row.rate_carrier_id) || 'Unknown';
        acc[carrierName] = (acc[carrierName] || 0) + (row.retail || 0);
        return acc;
      }, {});

      const chartData = Object.entries(carrierSpend)
        .map(([carrier, spend]) => ({ carrier, spend }))
        .sort((a: any, b: any) => b.spend - a.spend);

      return { data: chartData };
    }
  },

  top_lanes: {
    id: 'top_lanes',
    name: 'Top Lanes',
    description: 'Highest volume shipping lanes',
    category: 'breakdown',
    scope: 'global',
    type: 'table',
    size: 'large',
    icon: 'Route',
    iconColor: 'bg-slate-500',
    tooltip: 'COUNT(*) and AVG(cost) by origin to destination',
    dataDefinition: 'Busiest shipping lanes.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id, retail');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (!shipments || shipments.length === 0) {
        return { data: [] };
      }

      const loadIds = shipments.map(s => s.load_id);
      const { data: addresses } = await supabase
        .from('shipment_address')
        .select('load_id, state, address_type')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);

      const laneData = (shipments || []).reduce((acc: any, shipment: any) => {
        const origin = addresses?.find(a => a.load_id === shipment.load_id && a.address_type === 1)?.state || 'Unknown';
        const dest = addresses?.find(a => a.load_id === shipment.load_id && a.address_type === 2)?.state || 'Unknown';
        const lane = `${origin} → ${dest}`;

        if (!acc[lane]) {
          acc[lane] = { count: 0, totalCost: 0 };
        }
        acc[lane].count += 1;
        acc[lane].totalCost += shipment.retail || 0;
        return acc;
      }, {});

      const tableData = Object.entries(laneData)
        .map(([lane, stats]: [string, any]) => ({
          lane,
          count: stats.count,
          avgCost: stats.count > 0 ? stats.totalCost / stats.count : 0
        }))
        .sort((a, b) => b.count - a.count);

      return { data: tableData };
    }
  },

  // ============ PERFORMANCE ============
  on_time_pct: {
    id: 'on_time_pct',
    name: 'On-Time Delivery %',
    description: 'Percentage of shipments delivered by expected date',
    category: 'performance',
    scope: 'global',
    type: 'kpi',
    size: 'small',
    icon: 'Clock',
    iconColor: 'bg-teal-500',
    tooltip: '(On-time deliveries / Total deliveries) x 100',
    dataDefinition: 'Delivered on or before expected date.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('delivery_date, expected_delivery_date');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('delivery_date', 'is', null)
        .not('expected_delivery_date', 'is', null);

      const onTime = (data || []).filter(
        row => row.delivery_date <= row.expected_delivery_date
      ).length;

      const total = data?.length || 0;
      const percentage = total > 0 ? (onTime / total) * 100 : 0;

      return { value: percentage, format: 'percentage', label: 'On Time' };
    }
  },

  avg_transit_days: {
    id: 'avg_transit_days',
    name: 'Avg Transit Days',
    description: 'Average days from pickup to delivery',
    category: 'performance',
    scope: 'global',
    type: 'kpi',
    size: 'small',
    icon: 'Calendar',
    iconColor: 'bg-rose-500',
    tooltip: 'AVG(delivery_date - pickup_date) in days',
    dataDefinition: 'Calendar days in transit for delivered shipments.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('pickup_date, delivery_date');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('delivery_date', 'is', null);

      const transitDays = (data || []).map(row => {
        const pickup = new Date(row.pickup_date);
        const delivery = new Date(row.delivery_date);
        return (delivery.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24);
      });

      const avg = transitDays.length > 0
        ? transitDays.reduce((sum, days) => sum + days, 0) / transitDays.length
        : 0;

      return { value: Math.round(avg * 10) / 10, label: 'Days' };
    }
  },

  carrier_performance: {
    id: 'carrier_performance',
    name: 'Carrier Performance',
    description: 'On-time rates and transit times by carrier',
    category: 'performance',
    scope: 'global',
    type: 'table',
    size: 'large',
    icon: 'Award',
    iconColor: 'bg-amber-500',
    tooltip: 'On-time %, avg transit, and volume by carrier',
    dataDefinition: 'Carrier service quality comparison.',
    calculate: async ({ supabase, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange }) => {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id, pickup_date, delivery_date, expected_delivery_date, rate_carrier_id');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('delivery_date', 'is', null);

      if (!shipments || shipments.length === 0) {
        return { data: [] };
      }

      const carrierIds = [...new Set(shipments.map(s => s.rate_carrier_id).filter(id => id != null))];

      if (carrierIds.length === 0) {
        return { data: [] };
      }

      const { data: carriers } = await supabase
        .from('carrier')
        .select('carrier_id, carrier_name')
        .in('carrier_id', carrierIds);

      const carrierMap = new Map((carriers || []).map(c => [c.carrier_id, c.carrier_name]));

      const carrierStats = (shipments || []).reduce((acc: any, row: any) => {
        const carrierName = carrierMap.get(row.rate_carrier_id) || 'Unknown';

        if (!acc[carrierName]) {
          acc[carrierName] = { total: 0, onTime: 0, transitDays: [] };
        }

        acc[carrierName].total += 1;

        if (row.expected_delivery_date && row.delivery_date <= row.expected_delivery_date) {
          acc[carrierName].onTime += 1;
        }

        const pickup = new Date(row.pickup_date);
        const delivery = new Date(row.delivery_date);
        const days = (delivery.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24);
        acc[carrierName].transitDays.push(days);

        return acc;
      }, {});

      const tableData = Object.entries(carrierStats).map(([carrier, stats]: [string, any]) => ({
        carrier,
        shipments: stats.total,
        onTimeRate: stats.total > 0 ? (stats.onTime / stats.total) * 100 : 0,
        avgTransit: stats.transitDays.length > 0
          ? stats.transitDays.reduce((sum: number, d: number) => sum + d, 0) / stats.transitDays.length
          : 0
      }));

      return { data: tableData };
    }
  }
};

export const getWidgetsByCategory = (category: WidgetCategory) =>
  Object.values(widgetLibrary).filter(w => w.category === category);

export const getGlobalWidgets = () =>
  Object.values(widgetLibrary).filter(w => w.scope === 'global');

const getBaseColSpan = (widgetType: WidgetType, widgetSize: WidgetSize): number => {
  if (widgetSize === 'hero') return 3;
  if (widgetType === 'map' || widgetSize === 'large') return 2;
  if (widgetType === 'line_chart' || widgetType === 'bar_chart' || widgetSize === 'wide') return 2;
  if (widgetType === 'table') return 2;
  return 1;
};

export const getEffectiveColSpan = (
  widgetType: WidgetType,
  widgetSize: WidgetSize,
  sizeLevel: WidgetSizeLevel = 'default'
): string => {
  const baseSpan = getBaseColSpan(widgetType, widgetSize);

  let effectiveSpan: number;
  switch (sizeLevel) {
    case 'default':
      effectiveSpan = baseSpan;
      break;
    case 'large':
      effectiveSpan = Math.min(baseSpan + 1, 3);
      break;
    case 'xlarge':
      effectiveSpan = Math.min(baseSpan + 2, 3);
      break;
    case 'full':
      effectiveSpan = 3;
      break;
    default:
      effectiveSpan = baseSpan;
  }

  if (effectiveSpan === 3) return 'col-span-1 md:col-span-2 lg:col-span-3';
  if (effectiveSpan === 2) return 'col-span-1 md:col-span-2';
  return 'col-span-1';
};

export const getScaleFactor = (sizeLevel: WidgetSizeLevel = 'default'): number => {
  switch (sizeLevel) {
    case 'default': return 1;
    case 'large': return 1.25;
    case 'xlarge': return 1.5;
    case 'full': return 1.75;
    default: return 1;
  }
};

export const getSizeLevelLabel = (sizeLevel: WidgetSizeLevel): string => {
  switch (sizeLevel) {
    case 'default': return 'Auto';
    case 'large': return 'Large';
    case 'xlarge': return 'XL';
    case 'full': return 'Full Width';
    default: return 'Auto';
  }
};

export const getColSpan = (widgetType: WidgetType, widgetSize: WidgetSize): string => {
  return getEffectiveColSpan(widgetType, widgetSize, 'default');
};
