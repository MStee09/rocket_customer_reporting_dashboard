import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { DateRange } from '../types/report';

export type WidgetFetcherResult = {
  rows: Record<string, unknown>[];
  columns: { key: string; label: string; type: string }[];
};

export type WidgetFetcher = () => Promise<WidgetFetcherResult>;

export type WidgetFetcherParams = {
  customerFilter: number[];
  dateRange: DateRange;
  carrierFilter: number | null;
  filters?: Record<string, string | number>;
};

export type FetcherContext = {
  customerFilter: number[];
  dateRange: DateRange;
  carrierFilter: number | null;
  filters?: Record<string, string | number>;
  supabase: SupabaseClient;
};

export async function defaultShipmentQuery(
  customerFilter: number[],
  dateRange: DateRange
): Promise<WidgetFetcherResult> {
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
    console.error('[widgetFetchers] Default query error:', error);
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
}

export async function fetchDeliveredMonth(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, supabase } = ctx;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const { data: statusData, error: statusError } = await supabase
    .from('shipment_status')
    .select('status_id')
    .eq('status_name', 'Delivered')
    .maybeSingle();

  if (statusError || !statusData) {
    console.error('[widgetFetchers] Status lookup error:', statusError);
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
    console.error('[widgetFetchers] Delivered query error:', error);
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
}

export async function fetchInTransit(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, supabase } = ctx;

  const { data: statusData, error: statusError } = await supabase
    .from('shipment_status')
    .select('status_id')
    .eq('status_name', 'In Transit')
    .maybeSingle();

  if (statusError || !statusData) {
    console.error('[widgetFetchers] In Transit status lookup error:', statusError);
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
    console.error('[widgetFetchers] In Transit query error:', error);
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
}

export async function fetchTotalCost(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, supabase } = ctx;

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
    console.error('[widgetFetchers] Total cost query error:', error);
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
}

export async function fetchAvgCostShipment(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, supabase } = ctx;

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
    console.error('[widgetFetchers] Avg cost query error:', error);
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
}

export async function fetchMonthlySpend(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, supabase } = ctx;

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
    console.error('[widgetFetchers] Monthly spend query error:', error);
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
}

export async function fetchFlowMap(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, supabase } = ctx;

  logger.log('[widgetFetchers] flow_map fetcher called', { customerFilter, dateRange });

  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipment')
    .select('load_id, reference_number, pickup_date, delivery_date, retail')
    .in('customer_id', customerFilter)
    .gte('pickup_date', dateRange.start)
    .lte('pickup_date', dateRange.end)
    .limit(500);

  logger.log('[widgetFetchers] flow_map query result:', { count: shipments?.length, error: shipmentsError });

  if (shipmentsError || !shipments || shipments.length === 0) {
    console.error('[widgetFetchers] Flow map - no shipments found:', shipmentsError);
    return { rows: [], columns: [] };
  }

  const loadIds = shipments.map(s => s.load_id);

  const { data: addresses, error: addressesError } = await supabase
    .from('shipment_address')
    .select('load_id, city, state, address_type')
    .in('load_id', loadIds)
    .in('address_type', [1, 2]);

  if (addressesError) {
    console.error('[widgetFetchers] Flow map addresses error:', addressesError);
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
}

export async function fetchCostByState(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, supabase } = ctx;

  logger.log('[widgetFetchers] cost_by_state fetcher called', { customerFilter, dateRange });

  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipment')
    .select('load_id, reference_number, pickup_date, delivery_date, retail')
    .in('customer_id', customerFilter)
    .gte('pickup_date', dateRange.start)
    .lte('pickup_date', dateRange.end)
    .not('retail', 'is', null)
    .order('retail', { ascending: false })
    .limit(500);

  logger.log('[widgetFetchers] cost_by_state query result:', { count: shipments?.length, error: shipmentsError });

  if (shipmentsError || !shipments || shipments.length === 0) {
    console.error('[widgetFetchers] Cost by state - no shipments found:', shipmentsError);
    return { rows: [], columns: [] };
  }

  const loadIds = shipments.map(s => s.load_id);

  const { data: addresses, error: addressesError } = await supabase
    .from('shipment_address')
    .select('load_id, city, state, address_type')
    .in('load_id', loadIds)
    .in('address_type', [1, 2]);

  if (addressesError) {
    console.error('[widgetFetchers] Cost by state addresses error:', addressesError);
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
}

export async function fetchTopLanes(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, supabase } = ctx;

  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipment')
    .select('load_id, reference_number, pickup_date, retail')
    .in('customer_id', customerFilter)
    .gte('pickup_date', dateRange.start)
    .lte('pickup_date', dateRange.end)
    .limit(500);

  if (shipmentsError || !shipments || shipments.length === 0) {
    console.error('[widgetFetchers] Top lanes shipments error:', shipmentsError);
    return { rows: [], columns: [] };
  }

  const loadIds = shipments.map(s => s.load_id);

  const { data: addresses, error: addressesError } = await supabase
    .from('shipment_address')
    .select('load_id, city, state, address_type')
    .in('load_id', loadIds)
    .in('address_type', [1, 2]);

  if (addressesError) {
    console.error('[widgetFetchers] Top lanes addresses error:', addressesError);
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
}

export async function fetchCarrierMix(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, supabase } = ctx;

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
    console.error('[widgetFetchers] Carrier mix query error:', error);
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
}

export async function fetchCarrierPerformance(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, carrierFilter, filters, supabase } = ctx;

  const carrierNameFilter = filters?.carrier_name ? decodeURIComponent(String(filters.carrier_name)) : null;
  logger.log('[widgetFetchers] carrier_performance called', { carrierFilter, carrierNameFilter });

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

  if (carrierFilter && carrierFilter > 0) {
    query = query.eq('carrier_id', carrierFilter);
  } else if (carrierNameFilter) {
    query = query.eq('carrier_name', carrierNameFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[widgetFetchers] Carrier performance query error:', error);
    return { rows: [], columns: [] };
  }

  logger.log('[widgetFetchers] carrier_performance found', data?.length || 0, 'shipments');

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
}

export async function fetchModeBreakdown(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, supabase } = ctx;

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
    console.error('[widgetFetchers] Mode breakdown query error:', error);
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
}

export async function fetchOnTimePct(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, supabase } = ctx;

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
    console.error('[widgetFetchers] On-time pct query error:', error);
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
}

export function createWidgetDataFetchers(params: WidgetFetcherParams): Record<string, WidgetFetcher> {
  const { customerFilter, dateRange, carrierFilter, filters } = params;

  const ctx: FetcherContext = {
    customerFilter,
    dateRange,
    carrierFilter,
    filters,
    supabase,
  };

  return {
    total_shipments: () => defaultShipmentQuery(customerFilter, dateRange),
    delivered_month: () => fetchDeliveredMonth(ctx),
    in_transit: () => fetchInTransit(ctx),
    total_cost: () => fetchTotalCost(ctx),
    avg_cost_shipment: () => fetchAvgCostShipment(ctx),
    monthly_spend: () => fetchMonthlySpend(ctx),
    flow_map: () => fetchFlowMap(ctx),
    cost_by_state: () => fetchCostByState(ctx),
    top_lanes: () => fetchTopLanes(ctx),
    carrier_mix: () => fetchCarrierMix(ctx),
    carrier_performance: () => fetchCarrierPerformance(ctx),
    mode_breakdown: () => fetchModeBreakdown(ctx),
    on_time_pct: () => fetchOnTimePct(ctx),
  };
}
