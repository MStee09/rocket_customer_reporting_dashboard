import type { FetcherContext, WidgetFetcherResult } from './types';
import { logger } from '../../utils/logger';

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
    console.error('[carrierFetchers] Carrier mix query error:', error);
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
  logger.log('[carrierFetchers] carrier_performance called', { carrierFilter, carrierNameFilter });

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
    console.error('[carrierFetchers] Carrier performance query error:', error);
    return { rows: [], columns: [] };
  }

  logger.log('[carrierFetchers] carrier_performance found', data?.length || 0, 'shipments');

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
