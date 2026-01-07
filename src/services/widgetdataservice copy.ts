import { supabase } from '../lib/supabase';
import { getWidgetById } from '../config/widgets/widgetRegistry';
import { transformToTableFormat, type TableData } from '../utils/tabletransform';
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

// Fetch actual row data for a widget's detail view
async function fetchWidgetRowData(
  widgetId: string,
  dateRange: DateRange,
  customerId?: number
): Promise<{ rows: Record<string, unknown>[]; columns: { key: string; label: string; type: string }[] }> {
  const customerFilter = customerId ? [customerId] : [];
  
  // Define data fetching strategies per widget type
  const widgetDataFetchers: Record<string, () => Promise<{ rows: Record<string, unknown>[]; columns: { key: string; label: string; type: string }[] }>> = {
    
    // Volume widgets - show shipment list
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
          status: (row.shipment_status as any)?.name || 'Unknown'
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
      
      // Get delivered status id
      const { data: statusData } = await supabase
        .from('shipment_status')
        .select('id')
        .eq('name', 'Delivered')
        .single();
      
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
          carrier: (row.carrier as any)?.carrier_name || 'Unknown'
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
      // Get in_transit status id
      const { data: statusData } = await supabase
        .from('shipment_status')
        .select('id')
        .eq('name', 'In Transit')
        .single();
      
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
          carrier: (row.carrier as any)?.carrier_name || 'Unknown'
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

    // Cost widgets
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
          carrier: (row.carrier as any)?.carrier_name || 'Unknown'
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
      // Same as total_cost - shows shipments with costs
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
          carrier: (row.carrier as any)?.carrier_name || 'Unknown'
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
          carrier: (row.carrier as any)?.carrier_name || 'Unknown'
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

    // Map widgets - show shipments with origin/destination
    flow_map: async () => {
      // Get shipments first
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
      
      // Get addresses
      const { data: addresses } = await supabase
        .from('shipment_address')
        .select('load_id, city, state, address_type')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);
      
      // Build rows with origin/destination
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
      // Same as flow_map but sorted by cost
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

    // Mode breakdown - show shipments by mode
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
          mode: (row.mode as any)?.mode_description || 'Unknown',
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

    // Top lanes - show lane data
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
          ? `${origin.city}, ${origin.state} → ${dest.city}, ${dest.state}`
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
  };

  // Use the fetcher if available, otherwise return a generic shipment list
  const fetcher = widgetDataFetchers[widgetId];
  
  if (fetcher) {
    return await fetcher();
  }

  // Default fallback - generic shipment list
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
    // Fetch actual row data for the detail view
    const { rows, columns } = await fetchWidgetRowData(widgetId, dateRange, customerIdNum);

    // Create table data directly from the fetched rows
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

    // Also run the original calculate for summary stats
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
