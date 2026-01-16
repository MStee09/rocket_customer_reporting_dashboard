import { WidgetDefinition } from './widgetTypes';

export const adminWidgets: Record<string, WidgetDefinition> = {

  total_shipments_admin: {
    id: 'total_shipments_admin',
    name: 'Total Shipments',
    description: 'Total shipments across all customers',
    type: 'kpi',
    category: 'volume',
    access: 'admin',
    defaultSize: 'small',
    icon: 'Package',
    iconColor: 'bg-blue-500',
    whatItShows: {
      summary: 'Shows the total count of shipments across ALL customers in the system.',
      columns: [
        { name: 'Total Count', description: 'All shipments in the platform' },
      ],
      filters: [
        'All customers (aggregated)',
        'Within selected date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, dateRange }) => {
      const { count } = await supabase
        .from('shipment')
        .select('load_id', { count: 'exact', head: true })
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      return {
        type: 'kpi',
        value: count || 0,
        label: 'Total Shipments',
        format: 'number',
      };
    },
  },

  total_revenue_admin: {
    id: 'total_revenue_admin',
    name: 'Total Revenue',
    description: 'Total revenue across all customers',
    type: 'kpi',
    category: 'financial',
    access: 'admin',
    defaultSize: 'small',
    icon: 'DollarSign',
    iconColor: 'bg-green-500',
    whatItShows: {
      summary: 'Shows the total freight revenue across all customers in the system.',
      columns: [
        { name: 'Total Revenue', description: 'Sum of all shipment costs (your revenue)' },
      ],
      filters: [
        'All customers (aggregated)',
        'Within selected date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, dateRange }) => {
      const { data } = await supabase
        .from('shipment')
        .select('retail')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const total = data?.reduce((sum, s) => sum + (s.retail || 0), 0) || 0;

      return {
        type: 'kpi',
        value: total,
        label: 'Total Revenue',
        format: 'currency',
      };
    },
  },

  active_customers: {
    id: 'active_customers',
    name: 'Active Customers',
    description: 'Number of customers with shipments in period',
    type: 'kpi',
    category: 'customers',
    access: 'admin',
    defaultSize: 'small',
    icon: 'Users',
    iconColor: 'bg-purple-500',
    whatItShows: {
      summary: 'Shows how many unique customers have shipped at least one shipment in the selected date range.',
      columns: [
        { name: 'Active Count', description: 'Customers with 1+ shipments' },
      ],
      filters: [
        'Customers with shipments in date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, dateRange }) => {
      const { data } = await supabase
        .from('shipment')
        .select('customer_id')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const uniqueCustomers = new Set(data?.map(s => s.customer_id)).size;

      return {
        type: 'kpi',
        value: uniqueCustomers,
        label: 'Active Customers',
        format: 'number',
      };
    },
  },

  avg_revenue_per_shipment: {
    id: 'avg_revenue_per_shipment',
    name: 'Avg Revenue per Shipment',
    description: 'Average revenue per shipment',
    type: 'kpi',
    category: 'financial',
    access: 'admin',
    defaultSize: 'small',
    icon: 'TrendingUp',
    iconColor: 'bg-orange-500',
    whatItShows: {
      summary: 'Shows the average revenue you earn per shipment across all customers.',
      columns: [
        { name: 'Avg Revenue', description: 'Total revenue ÷ total shipments' },
      ],
      filters: [
        'All customers (aggregated)',
        'Within selected date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, dateRange }) => {
      const { data } = await supabase
        .from('shipment')
        .select('retail')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const total = data?.reduce((sum, s) => sum + (s.retail || 0), 0) || 0;
      const avg = data?.length ? total / data.length : 0;

      return {
        type: 'kpi',
        value: avg,
        label: 'Avg per Shipment',
        format: 'currency',
      };
    },
  },

  top_customers_revenue: {
    id: 'top_customers_revenue',
    name: 'Top Customers by Revenue',
    description: 'Top 10 customers by total revenue',
    type: 'table',
    category: 'customers',
    access: 'admin',
    defaultSize: 'wide',
    icon: 'Users',
    iconColor: 'bg-blue-500',
    whatItShows: {
      summary: 'Shows your highest-revenue customers, ranked by total freight spend. Helps identify your most valuable accounts.',
      columns: [
        { name: 'Customer', description: 'Company name' },
        { name: 'Shipments', description: 'Total shipment count' },
        { name: 'Total Spend', description: 'Total freight spend by this customer' },
        { name: 'Avg/Shipment', description: 'Average revenue per shipment' },
      ],
      filters: [
        'All customers',
        'Within selected date range',
      ],
      sortedBy: 'Revenue (highest first)',
      limit: 'Top 10 customers',
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, dateRange }) => {
      const { data: shipments } = await supabase
        .from('shipment')
        .select('customer_id, retail')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const { data: customers } = await supabase
        .from('customer')
        .select('customer_id, company_name')
        .eq('is_active', true);

      const customerMap = new Map(customers?.map(c => [c.customer_id, c.company_name]));

      const byCustomer = new Map<number, { shipments: number; revenue: number }>();
      shipments?.forEach(s => {
        const current = byCustomer.get(s.customer_id) || { shipments: 0, revenue: 0 };
        byCustomer.set(s.customer_id, {
          shipments: current.shipments + 1,
          revenue: current.revenue + (s.retail || 0),
        });
      });

      const tableData = Array.from(byCustomer.entries())
        .map(([customerId, stats]) => ({
          customerId,
          customerName: customerMap.get(customerId) || `Customer ${customerId}`,
          shipmentCount: stats.shipments,
          totalSpend: stats.revenue,
          avgCostPerShipment: stats.revenue / stats.shipments,
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 10);

      return {
        type: 'table',
        data: tableData,
        columns: [
          { key: 'customerName', label: 'Customer', align: 'left' },
          { key: 'shipmentCount', label: 'Shipments', align: 'center', format: 'number', width: 'w-24' },
          { key: 'totalSpend', label: 'Total Spend', align: 'right', format: 'currency', width: 'w-32' },
          { key: 'avgCostPerShipment', label: 'Avg/Shipment', align: 'right', format: 'currency', width: 'w-32' },
        ],
      };
    },
  },

  customer_activity: {
    id: 'customer_activity',
    name: 'Customer Activity',
    description: 'All customers with activity status',
    type: 'table',
    category: 'customers',
    access: 'admin',
    defaultSize: 'wide',
    icon: 'Users',
    iconColor: 'bg-slate-500',
    whatItShows: {
      summary: 'Shows all customers with their recent shipping activity, helping you identify active vs. inactive accounts.',
      columns: [
        { name: 'Customer', description: 'Company name' },
        { name: 'Shipments', description: 'Shipment count in date range' },
        { name: 'Revenue', description: 'Total revenue from this customer' },
        { name: 'Status', description: 'Active or Inactive (based on last 30 days)' },
      ],
      filters: [
        'All active customers',
      ],
      sortedBy: 'Revenue (highest first)',
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, dateRange }) => {
      const { data: customers } = await supabase
        .from('customer')
        .select('customer_id, company_name')
        .eq('is_active', true)
        .order('company_name');

      const { data: shipments } = await supabase
        .from('shipment')
        .select('customer_id, retail, pickup_date')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const tableData = customers?.map(c => {
        const customerShipments = shipments?.filter(s => s.customer_id === c.customer_id) || [];
        const revenue = customerShipments.reduce((sum, s) => sum + (s.retail || 0), 0);

        const lastShipment = customerShipments.sort(
          (a, b) => new Date(b.pickup_date).getTime() - new Date(a.pickup_date).getTime()
        )[0];

        const daysSinceLast = lastShipment
          ? Math.floor((Date.now() - new Date(lastShipment.pickup_date).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          customerId: c.customer_id,
          name: c.company_name,
          shipments: customerShipments.length,
          revenue,
          isActive: daysSinceLast !== null && daysSinceLast < 30,
          status: daysSinceLast !== null && daysSinceLast < 30 ? 'Active' : 'Inactive',
        };
      }).sort((a, b) => b.revenue - a.revenue) || [];

      return {
        type: 'table',
        data: tableData,
        columns: [
          { key: 'name', label: 'Customer', align: 'left' },
          { key: 'shipments', label: 'Shipments', align: 'center', format: 'number' },
          { key: 'revenue', label: 'Revenue', align: 'right', format: 'currency' },
          { key: 'status', label: 'Status', align: 'left' },
        ],
      };
    },
  },

  carrier_mix_admin: {
    id: 'carrier_mix_admin',
    name: 'Carrier Mix',
    description: 'Distribution of shipments by carrier',
    type: 'pie_chart',
    category: 'breakdown',
    access: 'admin',
    defaultSize: 'medium',
    icon: 'PieChart',
    iconColor: 'bg-cyan-500',
    whatItShows: {
      summary: 'Shows how shipments are distributed across carriers platform-wide, helping you understand carrier concentration.',
      columns: [
        { name: 'Carrier', description: 'Carrier company name' },
        { name: 'Shipments', description: 'Total shipments with this carrier' },
        { name: 'Percentage', description: 'Share of total volume' },
      ],
      filters: [
        'All customers (aggregated)',
        'Within selected date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, dateRange }) => {
      const { data: shipments } = await supabase
        .from('shipment')
        .select('load_id')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const loadIds = shipments?.map(s => s.load_id) || [];

      if (loadIds.length === 0) {
        return { type: 'chart', data: [] };
      }

      const { data: shipmentCarriers } = await supabase
        .from('shipment_carrier')
        .select('carrier_id')
        .in('load_id', loadIds);

      const { data: carriers } = await supabase
        .from('carrier')
        .select('carrier_id, company_name');

      const carrierMap = new Map(carriers?.map(c => [c.carrier_id, c.company_name]));

      const byCarrier = new Map<string, number>();
      shipmentCarriers?.forEach(sc => {
        const name = carrierMap.get(sc.carrier_id) || 'Unknown';
        byCarrier.set(name, (byCarrier.get(name) || 0) + 1);
      });

      const chartData = Array.from(byCarrier.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      return {
        type: 'chart',
        data: chartData,
      };
    },
  },

  mode_breakdown_admin: {
    id: 'mode_breakdown_admin',
    name: 'Mode Distribution',
    description: 'Distribution of shipments by mode',
    type: 'pie_chart',
    category: 'breakdown',
    access: 'admin',
    defaultSize: 'medium',
    icon: 'PieChart',
    iconColor: 'bg-purple-500',
    whatItShows: {
      summary: 'Shows the distribution of shipments by transportation mode across all customers.',
      columns: [
        { name: 'Mode', description: 'Transportation mode (LTL, FTL, etc.)' },
        { name: 'Shipments', description: 'Total shipments using this mode' },
        { name: 'Percentage', description: 'Share of total volume' },
      ],
      filters: [
        'All customers (aggregated)',
        'Within selected date range',
      ],
      updateBehavior: 'live',
    },
    calculate: async ({ supabase, dateRange }) => {
      const { data } = await supabase
        .from('shipment')
        .select('mode')
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end);

      const byMode = new Map<string, number>();
      data?.forEach(s => {
        const mode = s.mode || 'Unknown';
        byMode.set(mode, (byMode.get(mode) || 0) + 1);
      });

      const chartData = Array.from(byMode.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      return {
        type: 'chart',
        data: chartData,
      };
    },
  },
};
