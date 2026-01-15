import type { FetcherContext, WidgetFetcherResult } from './types';

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
    console.error('[performanceFetchers] Mode breakdown query error:', error);
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
    console.error('[performanceFetchers] On-time pct query error:', error);
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
