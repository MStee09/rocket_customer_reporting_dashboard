import { SupabaseClient } from '@supabase/supabase-js';
import { getSecureTable } from '../utils/getSecureTable';

export interface AttentionSignal {
  id: string;
  type: 'cost_spike' | 'volume_drop' | 'carrier_performance' | 'delivery_delay';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric: {
    current: number;
    baseline: number;
    change: number;
    changePercent: number;
  };
  context?: {
    lane?: string;
    carrier?: string;
    state?: string;
  };
  detectedAt: string;
}

export interface AttentionSignalsResponse {
  signals: AttentionSignal[];
  allClear: boolean;
  analyzedAt: string;
}

interface SignalParams {
  supabase: SupabaseClient;
  customerId: number;
  isAdmin: boolean;
  isViewingAsCustomer: boolean;
  dateRange: { start: string; end: string };
}

const THRESHOLDS = {
  costSpikePercent: 15,
  volumeDropPercent: 20,
  carrierOnTimeMin: 85,
  minShipmentsForSignal: 5,
};

export async function detectAttentionSignals(params: SignalParams): Promise<AttentionSignalsResponse> {
  const { supabase, customerId, isAdmin, isViewingAsCustomer, dateRange } = params;
  const signals: AttentionSignal[] = [];

  try {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const durationMs = endDate.getTime() - startDate.getTime();
    const baselineStart = new Date(startDate.getTime() - durationMs);
    const baselineEnd = new Date(startDate.getTime() - 1);

    const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);
    const addressTable = getSecureTable('shipment_address', isAdmin, isViewingAsCustomer);

    let currentQuery = supabase
      .from(table)
      .select('load_id, retail, rate_carrier_id, delivery_date, expected_delivery_date')
      .gte('pickup_date', dateRange.start)
      .lte('pickup_date', dateRange.end);

    if (!isAdmin || isViewingAsCustomer) {
      currentQuery = currentQuery.eq('customer_id', customerId);
    }

    const { data: currentShipments } = await currentQuery;

    let baselineQuery = supabase
      .from(table)
      .select('load_id, retail, rate_carrier_id, delivery_date, expected_delivery_date')
      .gte('pickup_date', baselineStart.toISOString().split('T')[0])
      .lte('pickup_date', baselineEnd.toISOString().split('T')[0]);

    if (!isAdmin || isViewingAsCustomer) {
      baselineQuery = baselineQuery.eq('customer_id', customerId);
    }

    const { data: baselineShipments } = await baselineQuery;

    if (!currentShipments || currentShipments.length < THRESHOLDS.minShipmentsForSignal) {
      return { signals: [], allClear: true, analyzedAt: new Date().toISOString() };
    }

    const currentLoadIds = currentShipments.map(s => s.load_id);
    const baselineLoadIds = baselineShipments?.map(s => s.load_id) || [];

    const { data: currentAddresses } = await supabase
      .from(addressTable)
      .select('load_id, state, address_type')
      .in('load_id', currentLoadIds)
      .in('address_type', [1, 2]);

    const { data: baselineAddresses } = baselineLoadIds.length > 0
      ? await supabase
          .from(addressTable)
          .select('load_id, state, address_type')
          .in('load_id', baselineLoadIds)
          .in('address_type', [1, 2])
      : { data: [] };

    const currentLaneCosts = calculateLaneCosts(currentShipments, currentAddresses || []);
    const baselineLaneCosts = calculateLaneCosts(baselineShipments || [], baselineAddresses || []);

    for (const [lane, current] of Object.entries(currentLaneCosts)) {
      const baseline = baselineLaneCosts[lane];
      if (baseline && current.count >= THRESHOLDS.minShipmentsForSignal) {
        const changePercent = ((current.avgCost - baseline.avgCost) / baseline.avgCost) * 100;

        if (changePercent > THRESHOLDS.costSpikePercent) {
          const dollarIncrease = (current.avgCost - baseline.avgCost) * current.count;
          signals.push({
            id: `cost-spike-${lane.replace(/\s/g, '-')}`,
            type: 'cost_spike',
            severity: changePercent > 25 ? 'high' : 'medium',
            title: `${lane} lane costs increased ${Math.round(changePercent)}%`,
            description: `vs. baseline period - $${formatNumber(dollarIncrease)} over expected`,
            metric: {
              current: current.avgCost,
              baseline: baseline.avgCost,
              change: current.avgCost - baseline.avgCost,
              changePercent: Math.round(changePercent),
            },
            context: { lane },
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (baselineShipments && baselineShipments.length >= THRESHOLDS.minShipmentsForSignal) {
      const volumeChange = ((currentShipments.length - baselineShipments.length) / baselineShipments.length) * 100;

      if (volumeChange < -THRESHOLDS.volumeDropPercent) {
        signals.push({
          id: 'volume-drop',
          type: 'volume_drop',
          severity: volumeChange < -30 ? 'high' : 'medium',
          title: `Shipment volume down ${Math.abs(Math.round(volumeChange))}%`,
          description: `${currentShipments.length} shipments vs. ${baselineShipments.length} in baseline period`,
          metric: {
            current: currentShipments.length,
            baseline: baselineShipments.length,
            change: currentShipments.length - baselineShipments.length,
            changePercent: Math.round(volumeChange),
          },
          detectedAt: new Date().toISOString(),
        });
      }
    }

    const carrierPerformance = calculateCarrierPerformance(currentShipments);
    const baselineCarrierPerformance = calculateCarrierPerformance(baselineShipments || []);

    const carrierIds = [...new Set(currentShipments.map(s => s.rate_carrier_id).filter(Boolean))];
    const { data: carriers } = carrierIds.length > 0
      ? await supabase
          .from('carrier')
          .select('carrier_id, carrier_name')
          .in('carrier_id', carrierIds)
      : { data: [] };

    const carrierMap = new Map((carriers || []).map(c => [c.carrier_id, c.carrier_name]));

    for (const [carrierId, current] of Object.entries(carrierPerformance)) {
      if (current.total >= THRESHOLDS.minShipmentsForSignal && current.onTimeRate < THRESHOLDS.carrierOnTimeMin) {
        const baseline = baselineCarrierPerformance[carrierId];
        const carrierName = carrierMap.get(parseInt(carrierId)) || 'Unknown Carrier';

        if (!baseline || current.onTimeRate < baseline.onTimeRate - 5 || current.onTimeRate < 80) {
          const lateCount = current.total - current.onTime;
          signals.push({
            id: `carrier-perf-${carrierId}`,
            type: 'carrier_performance',
            severity: current.onTimeRate < 80 ? 'high' : 'medium',
            title: `${carrierName} on-time performance dropped to ${Math.round(current.onTimeRate)}%`,
            description: baseline
              ? `Down from ${Math.round(baseline.onTimeRate)}% last period - ${lateCount} late deliveries`
              : `${lateCount} late deliveries this period`,
            metric: {
              current: current.onTimeRate,
              baseline: baseline?.onTimeRate || 0,
              change: baseline ? current.onTimeRate - baseline.onTimeRate : 0,
              changePercent: baseline ? Math.round(((current.onTimeRate - baseline.onTimeRate) / baseline.onTimeRate) * 100) : 0,
            },
            context: { carrier: carrierName },
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    signals.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return {
      signals: signals.slice(0, 5),
      allClear: signals.length === 0,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error detecting attention signals:', error);
    return { signals: [], allClear: true, analyzedAt: new Date().toISOString() };
  }
}

interface ShipmentData {
  load_id: number;
  retail?: number;
  rate_carrier_id?: number;
  delivery_date?: string;
  expected_delivery_date?: string;
}

interface AddressData {
  load_id: number;
  state?: string;
  address_type: number;
}

function calculateLaneCosts(shipments: ShipmentData[], addresses: AddressData[]) {
  const addressMap = new Map<number, { origin?: string; dest?: string }>();
  for (const addr of addresses) {
    if (!addressMap.has(addr.load_id)) addressMap.set(addr.load_id, {});
    const entry = addressMap.get(addr.load_id)!;
    if (addr.address_type === 1) entry.origin = addr.state;
    if (addr.address_type === 2) entry.dest = addr.state;
  }

  const laneCosts: Record<string, { count: number; totalCost: number; avgCost: number }> = {};
  for (const shipment of shipments) {
    const addrs = addressMap.get(shipment.load_id);
    if (addrs?.origin && addrs?.dest) {
      const lane = `${addrs.origin} → ${addrs.dest}`;
      if (!laneCosts[lane]) laneCosts[lane] = { count: 0, totalCost: 0, avgCost: 0 };
      laneCosts[lane].count += 1;
      laneCosts[lane].totalCost += shipment.retail || 0;
    }
  }
  for (const lane of Object.keys(laneCosts)) {
    laneCosts[lane].avgCost = laneCosts[lane].count > 0 ? laneCosts[lane].totalCost / laneCosts[lane].count : 0;
  }
  return laneCosts;
}

function calculateCarrierPerformance(shipments: ShipmentData[]) {
  const carrierStats: Record<string, { total: number; onTime: number; onTimeRate: number }> = {};
  for (const shipment of shipments) {
    if (!shipment.rate_carrier_id) continue;
    const carrierId = String(shipment.rate_carrier_id);
    if (!carrierStats[carrierId]) carrierStats[carrierId] = { total: 0, onTime: 0, onTimeRate: 0 };
    carrierStats[carrierId].total += 1;
    if (shipment.delivery_date && shipment.expected_delivery_date && shipment.delivery_date <= shipment.expected_delivery_date) {
      carrierStats[carrierId].onTime += 1;
    }
  }
  for (const carrierId of Object.keys(carrierStats)) {
    const stats = carrierStats[carrierId];
    stats.onTimeRate = stats.total > 0 ? (stats.onTime / stats.total) * 100 : 100;
  }
  return carrierStats;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}
