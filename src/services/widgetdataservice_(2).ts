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

// Schema reference:
// - shipment_status: status_id (PK), status_name, status_description, is_completed
// - shipment: load_id (PK), status_id (FK), rate_carrier_id (FK to carrier.carrier_id)
// - carrier: carrier_id (PK), carrier_name
// - shipment_address: load_id (FK), address_type (1=origin, 2=destination), city, state
// - shipment_mode: mode_id (PK), mode_description

async function fetchWidgetRowData(
  widgetId: string,
  dateRange: DateRange,
  customerId?: number
): Promise<{ rows: Record<string, unknown>[]; columns: { key: string; label: string; type: string }[] }> {
  const customerFilter = customerId ? [customerId] : [];
  
  // Helper to get carrier names
  const getCarrierMap = async (carrierIds: number[]): Promise<Record<number, string>> => {
    if (carrierIds.length === 0) return {};
    const { data: carriers } = await supabase
      .from('carrier')
      .select('carrier_id, carrier_name')
      .in('carrier_id', carrierIds);
    return carriers ? Object.fromEntries(carriers.map(c => [c.carrier_id, c.carrier_name])) : {};
  };

  // Helper to get shipment addresses
  const getAddressMap = async (loadIds: number[]): Promise<Record<number, { origin: any; dest: any }>> => {
    if (loadIds.length === 0) return {};
    const { data: addresses } = await supabase
      .from('shipment_address')
      .select('load_id, city, state, address_type')
      .in('load_id', loadIds)
      .in('address_type', [1, 2]);
    
    const map: Record<number, { origin: any; dest: any }> = {};
    for (const addr of addresses || []) {
      if (!map[addr.load_id]) map[addr.load_id] = { origin: null, dest: null };
      if (addr.address_type === 1) map[addr.load_id].origin = addr;
      if (addr.address_type === 2) map[addr.load_id].dest = addr;
    }
    return map;
  };

  // Default shipment query
  const defaultShipmentQuery = async () => {
    const { data, error } = await supabase
      .from('shipment')
      .select('load_id, reference_number, pickup_date, delivery_date, retail')
      .in('customer_id', customerFilter)
      .gte('pickup_date', dateRange.start)
      .lte('pickup_date', dateRange.end)
      .order('pickup_date', { ascending: false })
      .limit(500);
    
    if (error) {
      console.error('[widgetdataservice] Default query error:', error);
      return { rows: [], columns: [] };
    }
    
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
  };

  const widgetDataFetchers: Record<string, () => Promise<{ rows: Record<string, unknown>[]; columns: { key: string; label: string; type: string }[] }>> = {

    // ==================== VOLUME WIDGETS ====================
    total_shipments: defaultShipmentQuery,

    delivered_month: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      
      const { data: statusData } = await supabase
        .from('shipment_status')
        .select('status_id')
        .eq('status_name', 'Delivered')
        .single();
      
      if (!statusData) return { rows: [], columns: [] };
      
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, delivery_date, retail')
        .in('customer_id', customerFilter)
        .eq('status_id', statusData.status_id)
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
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    in_transit: async () => {
      const { data: statusData } = await supabase
        .from('shipment_status')
        .select('status_id')
        .eq('status_name', 'In Transit')
        .single();
      
      if (!statusData) return { rows: [], columns: [] };
      
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, expected_delivery_date, retail')
        .in('customer_id', customerFilter)
        .eq('status_id', statusData.status_id)
        .order('pickup_date', { ascending: false })
        .limit(500);
      
      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          expected_delivery: row.expected_delivery_date,
          retail: row.retail,
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'expected_delivery', label: 'Expected Delivery', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    // ==================== FINANCIAL WIDGETS ====================
    total_cost: async () => {
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, delivery_date, retail, cost')
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
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'retail', label: 'Retail', type: 'currency' },
          { key: 'cost', label: 'Cost', type: 'currency' },
        ]
      };
    },

    avg_cost_shipment: async () => {
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, retail, cost')
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
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'retail', label: 'Retail', type: 'currency' },
          { key: 'cost', label: 'Cost', type: 'currency' },
        ]
      };
    },

    monthly_spend: async () => {
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, retail')
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
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    // ==================== GEOGRAPHIC WIDGETS ====================
    flow_map: async () => {
      const { data: shipments } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, delivery_date, retail')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('pickup_date', { ascending: false })
        .limit(500);
      
      if (!shipments || shipments.length === 0) return { rows: [], columns: [] };
      
      const addressMap = await getAddressMap(shipments.map(s => s.load_id));
      
      const rows = shipments.map(shipment => {
        const addr = addressMap[shipment.load_id] || { origin: null, dest: null };
        return {
          load_id: shipment.load_id,
          reference_number: shipment.reference_number,
          origin_city: addr.origin?.city || '',
          origin_state: addr.origin?.state || '',
          dest_city: addr.dest?.city || '',
          dest_state: addr.dest?.state || '',
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
      
      if (!shipments || shipments.length === 0) return { rows: [], columns: [] };
      
      const addressMap = await getAddressMap(shipments.map(s => s.load_id));
      
      const rows = shipments.map(shipment => {
        const addr = addressMap[shipment.load_id] || { origin: null, dest: null };
        return {
          load_id: shipment.load_id,
          reference_number: shipment.reference_number,
          origin_state: addr.origin?.state || '',
          dest_state: addr.dest?.state || '',
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

    // ==================== BREAKDOWN WIDGETS ====================
    mode_breakdown: async () => {
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, retail, mode_id')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('pickup_date', { ascending: false })
        .limit(500);
      
      if (!data || data.length === 0) return { rows: [], columns: [] };
      
      // Get mode descriptions
      const modeIds = [...new Set(data.map(s => s.mode_id).filter(Boolean))];
      let modeMap: Record<number, string> = {};
      if (modeIds.length > 0) {
        const { data: modes } = await supabase
          .from('shipment_mode')
          .select('mode_id, mode_description')
          .in('mode_id', modeIds);
        if (modes) {
          modeMap = Object.fromEntries(modes.map(m => [m.mode_id, m.mode_description]));
        }
      }
      
      return {
        rows: data.map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          mode: modeMap[row.mode_id] || 'Unknown',
          pickup_date: row.pickup_date,
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
        .order('pickup_date', { ascending: false })
        .limit(500);
      
      if (!shipments || shipments.length === 0) return { rows: [], columns: [] };
      
      const addressMap = await getAddressMap(shipments.map(s => s.load_id));
      
      const rows = shipments.map(shipment => {
        const addr = addressMap[shipment.load_id] || { origin: null, dest: null };
        const lane = addr.origin && addr.dest 
          ? `${addr.origin.city}, ${addr.origin.state} -> ${addr.dest.city}, ${addr.dest.state}`
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

    // ==================== CARRIER WIDGETS ====================
    carrier_mix: async () => {
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, retail, rate_carrier_id')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('rate_carrier_id', 'is', null)
        .order('pickup_date', { ascending: false })
        .limit(500);
      
      if (!data || data.length === 0) return { rows: [], columns: [] };
      
      const carrierIds = [...new Set(data.map(s => s.rate_carrier_id).filter(Boolean))];
      const carrierMap = await getCarrierMap(carrierIds);
      
      return {
        rows: data.map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          carrier: carrierMap[row.rate_carrier_id] || 'Unknown',
          pickup_date: row.pickup_date,
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

    spend_by_carrier: async () => {
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, retail, rate_carrier_id')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('rate_carrier_id', 'is', null)
        .order('retail', { ascending: false })
        .limit(500);
      
      if (!data || data.length === 0) return { rows: [], columns: [] };
      
      const carrierIds = [...new Set(data.map(s => s.rate_carrier_id).filter(Boolean))];
      const carrierMap = await getCarrierMap(carrierIds);
      
      return {
        rows: data.map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          carrier: carrierMap[row.rate_carrier_id] || 'Unknown',
          pickup_date: row.pickup_date,
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

    carrier_performance: async () => {
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, delivery_date, expected_delivery_date, retail, rate_carrier_id')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('rate_carrier_id', 'is', null)
        .not('delivery_date', 'is', null)
        .order('pickup_date', { ascending: false })
        .limit(500);
      
      if (!data || data.length === 0) return { rows: [], columns: [] };
      
      const carrierIds = [...new Set(data.map(s => s.rate_carrier_id).filter(Boolean))];
      const carrierMap = await getCarrierMap(carrierIds);
      
      return {
        rows: data.map(row => {
          const isOnTime = row.expected_delivery_date 
            ? new Date(row.delivery_date) <= new Date(row.expected_delivery_date)
            : true;
          const transitDays = row.pickup_date && row.delivery_date
            ? Math.round((new Date(row.delivery_date).getTime() - new Date(row.pickup_date).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          
          return {
            load_id: row.load_id,
            reference_number: row.reference_number,
            carrier: carrierMap[row.rate_carrier_id] || 'Unknown',
            pickup_date: row.pickup_date,
            delivery_date: row.delivery_date,
            on_time: isOnTime ? 'Yes' : 'No',
            transit_days: transitDays,
            retail: row.retail,
          };
        }),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'carrier', label: 'Carrier', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'on_time', label: 'On Time', type: 'string' },
          { key: 'transit_days', label: 'Transit Days', type: 'number' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    // ==================== PERFORMANCE WIDGETS ====================
    on_time_pct: async () => {
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, delivery_date, expected_delivery_date, retail')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('delivery_date', 'is', null)
        .order('pickup_date', { ascending: false })
        .limit(500);
      
      if (!data || data.length === 0) return { rows: [], columns: [] };
      
      return {
        rows: data.map(row => {
          const isOnTime = row.expected_delivery_date 
            ? new Date(row.delivery_date) <= new Date(row.expected_delivery_date)
            : true;
          
          return {
            load_id: row.load_id,
            reference_number: row.reference_number,
            pickup_date: row.pickup_date,
            delivery_date: row.delivery_date,
            expected_delivery: row.expected_delivery_date,
            on_time: isOnTime ? 'Yes' : 'No',
            retail: row.retail,
          };
        }),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'expected_delivery', label: 'Expected Delivery', type: 'date' },
          { key: 'on_time', label: 'On Time', type: 'string' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    avg_transit_days: async () => {
      const { data } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, delivery_date, retail')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('delivery_date', 'is', null)
        .order('pickup_date', { ascending: false })
        .limit(500);
      
      if (!data || data.length === 0) return { rows: [], columns: [] };
      
      return {
        rows: data.map(row => {
          const transitDays = row.pickup_date && row.delivery_date
            ? Math.round((new Date(row.delivery_date).getTime() - new Date(row.pickup_date).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          
          return {
            load_id: row.load_id,
            reference_number: row.reference_number,
            pickup_date: row.pickup_date,
            delivery_date: row.delivery_date,
            transit_days: transitDays,
            retail: row.retail,
          };
        }),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'transit_days', label: 'Transit Days', type: 'number' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },
  };

  // Use the fetcher if available, otherwise return default shipment list
  const fetcher = widgetDataFetchers[widgetId];
  
  if (fetcher) {
    return await fetcher();
  }

  // Default fallback
  return await defaultShipmentQuery();
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
