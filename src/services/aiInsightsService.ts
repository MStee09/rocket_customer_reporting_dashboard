import { supabase } from '../lib/supabase';

export interface DashboardMetrics {
  totalSpend: number;
  shipmentCount: number;
  avgCostPerShipment: number;
  topCarrier: string;
  topCarrierPercent: number;
  topDestinationState: string;
}

export interface MetricChanges {
  spendChange: number;
  volumeChange: number;
  avgCostChange: number;
}

export interface InsightsResponse {
  insights: string;
  metrics: {
    current: DashboardMetrics;
    previous: DashboardMetrics;
    changes: MetricChanges;
  };
  generatedAt: string;
}

export async function generateDashboardInsights(
  customerId: number,
  dateRange: { start: string; end: string }
): Promise<InsightsResponse> {
  const { data, error } = await supabase.functions.invoke('generate-insights', {
    body: { customerId, dateRange }
  });

  if (error) {
    console.error('Error generating insights:', error);
    throw error;
  }

  return data;
}

export async function getDashboardMetrics(
  customerId: number,
  startDate: string,
  endDate: string
): Promise<DashboardMetrics> {
  const { data, error } = await supabase
    .from('shipment_report_view')
    .select('retail, carrier_name, consignee_state')
    .eq('customer_id', customerId)
    .gte('ship_date', startDate)
    .lte('ship_date', endDate);

  if (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }

  const shipments = data || [];
  const totalSpend = shipments.reduce((sum, s) => sum + (s.retail || 0), 0);
  const shipmentCount = shipments.length;
  const avgCostPerShipment = shipmentCount > 0 ? totalSpend / shipmentCount : 0;

  const carrierCounts: Record<string, number> = {};
  shipments.forEach(s => {
    if (s.carrier_name) {
      carrierCounts[s.carrier_name] = (carrierCounts[s.carrier_name] || 0) + 1;
    }
  });
  const topCarrier = Object.entries(carrierCounts).sort((a, b) => b[1] - a[1])[0];

  const stateCounts: Record<string, number> = {};
  shipments.forEach(s => {
    if (s.consignee_state) {
      stateCounts[s.consignee_state] = (stateCounts[s.consignee_state] || 0) + 1;
    }
  });
  const topState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    totalSpend,
    shipmentCount,
    avgCostPerShipment,
    topCarrier: topCarrier?.[0] || 'N/A',
    topCarrierPercent: topCarrier ? Math.round((topCarrier[1] / shipmentCount) * 100) : 0,
    topDestinationState: topState?.[0] || 'N/A'
  };
}

export function getPreviousPeriodDates(start: Date, end: Date): { start: Date; end: Date } {
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration - 86400000),
    end: new Date(start.getTime() - 86400000)
  };
}

export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}
