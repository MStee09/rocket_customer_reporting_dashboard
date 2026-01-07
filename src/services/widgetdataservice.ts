import { supabase } from '../lib/supabase';
import { getWidgetById } from '../config/widgets/widgetRegistry';
import type { TableData } from '../utils/tabletransform';
import type { ReportExecutionParams, DateRange } from '../types/report';
import type { WidgetData } from '../config/widgets/widgetTypes';

export interface WidgetExecutionResult {
  widgetId: string;
  widgetName: string;
  widgetData: WidgetData;
  tableData: TableData;
  executedAt: string;
}

export class WidgetNotFoundError extends Error {
  constructor(widgetId: string) {
    super(`Widget not found: ${widgetId}`);
    this.name = 'WidgetNotFoundError';
  }
}

export class WidgetExecutionError extends Error {
  constructor(widgetId: string, cause: Error) {
    super(`Failed to execute widget ${widgetId}: ${cause.message}`);
    this.name = 'WidgetExecutionError';
    this.cause = cause;
  }
}

async function fetchWidgetRowData(
  widgetId: string,
  dateRange: DateRange,
  customerId?: number
): Promise<{ rows: Record<string, unknown>[]; columns: { key: string; label: string; type: string }[] }> {
  const customerFilter = customerId ? [customerId] : [];

  const widgetDataFetchers: Record<string, () => Promise<{ rows: Record<string, unknown>[]; columns: { key: string; label: string; type: string }[] }>> = {

    total_shipments: async () => {
      const { data } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          delivery_date,
          retail,
          shipment_status:status_id(name)
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('pickup_date', { ascending: false })
        .limit(500);

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          delivery_date: row.delivery_date,
          retail: row.retail,
          status: (row.shipment_status as { name?: string })?.name || 'Unknown'
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
          { key: 'status', label: 'Status', type: 'string' },
        ]
      };
    },

    delivered_month: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const { data: statusData } = await supabase
        .from('shipment_status')
        .select('id')
        .eq('name', 'Delivered')
        .maybeSingle();

      if (!statusData) {
        return { rows: [], columns: [] };
      }

      const { data } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          delivery_date,
          retail,
          carrier:carrier!shipment_rate_carrier_id_fkey(carrier_name)
        `)
        .in('customer_id', customerFilter)
        .eq('status_id', statusData.id)
        .gte('delivery_date', startOfMonth)
        .order('delivery_date', { ascending: false })
        .limit(500);

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          delivery_date: row.delivery_date,
          retail: row.retail,
          carrier: (row.carrier as { carrier_name?: string })?.carrier_name || 'Unknown'
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
          { key: 'carrier', label: 'Carrier', type: 'string' },
        ]
      };
    },

    in_transit: async () => {
      const { data: statusData } = await supabase
        .from('shipment_status')
        .select('id')
        .eq('name', 'In Transit')
        .maybeSingle();

      if (!statusData) {
        return { rows: [], columns: [] };
      }

      const { data } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          expected_delivery_date,
          retail,
          carrier:carrier!shipment_rate_carrier_id_fkey(carrier_name)
        `)
        .in('customer_id', customerFilter)
        .eq('status_id', statusData.id)
        .order('pickup_date', { ascending: false })
        .limit(500);

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          expected_delivery: row.expected_delivery_date,
          retail: row.retail,
          carrier: (row.carrier as { carrier_name?: string })?.carrier_name || 'Unknown'
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'expected_delivery', label: 'Expected Delivery', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
          { key: 'carrier', label: 'Carrier', type: 'string' },
        ]
      };
    },

    total_cost: async () => {
      const { data } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          delivery_date,
          retail,
          cost,
          carrier:carrier!shipment_rate_carrier_id_fkey(carrier_name)
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('retail', { ascending: false })
        .limit(500);

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          delivery_date: row.delivery_date,
          retail: row.retail,
          cost: row.cost,
          carrier: (row.carrier as { carrier_name?: string })?.carrier_name || 'Unknown'
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'retail', label: 'Retail', type: 'currency' },
          { key: 'cost', label: 'Cost', type: 'currency' },
          { key: 'carrier', label: 'Carrier', type: 'string' },
        ]
      };
    },

    avg_cost_shipment: async () => {
      const { data } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          retail,
          cost,
          carrier:carrier!shipment_rate_carrier_id_fkey(carrier_name)
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('retail', 'is', null)
        .order('retail', { ascending: false })
        .limit(500);

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          retail: row.retail,
          cost: row.cost,
          carrier: (row.carrier as { carrier_name?: string })?.carrier_name || 'Unknown'
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'retail', label: 'Retail', type: 'currency' },
          { key: 'cost', label: 'Cost', type: 'currency' },
          { key: 'carrier', label: 'Carrier', type: 'string' },
        ]
      };
    },

    monthly_spend: async () => {
      const { data } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          retail,
          carrier:carrier!shipment_rate_carrier_id_fkey(carrier_name)
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('retail', 'is', null)
        .order('pickup_date', { ascending: false })
        .limit(500);

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          retail: row.retail,
          carrier: (row.carrier as { carrier_name?: string })?.carrier_name || 'Unknown'
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
          { key: 'carrier', label: 'Carrier', type: 'string' },
        ]
      };
    },

    flow_map: async () => {
      const { data: shipments } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, delivery_date, retail')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .limit(500);

      if (!shipments || shipments.length === 0) {
        return { rows: [], columns: [] };
      }

      const loadIds = shipments.map(s => s.load_id);

      const { data: addresses } = await supabase
        .from('shipment_address')
        .select('load_id, city, state, address_type')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);

      const rows = shipments.map(shipment => {
        const origin = addresses?.find(a => a.load_id === shipment.load_id && a.address_type === 1);
        const dest = addresses?.find(a => a.load_id === shipment.load_id && a.address_type === 2);

        return {
          load_id: shipment.load_id,
          reference_number: shipment.reference_number,
          pickup_date: shipment.pickup_date,
          delivery_date: shipment.delivery_date,
          origin_city: origin?.city || '',
          origin_state: origin?.state || '',
          dest_city: dest?.city || '',
          dest_state: dest?.state || '',
          retail: shipment.retail,
        };
      });

      return {
        rows,
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'origin_city', label: 'Origin City', type: 'string' },
          { key: 'origin_state', label: 'Origin State', type: 'string' },
          { key: 'dest_city', label: 'Dest City', type: 'string' },
          { key: 'dest_state', label: 'Dest State', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    cost_by_state: async () => {
      const { data: shipments } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, delivery_date, retail')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('retail', 'is', null)
        .order('retail', { ascending: false })
        .limit(500);

      if (!shipments || shipments.length === 0) {
        return { rows: [], columns: [] };
      }

      const loadIds = shipments.map(s => s.load_id);

      const { data: addresses } = await supabase
        .from('shipment_address')
        .select('load_id, city, state, address_type')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);

      const rows = shipments.map(shipment => {
        const origin = addresses?.find(a => a.load_id === shipment.load_id && a.address_type === 1);
        const dest = addresses?.find(a => a.load_id === shipment.load_id && a.address_type === 2);

        return {
          load_id: shipment.load_id,
          reference_number: shipment.reference_number,
          origin_state: origin?.state || '',
          dest_state: dest?.state || '',
          pickup_date: shipment.pickup_date,
          delivery_date: shipment.delivery_date,
          retail: shipment.retail,
        };
      });

      return {
        rows,
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'origin_state', label: 'Origin State', type: 'string' },
          { key: 'dest_state', label: 'Dest State', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    mode_breakdown: async () => {
      const { data } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          retail,
          mode:shipment_mode!shipment_mode_id_fkey(mode_description)
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('pickup_date', { ascending: false })
        .limit(500);

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          mode: (row.mode as { mode_description?: string })?.mode_description || 'Unknown',
          retail: row.retail,
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'mode', label: 'Mode', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    top_lanes: async () => {
      const { data: shipments } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, retail')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .limit(500);

      if (!shipments || shipments.length === 0) {
        return { rows: [], columns: [] };
      }

      const loadIds = shipments.map(s => s.load_id);

      const { data: addresses } = await supabase
        .from('shipment_address')
        .select('load_id, city, state, address_type')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);

      const rows = shipments.map(shipment => {
        const origin = addresses?.find(a => a.load_id === shipment.load_id && a.address_type === 1);
        const dest = addresses?.find(a => a.load_id === shipment.load_id && a.address_type === 2);

        const lane = origin && dest
          ? `${origin.city}, ${origin.state} -> ${dest.city}, ${dest.state}`
          : 'Unknown';

        return {
          load_id: shipment.load_id,
          reference_number: shipment.reference_number,
          lane,
          pickup_date: shipment.pickup_date,
          retail: shipment.retail,
        };
      });

      return {
        rows,
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'lane', label: 'Lane', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    on_time_pct: async () => {
      const { data: statusData } = await supabase
        .from('shipment_status')
        .select('id')
        .eq('name', 'Delivered')
        .maybeSingle();

      if (!statusData) {
        return { rows: [], columns: [] };
      }

      const { data } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          delivery_date,
          expected_delivery_date,
          retail
        `)
        .in('customer_id', customerFilter)
        .eq('status_id', statusData.id)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('delivery_date', { ascending: false })
        .limit(500);

      return {
        rows: (data || []).map(row => {
          const isOnTime = row.delivery_date && row.expected_delivery_date
            ? new Date(row.delivery_date) <= new Date(row.expected_delivery_date)
            : null;

          return {
            load_id: row.load_id,
            reference_number: row.reference_number,
            pickup_date: row.pickup_date,
            delivery_date: row.delivery_date,
            expected_delivery_date: row.expected_delivery_date,
            on_time: isOnTime === null ? 'N/A' : isOnTime ? 'Yes' : 'No',
            retail: row.retail,
          };
        }),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'expected_delivery_date', label: 'Expected', type: 'date' },
          { key: 'delivery_date', label: 'Actual', type: 'date' },
          { key: 'on_time', label: 'On Time', type: 'string' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    carrier_mix: async () => {
      const { data: shipments } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          retail,
          carrier:carrier!shipment_rate_carrier_id_fkey(carrier_name)
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('pickup_date', { ascending: false })
        .limit(500);

      return {
        rows: (shipments || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          carrier: (row.carrier as { carrier_name?: string })?.carrier_name || 'Unknown',
          retail: row.retail,
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'carrier', label: 'Carrier', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },
  };

  const fetcher = widgetDataFetchers[widgetId];

  if (fetcher) {
    return await fetcher();
  }

  const { data } = await supabase
    .from('shipment')
    .select(`
      load_id,
      reference_number,
      pickup_date,
      delivery_date,
      retail
    `)
    .in('customer_id', customerFilter)
    .gte('pickup_date', dateRange.start)
    .lte('pickup_date', dateRange.end)
    .order('pickup_date', { ascending: false })
    .limit(500);

  return {
    rows: (data || []).map(row => ({
      load_id: row.load_id,
      reference_number: row.reference_number,
      pickup_date: row.pickup_date,
      delivery_date: row.delivery_date,
      retail: row.retail,
    })),
    columns: [
      { key: 'load_id', label: 'Load ID', type: 'string' },
      { key: 'reference_number', label: 'Reference', type: 'string' },
      { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
      { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
      { key: 'retail', label: 'Cost', type: 'currency' },
    ]
  };
}

export async function executeWidget(
  widgetId: string,
  params: ReportExecutionParams,
  customerId: string
): Promise<WidgetExecutionResult> {
  const widgetDef = getWidgetById(widgetId);

  if (!widgetDef) {
    throw new WidgetNotFoundError(widgetId);
  }

  const dateRange = params.dateRange || getDefaultDateRange();
  const customerIdNum = customerId ? Number(customerId) : undefined;

  try {
    const { rows, columns } = await fetchWidgetRowData(widgetId, dateRange, customerIdNum);

    const tableData: TableData = {
      columns: columns.map(col => ({
        key: col.key,
        label: col.label,
        type: col.type as 'string' | 'number' | 'date' | 'currency' | 'percent',
      })),
      rows: rows,
      metadata: {
        rowCount: rows.length,
        generatedAt: new Date().toISOString(),
      }
    };

    const widgetData = await widgetDef.calculate({
      supabase,
      dateRange,
      customerId: customerIdNum,
      effectiveCustomerIds: customerIdNum ? [customerIdNum] : [],
      isAdmin: false,
      isViewingAsCustomer: true,
    });

    return {
      widgetId,
      widgetName: widgetDef.name,
      widgetData: {
        ...widgetData,
        data: rows,
      },
      tableData,
      executedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new WidgetExecutionError(
      widgetId,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

export async function executeWidgetReport(
  widgetId: string,
  executionParams: ReportExecutionParams,
  customerId: string
): Promise<WidgetExecutionResult> {
  return executeWidget(widgetId, executionParams, customerId);
}

export function getWidgetMetadata(widgetId: string): {
  id: string;
  name: string;
  description?: string;
  visualizationType: string;
} | null {
  const widgetDef = getWidgetById(widgetId);

  if (!widgetDef) return null;

  return {
    id: widgetDef.id,
    name: widgetDef.name,
    description: widgetDef.description,
    visualizationType: widgetDef.type,
  };
}

function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
