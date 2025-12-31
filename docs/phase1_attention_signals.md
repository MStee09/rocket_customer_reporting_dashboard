# Phase 1: Attention Required Signal System
## P0 Critical - Build First

This phase implements the proactive anomaly detection that transforms the dashboard from a reporting tool to a command center.

---

## Files to Create

### 1. `src/services/attentionSignalService.ts`

```typescript
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

    const { data: baselineAddresses } = await supabase
      .from(addressTable)
      .select('load_id, state, address_type')
      .in('load_id', baselineLoadIds)
      .in('address_type', [1, 2]);

    // Cost Spike Detection
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
            description: `vs. baseline period • $${formatNumber(dollarIncrease)} over expected`,
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

    // Volume Drop Detection
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

    // Carrier Performance Detection
    const carrierPerformance = calculateCarrierPerformance(currentShipments);
    const baselineCarrierPerformance = calculateCarrierPerformance(baselineShipments || []);

    const carrierIds = [...new Set(currentShipments.map(s => s.rate_carrier_id).filter(Boolean))];
    const { data: carriers } = await supabase
      .from('carrier')
      .select('carrier_id, carrier_name')
      .in('carrier_id', carrierIds);

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
              ? `Down from ${Math.round(baseline.onTimeRate)}% last period • ${lateCount} late deliveries`
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

function calculateLaneCosts(shipments: any[], addresses: any[]) {
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

function calculateCarrierPerformance(shipments: any[]) {
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
```

---

### 2. `src/hooks/useAttentionSignals.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { detectAttentionSignals, AttentionSignalsResponse } from '../services/attentionSignalService';

interface UseAttentionSignalsParams {
  dateRange: { start: string; end: string };
}

export function useAttentionSignals({ dateRange }: UseAttentionSignalsParams) {
  const { effectiveCustomerId, isAdmin, isViewingAsCustomer } = useAuth();
  const [data, setData] = useState<AttentionSignalsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    if (!effectiveCustomerId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await detectAttentionSignals({
        supabase,
        customerId: effectiveCustomerId,
        isAdmin: isAdmin(),
        isViewingAsCustomer,
        dateRange,
      });
      setData(response);
    } catch (err) {
      console.error('Error fetching attention signals:', err);
      setError('Unable to analyze data for attention signals');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCustomerId, isAdmin, isViewingAsCustomer, dateRange]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return {
    signals: data?.signals || [],
    allClear: data?.allClear ?? true,
    analyzedAt: data?.analyzedAt,
    isLoading,
    error,
    refresh: fetchSignals,
  };
}
```

---

### 3. `src/components/dashboard/AttentionSignals.tsx`

```typescript
import { useState } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Truck,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { AttentionSignal } from '../../services/attentionSignalService';

interface AttentionSignalsProps {
  signals: AttentionSignal[];
  allClear: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onViewDetails?: (signal: AttentionSignal) => void;
}

const signalIcons: Record<AttentionSignal['type'], typeof TrendingUp> = {
  cost_spike: TrendingUp,
  volume_drop: TrendingDown,
  carrier_performance: Truck,
  delivery_delay: Clock,
};

const severityStyles: Record<AttentionSignal['severity'], { bg: string; border: string; icon: string }> = {
  high: { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600' },
};

export function AttentionSignals({ signals, allClear, isLoading, onRefresh, onViewDetails }: AttentionSignalsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5 mb-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200" />
          <div className="flex-1">
            <div className="h-5 bg-slate-200 rounded w-48 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (allClear) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900">All systems normal</h3>
              <p className="text-sm text-emerald-700">No anomalies detected in your logistics data</p>
            </div>
          </div>
          <button onClick={onRefresh} className="p-2 hover:bg-emerald-100 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
          </button>
        </div>
      </div>
    );
  }

  const visibleSignals = showAll ? signals : signals.slice(0, 3);
  const hiddenCount = signals.length - 3;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-orange-900">
              {signals.length} {signals.length === 1 ? 'thing needs' : 'things need'} your attention
            </h3>
            <p className="text-sm text-orange-700">This period's priority items</p>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-orange-600 ml-2" /> : <ChevronDown className="w-5 h-5 text-orange-600 ml-2" />}
        </button>
        <button onClick={onRefresh} className="p-2 hover:bg-orange-100 rounded-lg transition-colors">
          <RefreshCw className="w-5 h-5 text-orange-600" />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {visibleSignals.map((signal) => {
            const Icon = signalIcons[signal.type];
            const styles = severityStyles[signal.severity];
            return (
              <div key={signal.id} className={`${styles.bg} rounded-xl p-4 flex items-center justify-between border ${styles.border}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg ${styles.icon} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{signal.title}</p>
                    <p className="text-sm text-slate-500">{signal.description}</p>
                  </div>
                </div>
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(signal)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 flex items-center gap-2 border border-slate-200 transition-colors"
                  >
                    View Details <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          {signals.length > 3 && (
            <button onClick={() => setShowAll(!showAll)} className="w-full py-2 text-sm font-medium text-orange-700 hover:text-orange-900 transition-colors">
              {showAll ? 'Show less' : `Show ${hiddenCount} more`}
            </button>
          )}

          <div className="mt-4 pt-4 border-t border-orange-200 flex items-center gap-2 text-emerald-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Everything else is tracking within normal ranges</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Files to Modify

### 4. Update `src/components/dashboard/index.ts`

Add this line to the existing exports:

```typescript
export { AttentionSignals } from './AttentionSignals';
```

---

### 5. Update `src/pages/DashboardPage.tsx`

**Changes to make:**

1. Add import at top:
```typescript
import { AttentionSignals } from '../components/dashboard';
import { useAttentionSignals } from '../hooks/useAttentionSignals';
```

2. Add the hook usage after the date range calculation (around line 50):
```typescript
const {
  signals,
  allClear,
  isLoading: signalsLoading,
  refresh: refreshSignals,
} = useAttentionSignals({
  dateRange: { start: startDate, end: endDate },
});
```

3. Add a handler function:
```typescript
const handleViewSignalDetails = useCallback((signal: any) => {
  console.log('View details for signal:', signal);
  // Future: Navigate to specific analysis view
}, []);
```

4. In the JSX, add the AttentionSignals component BEFORE the AIInsightsCard (around line 380):
```tsx
{/* Attention Signals Banner */}
{effectiveCustomerId && (
  <AttentionSignals
    signals={signals}
    allClear={allClear}
    isLoading={signalsLoading}
    onRefresh={refreshSignals}
    onViewDetails={handleViewSignalDetails}
  />
)}

{effectiveCustomerId && (
  <AIInsightsCard
    // ... existing props
  />
)}
```

---

## Testing Checklist

After implementing Phase 1:

- [ ] Dashboard loads without errors
- [ ] Attention Signals banner appears above AI Insights
- [ ] When no anomalies: Shows "All systems normal" green banner
- [ ] When anomalies detected: Shows orange banner with signal cards
- [ ] Refresh button triggers re-analysis
- [ ] "View Details" buttons are clickable
- [ ] Signals are sorted by severity (high first)
- [ ] Maximum 5 signals shown, with "Show more" option

---

## Potential Issues & Solutions

**Issue:** `getSecureTable` not found
**Solution:** Verify the import path. It should be in `src/utils/getSecureTable.ts`

**Issue:** TypeScript errors on `AttentionSignal` type
**Solution:** Ensure the type is exported from the service file

**Issue:** Hook dependencies causing infinite loops
**Solution:** Verify the `dateRange` object reference is stable (use useMemo)
