import type { FetcherContext, WidgetFetcherResult } from './types';

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
    console.error('[shipmentFetchers] Status lookup error:', statusError);
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
    console.error('[shipmentFetchers] Delivered query error:', error);
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
    console.error('[shipmentFetchers] In Transit status lookup error:', statusError);
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
    console.error('[shipmentFetchers] In Transit query error:', error);
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
