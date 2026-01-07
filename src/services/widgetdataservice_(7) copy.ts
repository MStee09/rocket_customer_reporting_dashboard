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
  customerId?: number,
  filters?: Record<string, string | number>
): Promise<{ rows: Record<string, unknown>[]; columns: { key: string; label: string; type: string }[] }> {
  const customerFilter = customerId ? [customerId] : [];
  const carrierFilter = filters?.carrier ? Number(filters.carrier) : null;

  const defaultShipmentQuery = async () => {
    const { data, error } = await supabase
      .from('shipment')
      .select(`
        load_id,
        reference_number,
        pickup_date,
        delivery_date,
        retail,
        status_id
      `)
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

    total_shipments: defaultShipmentQuery,

    delivered_month: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const { data: statusData, error: statusError } = await supabase
        .from('shipment_status')
        .select('status_id')
        .eq('status_name', 'Delivered')
        .maybeSingle();

      if (statusError || !statusData) {
        console.error('[widgetdataservice] Status lookup error:', statusError);
        return { rows: [], columns: [] };
      }

      const { data, error } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          delivery_date,
          retail,
          rate_carrier_id
        `)
        .in('customer_id', customerFilter)
        .eq('status_id', statusData.status_id)
        .gte('delivery_date', startOfMonth)
        .order('delivery_date', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[widgetdataservice] Delivered query error:', error);
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
    },

    in_transit: async () => {
      const { data: statusData, error: statusError } = await supabase
        .from('shipment_status')
        .select('status_id')
        .eq('status_name', 'In Transit')
        .maybeSingle();

      if (statusError || !statusData) {
        console.error('[widgetdataservice] In Transit status lookup error:', statusError);
        return { rows: [], columns: [] };
      }

      const { data, error } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          expected_delivery_date,
          retail
        `)
        .in('customer_id', customerFilter)
        .eq('status_id', statusData.status_id)
        .order('pickup_date', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[widgetdataservice] In Transit query error:', error);
        return { rows: [], columns: [] };
      }

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

    total_cost: async () => {
      const { data, error } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          delivery_date,
          retail,
          cost
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('retail', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[widgetdataservice] Total cost query error:', error);
        return { rows: [], columns: [] };
      }

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
      const { data, error } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          retail,
          cost
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('retail', 'is', null)
        .order('retail', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[widgetdataservice] Avg cost query error:', error);
        return { rows: [], columns: [] };
      }

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
      const { data, error } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          retail
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('retail', 'is', null)
        .order('pickup_date', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[widgetdataservice] Monthly spend query error:', error);
        return { rows: [], columns: [] };
      }

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

    flow_map: async () => {
      console.log('[widgetdataservice] flow_map fetcher called', { customerFilter, dateRange });

      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, delivery_date, retail')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .limit(500);

      console.log('[widgetdataservice] flow_map query result:', { count: shipments?.length, error: shipmentsError });

      if (shipmentsError || !shipments || shipments.length === 0) {
        console.error('[widgetdataservice] Flow map - no shipments found:', shipmentsError);
        return { rows: [], columns: [] };
      }

      const loadIds = shipments.map(s => s.load_id);

      const { data: addresses, error: addressesError } = await supabase
        .from('shipment_address')
        .select('load_id, city, state, address_type')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);

      if (addressesError) {
        console.error('[widgetdataservice] Flow map addresses error:', addressesError);
      }

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
      console.log('[widgetdataservice] cost_by_state fetcher called', { customerFilter, dateRange });

      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, delivery_date, retail')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('retail', 'is', null)
        .order('retail', { ascending: false })
        .limit(500);

      console.log('[widgetdataservice] cost_by_state query result:', { count: shipments?.length, error: shipmentsError });

      if (shipmentsError || !shipments || shipments.length === 0) {
        console.error('[widgetdataservice] Cost by state - no shipments found:', shipmentsError);
        return { rows: [], columns: [] };
      }

      const loadIds = shipments.map(s => s.load_id);

      const { data: addresses, error: addressesError } = await supabase
        .from('shipment_address')
        .select('load_id, city, state, address_type')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);

      if (addressesError) {
        console.error('[widgetdataservice] Cost by state addresses error:', addressesError);
      }

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
      const { data, error } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          retail,
          mode:shipment_mode!mode_id(mode_name)
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('pickup_date', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[widgetdataservice] Mode breakdown query error:', error);
        return { rows: [], columns: [] };
      }

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          mode: (row.mode as { mode_name?: string })?.mode_name || 'Unknown',
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
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipment')
        .select('load_id, reference_number, pickup_date, retail')
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .limit(500);

      if (shipmentsError || !shipments || shipments.length === 0) {
        console.error('[widgetdataservice] Top lanes shipments error:', shipmentsError);
        return { rows: [], columns: [] };
      }

      const loadIds = shipments.map(s => s.load_id);

      const { data: addresses, error: addressesError } = await supabase
        .from('shipment_address')
        .select('load_id, city, state, address_type')
        .in('load_id', loadIds)
        .in('address_type', [1, 2]);

      if (addressesError) {
        console.error('[widgetdataservice] Top lanes addresses error:', addressesError);
      }

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

    carrier_count: async () => {
      const { data, error } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          retail,
          rate_carrier_id
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('rate_carrier_id', 'is', null)
        .order('pickup_date', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[widgetdataservice] Carrier count query error:', error);
        return { rows: [], columns: [] };
      }

      const carrierIds = [...new Set((data || []).map(s => s.rate_carrier_id).filter(Boolean))];

      let carrierMap: Record<number, string> = {};
      if (carrierIds.length > 0) {
        const { data: carriers } = await supabase
          .from('carrier')
          .select('carrier_id, carrier_name')
          .in('carrier_id', carrierIds);

        if (carriers) {
          carrierMap = Object.fromEntries(carriers.map(c => [c.carrier_id, c.carrier_name]));
        }
      }

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          carrier: carrierMap[row.rate_carrier_id] || 'Unknown',
          retail: row.retail,
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'carrier', label: 'Carrier', type: 'string' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    top_carriers: async () => {
      const { data, error } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          retail,
          rate_carrier_id
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('rate_carrier_id', 'is', null)
        .order('retail', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[widgetdataservice] Top carriers query error:', error);
        return { rows: [], columns: [] };
      }

      const carrierIds = [...new Set((data || []).map(s => s.rate_carrier_id).filter(Boolean))];

      let carrierMap: Record<number, string> = {};
      if (carrierIds.length > 0) {
        const { data: carriers } = await supabase
          .from('carrier')
          .select('carrier_id, carrier_name')
          .in('carrier_id', carrierIds);

        if (carriers) {
          carrierMap = Object.fromEntries(carriers.map(c => [c.carrier_id, c.carrier_name]));
        }
      }

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          carrier: carrierMap[row.rate_carrier_id] || 'Unknown',
          retail: row.retail,
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'carrier', label: 'Carrier', type: 'string' },
          { key: 'retail', label: 'Cost', type: 'currency' },
        ]
      };
    },

    // Carrier performance - shows shipments for a specific carrier (filtered by URL param)
    // Uses shipment_report_view which has carrier info properly joined
    carrier_performance: async () => {
      console.log('[widgetdataservice] carrier_performance called with carrierFilter:', carrierFilter);
      
      let query = supabase
        .from('shipment_report_view')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          delivery_date,
          retail,
          miles,
          carrier_id,
          carrier_name,
          origin_city,
          origin_state,
          destination_city,
          destination_state
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .order('pickup_date', { ascending: false })
        .limit(500);
      
      // If carrier filter is provided, filter by that carrier
      if (carrierFilter) {
        query = query.eq('carrier_id', carrierFilter);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('[widgetdataservice] Carrier performance query error:', error);
        return { rows: [], columns: [] };
      }

      console.log('[widgetdataservice] carrier_performance found', data?.length || 0, 'shipments');

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          delivery_date: row.delivery_date,
          carrier: row.carrier_name || 'Unassigned',
          origin: row.origin_city && row.origin_state ? `${row.origin_city}, ${row.origin_state}` : '',
          destination: row.destination_city && row.destination_state ? `${row.destination_city}, ${row.destination_state}` : '',
          retail: row.retail,
          miles: row.miles,
          cpm: row.miles > 0 ? (row.retail / row.miles) : null,
        })),
        columns: [
          { key: 'load_id', label: 'Load ID', type: 'string' },
          { key: 'reference_number', label: 'Reference', type: 'string' },
          { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
          { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
          { key: 'carrier', label: 'Carrier', type: 'string' },
          { key: 'origin', label: 'Origin', type: 'string' },
          { key: 'destination', label: 'Destination', type: 'string' },
          { key: 'retail', label: 'Cost', type: 'currency' },
          { key: 'miles', label: 'Miles', type: 'number' },
          { key: 'cpm', label: 'Cost/Mile', type: 'currency' },
        ]
      };
    },

    carrier_mix: async () => {
      const { data, error } = await supabase
        .from('shipment')
        .select(`
          load_id,
          reference_number,
          pickup_date,
          retail,
          rate_carrier_id
        `)
        .in('customer_id', customerFilter)
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('rate_carrier_id', 'is', null)
        .order('pickup_date', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[widgetdataservice] Carrier mix query error:', error);
        return { rows: [], columns: [] };
      }

      const carrierIds = [...new Set((data || []).map(s => s.rate_carrier_id).filter(Boolean))];

      let carrierMap: Record<number, string> = {};
      if (carrierIds.length > 0) {
        const { data: carriers } = await supabase
          .from('carrier')
          .select('carrier_id, carrier_name')
          .in('carrier_id', carrierIds);

        if (carriers) {
          carrierMap = Object.fromEntries(carriers.map(c => [c.carrier_id, c.carrier_name]));
        }
      }

      return {
        rows: (data || []).map(row => ({
          load_id: row.load_id,
          reference_number: row.reference_number,
          pickup_date: row.pickup_date,
          carrier: carrierMap[row.rate_carrier_id] || 'Unknown',
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

    on_time_pct: async () => {
      const { data, error } = await supabase
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
        .gte('pickup_date', dateRange.start)
        .lte('pickup_date', dateRange.end)
        .not('delivery_date', 'is', null)
        .order('pickup_date', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[widgetdataservice] On-time pct query error:', error);
        return { rows: [], columns: [] };
      }

      return {
        rows: (data || []).map(row => {
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
  };

  const fetcher = widgetDataFetchers[widgetId];

  if (fetcher) {
    return await fetcher();
  }

  return await defaultShipmentQuery();
}

export async function executeWidget(
  widgetId: string,
  params: ReportExecutionParams,
  customerId: string
): Promise<WidgetExecutionResult> {
  console.log('[widgetdataservice] executeWidget called', { widgetId, customerId, params });

  const widgetDef = getWidgetById(widgetId);

  if (!widgetDef) {
    console.error('[widgetdataservice] Widget not found:', widgetId);
    throw new WidgetNotFoundError(widgetId);
  }

  const dateRange = params.dateRange || getDefaultDateRange();
  const customerIdNum = customerId ? Number(customerId) : undefined;

  console.log('[widgetdataservice] Calling fetchWidgetRowData', { widgetId, dateRange, customerIdNum, filters: params.filters });

  try {
    const { rows, columns } = await fetchWidgetRowData(widgetId, dateRange, customerIdNum, params.filters);
    console.log('[widgetdataservice] fetchWidgetRowData returned', { rowCount: rows.length });

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
