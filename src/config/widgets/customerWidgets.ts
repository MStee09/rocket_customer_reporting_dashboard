import { WidgetDefinition } from './widgetTypes';
import { logger } from '../../utils/logger';

export const customerWidgets: Record<string, WidgetDefinition> = {

  total_shipments: {
    id: 'total_shipments',
    name: 'Total Shipments',
    description: 'Total number of shipments in the selected period',
    type: 'kpi',
    category: 'volume',
    access: 'customer',
    defaultSize: 'small',
    icon: 'Package',
    iconColor: 'bg-blue-500',
    dataDefinition: 'Count of all shipments with pickup date in range',
    tooltip: 'Counts shipments where pickup_date falls within the selected date range',
    whatItShows: {
      summary: 'Shows the total count of all your shipments within the selected date range.',
      columns: [
        { name: 'Total Count', description: 'Number of shipments' },
      ],
      filters: [
        'Your shipments only',
        'Within selected date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, customerId, dateRange }) => {
      logger.log('[total_shipments] Calculate called with:', {
        customerId,
        dateRange: { start: dateRange.start, end: dateRange.end },
      });

      const query = supabase
        .from('shipment')
        .select('load_id', { count: 'exact', head: true })
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (customerId) {
        query.eq('customer_id', customerId);
        logger.log('[total_shipments] Filtering by customer_id:', customerId);
      } else {
        logger.log('[total_shipments] WARNING: No customerId provided - query will return ALL shipments (subject to RLS)');
      }

      const { count, error } = await query;

      logger.log('[total_shipments] Query result:', { count, error });

      return {
        type: 'kpi',
        value: count || 0,
        label: 'Shipments',
        format: 'number',
        metadata: {
          recordCount: count || 0,
          dateRange: { start: dateRange.start, end: dateRange.end },
        },
      };
    },
  },

  in_transit: {
    id: 'in_transit',
    name: 'In Transit',
    description: 'Shipments currently in transit',
    type: 'kpi',
    category: 'volume',
    access: 'customer',
    defaultSize: 'small',
    icon: 'Truck',
    iconColor: 'bg-amber-500',
    dataDefinition: 'Count of shipments with in_transit status',
    tooltip: 'Counts shipments where status = in_transit (picked up but not yet delivered)',
    whatItShows: {
      summary: 'Shows how many of your shipments are currently in transit (picked up but not yet delivered).',
      columns: [
        { name: 'In Transit Count', description: 'Shipments currently moving' },
      ],
      filters: [
        'Your shipments only',
        'Status: In Transit',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, customerId }) => {
      const { data: statusData } = await supabase
        .from('shipment_status')
        .select('status_id')
        .eq('status_name', 'In Transit')
        .maybeSingle();

      if (!statusData) {
        return {
          type: 'kpi',
          value: 0,
          label: 'In Transit',
          format: 'number',
          metadata: { recordCount: 0 },
        };
      }

      const query = supabase
        .from('shipment')
        .select('load_id', { count: 'exact', head: true })
        .eq('status_id', statusData.status_id);

      if (customerId) {
        query.eq('customer_id', customerId);
      }

      const { count } = await query;

      return {
        type: 'kpi',
        value: count || 0,
        label: 'In Transit',
        format: 'number',
        metadata: {
          recordCount: count || 0,
        },
      };
    },
  },

  delivered_month: {
    id: 'delivered_month',
    name: 'Delivered This Month',
    description: 'Shipments delivered in the current month',
    type: 'kpi',
    category: 'volume',
    access: 'customer',
    defaultSize: 'small',
    icon: 'CheckCircle',
    iconColor: 'bg-green-500',
    dataDefinition: 'Count of delivered shipments this calendar month',
    tooltip: 'Counts shipments where status = delivered and delivery_date is in current month',
    whatItShows: {
      summary: 'Shows the count of shipments that have been delivered during the current calendar month.',
      columns: [
        { name: 'Delivered Count', description: 'Shipments delivered this month' },
      ],
      filters: [
        'Your shipments only',
        'Delivered in current month',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, customerId }) => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: statusData } = await supabase
        .from('shipment_status')
        .select('status_id')
        .eq('status_name', 'Delivered')
        .maybeSingle();

      if (!statusData) {
        return {
          type: 'kpi',
          value: 0,
          label: 'Delivered',
          format: 'number',
          metadata: { recordCount: 0 },
        };
      }

      const query = supabase
        .from('shipment')
        .select('load_id', { count: 'exact', head: true })
        .eq('status_id', statusData.status_id)
        .gte('delivery_date', startOfMonth.toISOString());

      if (customerId) {
        query.eq('customer_id', customerId);
      }

      const { count } = await query;

      return {
        type: 'kpi',
        value: count || 0,
        label: 'Delivered',
        format: 'number',
        metadata: {
          recordCount: count || 0,
        },
      };
    },
  },

  total_cost: {
    id: 'total_cost',
    name: 'Total Cost',
    description: 'Total freight spend in the selected period',
    type: 'featured_kpi',
    category: 'financial',
    access: 'customer',
    defaultSize: 'small',
    icon: 'DollarSign',
    iconColor: 'bg-blue-500',
    gradient: 'from-blue-600 to-blue-700',
    dataDefinition: 'Sum of all shipment retail (billed) amounts',
    tooltip: 'Total Spend = Sum of retail field for all shipments in date range',
    whatItShows: {
      summary: 'Shows your total freight spending across all shipments in the selected date range.',
      columns: [
        { name: 'Total Spend', description: 'Sum of all shipment costs (currency)' },
      ],
      filters: [
        'Your shipments only',
        'Within selected date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, customerId, dateRange }) => {
      const query = supabase
        .from('shipment')
        .select('retail')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (customerId) {
        query.eq('customer_id', customerId);
      }

      const { data } = await query;
      const total = data?.reduce((sum, s) => sum + (s.retail || 0), 0) || 0;
      const recordCount = data?.length || 0;

      return {
        type: 'kpi',
        value: total,
        label: 'Total Spend',
        format: 'currency',
        metadata: {
          recordCount,
          dateRange: { start: dateRange.start, end: dateRange.end },
        },
      };
    },
  },

  avg_cost_shipment: {
    id: 'avg_cost_shipment',
    name: 'Avg Cost Per Shipment',
    description: 'Average cost per shipment',
    type: 'featured_kpi',
    category: 'financial',
    access: 'customer',
    defaultSize: 'small',
    icon: 'TrendingUp',
    iconColor: 'bg-emerald-500',
    gradient: 'from-emerald-600 to-emerald-700',
    dataDefinition: 'Average retail (billed) amount per shipment',
    tooltip: 'Avg Cost = Total Spend / Number of Shipments',
    whatItShows: {
      summary: 'Shows the average cost you pay per shipment, calculated by dividing total spend by shipment count.',
      columns: [
        { name: 'Average Cost', description: 'Total cost / number of shipments' },
      ],
      filters: [
        'Your shipments only',
        'Within selected date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, customerId, dateRange }) => {
      const query = supabase
        .from('shipment')
        .select('retail')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (customerId) {
        query.eq('customer_id', customerId);
      }

      const { data } = await query;
      const total = data?.reduce((sum, s) => sum + (s.retail || 0), 0) || 0;
      const recordCount = data?.length || 0;
      const avg = recordCount > 0 ? total / recordCount : 0;

      return {
        type: 'kpi',
        value: avg,
        label: 'Avg/Shipment',
        format: 'currency',
        metadata: {
          recordCount,
          dateRange: { start: dateRange.start, end: dateRange.end },
        },
      };
    },
  },

  on_time_pct: {
    id: 'on_time_pct',
    name: 'On-Time Delivery %',
    description: 'Percentage of shipments delivered on time',
    type: 'kpi',
    category: 'performance',
    access: 'customer',
    defaultSize: 'small',
    icon: 'Clock',
    iconColor: 'bg-purple-500',
    dataDefinition: 'Percentage of deliveries on or before expected date',
    tooltip: 'On-Time % = (Shipments delivered on/before expected date / Total delivered) x 100',
    whatItShows: {
      summary: 'Shows the percentage of your shipments that were delivered on or before the scheduled delivery date.',
      columns: [
        { name: 'On-Time %', description: 'Percentage of on-time deliveries' },
      ],
      filters: [
        'Your shipments only',
        'Delivered shipments in date range',
        'Compares actual vs. scheduled delivery',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, customerId, dateRange }) => {
      const { data: statusData } = await supabase
        .from('shipment_status')
        .select('status_id')
        .eq('status_name', 'Delivered')
        .maybeSingle();

      if (!statusData) {
        return {
          type: 'kpi',
          value: 0,
          label: 'On Time',
          format: 'percent',
          metadata: {
            recordCount: 0,
            dateRange: { start: dateRange.start, end: dateRange.end },
          },
        };
      }

      const query = supabase
        .from('shipment')
        .select('delivery_date, expected_delivery_date')
        .eq('status_id', statusData.status_id)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (customerId) {
        query.eq('customer_id', customerId);
      }

      const { data } = await query;
      const recordCount = data?.length || 0;

      if (!data?.length) {
        return {
          type: 'kpi',
          value: 0,
          label: 'On Time',
          format: 'percent',
          metadata: {
            recordCount: 0,
            dateRange: { start: dateRange.start, end: dateRange.end },
          },
        };
      }

      const onTime = data.filter(s =>
        s.delivery_date && s.expected_delivery_date &&
        new Date(s.delivery_date) <= new Date(s.expected_delivery_date)
      ).length;

      const pct = (onTime / data.length) * 100;

      return {
        type: 'kpi',
        value: pct,
        label: 'On Time',
        format: 'percent',
        metadata: {
          recordCount,
          dateRange: { start: dateRange.start, end: dateRange.end },
        },
      };
    },
  },

  monthly_spend: {
    id: 'monthly_spend',
    name: 'Monthly Spend Trend',
    description: 'Freight spend over time',
    type: 'line_chart',
    category: 'financial',
    access: 'customer',
    defaultSize: 'wide',
    icon: 'LineChart',
    iconColor: 'bg-blue-500',
    dataDefinition: 'Monthly sum of retail amounts over time',
    tooltip: 'Aggregates total retail spend for each month in the date range',
    whatItShows: {
      summary: 'Shows how your freight spending has changed month over month, helping you identify trends and seasonality.',
      columns: [
        { name: 'Month', description: 'Calendar month' },
        { name: 'Total Spend', description: 'Sum of shipment costs for that month' },
      ],
      filters: [
        'Your shipments only',
        'Within selected date range',
        'Grouped by month',
      ],
      sortedBy: 'Month (chronological)',
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, customerId, dateRange }) => {
      const query = supabase
        .from('shipment')
        .select('pickup_date, retail')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('pickup_date');

      if (customerId) {
        query.eq('customer_id', customerId);
      }

      const { data } = await query;
      const recordCount = data?.length || 0;

      const byMonth = new Map<string, number>();
      data?.forEach(s => {
        const month = s.pickup_date?.substring(0, 7);
        if (month) {
          byMonth.set(month, (byMonth.get(month) || 0) + (s.retail || 0));
        }
      });

      const chartData = Array.from(byMonth.entries())
        .map(([month, value]) => ({
          month,
          value,
          label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        type: 'chart',
        data: chartData,
        metadata: {
          recordCount,
          dateRange: { start: dateRange.start, end: dateRange.end },
        },
      };
    },
  },

  mode_breakdown: {
    id: 'mode_breakdown',
    name: 'Shipments by Mode',
    description: 'Distribution of shipments by transportation mode',
    type: 'pie_chart',
    category: 'breakdown',
    access: 'customer',
    defaultSize: 'medium',
    icon: 'PieChart',
    iconColor: 'bg-cyan-500',
    dataDefinition: 'Shipment count grouped by transportation mode',
    tooltip: 'Groups shipments by mode field (LTL, FTL, Parcel, etc.) and counts each',
    whatItShows: {
      summary: 'Shows the distribution of your shipments across different transportation modes (LTL, FTL, Parcel, etc.).',
      columns: [
        { name: 'Mode', description: 'Transportation mode (LTL, FTL, etc.)' },
        { name: 'Count', description: 'Number of shipments using this mode' },
      ],
      filters: [
        'Your shipments only',
        'Within selected date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, customerId, dateRange }) => {
      const query = supabase
        .from('shipment')
        .select(`
          load_id,
          mode:shipment_mode!mode_id(mode_name)
        `)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (customerId) {
        query.eq('customer_id', customerId);
      }

      const { data } = await query;
      const recordCount = data?.length || 0;

      const byMode = new Map<string, number>();
      data?.forEach(s => {
        const mode = (s.mode as { mode_name?: string })?.mode_name || 'Unknown';
        byMode.set(mode, (byMode.get(mode) || 0) + 1);
      });

      const chartData = Array.from(byMode.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      return {
        type: 'chart',
        data: chartData,
        metadata: {
          recordCount,
          dateRange: { start: dateRange.start, end: dateRange.end },
        },
      };
    },
  },

  carrier_mix: {
    id: 'carrier_mix',
    name: 'Carrier Mix',
    description: 'Distribution of shipments by carrier',
    type: 'pie_chart',
    category: 'breakdown',
    access: 'customer',
    defaultSize: 'medium',
    icon: 'PieChart',
    iconColor: 'bg-purple-500',
    dataDefinition: 'Shipment count grouped by assigned carrier',
    tooltip: 'Groups shipments by carrier and counts each to show distribution',
    whatItShows: {
      summary: 'Shows how your shipments are distributed across different carriers, helping you understand carrier concentration.',
      columns: [
        { name: 'Carrier', description: 'Carrier company name' },
        { name: 'Shipments', description: 'Number of shipments with this carrier' },
      ],
      filters: [
        'Your shipments only',
        'Within selected date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, customerId, dateRange }) => {
      const shipmentsQuery = supabase
        .from('shipment')
        .select('load_id, rate_carrier_id')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('rate_carrier_id', 'is', null);

      if (customerId) {
        shipmentsQuery.eq('customer_id', customerId);
      }

      const { data: shipments } = await shipmentsQuery;
      const recordCount = shipments?.length || 0;

      if (!shipments || shipments.length === 0) {
        return {
          type: 'chart',
          data: [],
          metadata: {
            recordCount: 0,
            dateRange: { start: dateRange.start, end: dateRange.end },
          },
        };
      }

      const carrierIds = [...new Set(shipments.map(s => s.rate_carrier_id).filter(Boolean))];

      const { data: carriers } = await supabase
        .from('carrier')
        .select('carrier_id, carrier_name')
        .in('carrier_id', carrierIds);

      const carrierMap = new Map(carriers?.map(c => [c.carrier_id, c.carrier_name]));

      const byCarrier = new Map<string, number>();
      shipments.forEach(s => {
        const name = carrierMap.get(s.rate_carrier_id) || 'Unknown';
        byCarrier.set(name, (byCarrier.get(name) || 0) + 1);
      });

      const chartData = Array.from(byCarrier.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      return {
        type: 'chart',
        data: chartData,
        metadata: {
          recordCount,
          dateRange: { start: dateRange.start, end: dateRange.end },
        },
      };
    },
  },

  top_lanes: {
    id: 'top_lanes',
    name: 'Top Lanes',
    description: 'Most frequently used shipping lanes',
    type: 'table',
    category: 'volume',
    access: 'customer',
    defaultSize: 'wide',
    icon: 'Route',
    iconColor: 'bg-slate-500',
    dataDefinition: 'Top 10 shipping lanes by shipment count',
    tooltip: 'Identifies origin-destination state pairs, counts shipments, and calculates average cost per lane',
    whatItShows: {
      summary: 'Shows your most frequently used shipping lanes, ranked by number of shipments. Helps identify your busiest routes.',
      columns: [
        { name: 'Lane', description: 'Origin state -> Destination state' },
        { name: 'Shipments', description: 'Number of shipments on this lane' },
        { name: 'Avg Cost', description: 'Average cost per shipment on this lane' },
      ],
      filters: [
        'Your shipments only',
        'Within selected date range',
      ],
      sortedBy: 'Shipment count (highest first)',
      limit: 'Top 10 lanes',
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, customerId, dateRange }) => {
      const shipmentsQuery = supabase
        .from('shipment')
        .select('load_id, retail')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      if (customerId) {
        shipmentsQuery.eq('customer_id', customerId);
      }

      const { data: shipments } = await shipmentsQuery;
      const loadIds = shipments?.map(s => s.load_id) || [];
      const recordCount = loadIds.length;

      if (loadIds.length === 0) {
        return {
          type: 'table',
          data: [],
          columns: [],
          metadata: {
            recordCount: 0,
            dateRange: { start: dateRange.start, end: dateRange.end },
          },
        };
      }

      const { data: addresses } = await supabase
        .from('shipment_address')
        .select('load_id, address_type, state')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);

      const lanes = new Map<string, { count: number; totalCost: number }>();

      shipments?.forEach(s => {
        const shipmentAddresses = addresses?.filter(a => a.load_id === s.load_id);
        const origin = shipmentAddresses?.find(a => a.address_type === 1)?.state;
        const dest = shipmentAddresses?.find(a => a.address_type === 2)?.state;

        if (origin && dest) {
          const lane = `${origin} -> ${dest}`;
          const current = lanes.get(lane) || { count: 0, totalCost: 0 };
          lanes.set(lane, {
            count: current.count + 1,
            totalCost: current.totalCost + (s.retail || 0),
          });
        }
      });

      const tableData = Array.from(lanes.entries())
        .map(([lane, stats]) => ({
          lane,
          count: stats.count,
          avgCost: stats.totalCost / stats.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        type: 'table',
        data: tableData,
        columns: [
          { key: 'lane', label: 'Lane', align: 'left' },
          { key: 'count', label: 'Shipments', align: 'center', format: 'number' },
          { key: 'avgCost', label: 'Avg Cost', align: 'right', format: 'currency' },
        ],
        metadata: {
          recordCount,
          dateRange: { start: dateRange.start, end: dateRange.end },
        },
      };
    },
  },
};
