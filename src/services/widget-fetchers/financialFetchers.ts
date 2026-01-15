import type { FetcherContext, WidgetFetcherResult } from './types';

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
    console.error('[financialFetchers] Total cost query error:', error);
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
    console.error('[financialFetchers] Avg cost query error:', error);
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
    console.error('[financialFetchers] Monthly spend query error:', error);
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
