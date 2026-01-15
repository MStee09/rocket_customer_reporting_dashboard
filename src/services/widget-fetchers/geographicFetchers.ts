import type { FetcherContext, WidgetFetcherResult } from './types';
import { logger } from '../../utils/logger';

export async function fetchFlowMap(ctx: FetcherContext): Promise<WidgetFetcherResult> {
  const { customerFilter, dateRange, supabase } = ctx;

  logger.log('[geographicFetchers] flow_map fetcher called', { customerFilter, dateRange });

  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipment')
    .select('load_id, reference_number, pickup_date, delivery_date, retail')
    .in('customer_id', customerFilter)
    .gte('pickup_date', dateRange.start)
    .lte('pickup_date', dateRange.end)
    .limit(500);

  logger.log('[geographicFetchers] flow_map query result:', { count: shipments?.length, error: shipmentsError });

  if (shipmentsError || !shipments || shipments.length === 0) {
    console.error('[geographicFetchers] Flow map - no shipments found:', shipmentsError);
    return { rows: [], columns: [] };
  }

  const loadIds = shipments.map(s => s.load_id);

  const { data: addresses, error: addressesError } = await supabase
    .from('shipment_address')
    .select('load_id, city, state, address_type')
    .in('load_id', loadIds)
    .in('address_type', [1, 2]);

  if (addressesError) {
    console.error('[geographicFetchers] Flow map addresses error:', addressesError);
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

  logger.log('[geographicFetchers] cost_by_state fetcher called', { customerFilter, dateRange });

  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipment')
    .select('load_id, reference_number, pickup_date, delivery_date, retail')
    .in('customer_id', customerFilter)
    .gte('pickup_date', dateRange.start)
    .lte('pickup_date', dateRange.end)
    .not('retail', 'is', null)
    .order('retail', { ascending: false })
    .limit(500);

  logger.log('[geographicFetchers] cost_by_state query result:', { count: shipments?.length, error: shipmentsError });

  if (shipmentsError || !shipments || shipments.length === 0) {
    console.error('[geographicFetchers] Cost by state - no shipments found:', shipmentsError);
    return { rows: [], columns: [] };
  }

  const loadIds = shipments.map(s => s.load_id);

  const { data: addresses, error: addressesError } = await supabase
    .from('shipment_address')
    .select('load_id, city, state, address_type')
    .in('load_id', loadIds)
    .in('address_type', [1, 2]);

  if (addressesError) {
    console.error('[geographicFetchers] Cost by state addresses error:', addressesError);
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
    console.error('[geographicFetchers] Top lanes shipments error:', shipmentsError);
    return { rows: [], columns: [] };
  }

  const loadIds = shipments.map(s => s.load_id);

  const { data: addresses, error: addressesError } = await supabase
    .from('shipment_address')
    .select('load_id, city, state, address_type')
    .in('load_id', loadIds)
    .in('address_type', [1, 2]);

  if (addressesError) {
    console.error('[geographicFetchers] Top lanes addresses error:', addressesError);
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
