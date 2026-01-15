import { supabase } from '../../lib/supabase';
import type { DateRange } from '../../types/report';
import type { WidgetFetcher, WidgetFetcherParams, WidgetFetcherResult, FetcherContext } from './types';

import { fetchDeliveredMonth, fetchInTransit } from './shipmentFetchers';
import { fetchTotalCost, fetchAvgCostShipment, fetchMonthlySpend } from './financialFetchers';
import { fetchFlowMap, fetchCostByState, fetchTopLanes } from './geographicFetchers';
import { fetchCarrierMix, fetchCarrierPerformance } from './carrierFetchers';
import { fetchModeBreakdown, fetchOnTimePct } from './performanceFetchers';

export type { WidgetFetcherResult, WidgetFetcher, WidgetFetcherParams, FetcherContext };

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

export {
  fetchDeliveredMonth,
  fetchInTransit,
  fetchTotalCost,
  fetchAvgCostShipment,
  fetchMonthlySpend,
  fetchFlowMap,
  fetchCostByState,
  fetchTopLanes,
  fetchCarrierMix,
  fetchCarrierPerformance,
  fetchModeBreakdown,
  fetchOnTimePct,
};
