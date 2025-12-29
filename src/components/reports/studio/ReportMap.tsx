import { useMemo } from 'react';
import { Loader2, Map as MapIcon } from 'lucide-react';
import { Card } from '../../ui/Card';
import { CostPerStateMap } from '../../dashboard/CostPerStateMap';
import type { MapType } from '../../../types/aiReport';
import type { StateData } from '../../../hooks/useDashboardData';

export interface MapDataPoint {
  stateCode?: string;
  origin?: string;
  destination?: string;
  value: number;
  shipmentCount?: number;
  lat?: number;
  lng?: number;
  label?: string;
}

export interface ReportMapProps {
  type: MapType;
  data: MapDataPoint[];
  title?: string;
  height?: number;
  format?: 'currency' | 'number' | 'percent';
  isLoading?: boolean;
  compact?: boolean;
}

export function ReportMap({
  type,
  data,
  title,
  height = 400,
  format = 'number',
  isLoading = false,
  compact = false,
}: ReportMapProps) {
  const stateData: StateData[] = useMemo(() => {
    if (type !== 'choropleth') return [];

    return data
      .filter((d) => d.stateCode)
      .map((d) => ({
        stateCode: d.stateCode!,
        avgCost: d.value,
        shipmentCount: d.shipmentCount || 0,
        isOutlier: false,
      }));
  }, [data, type]);

  const flowData = useMemo(() => {
    if (type !== 'flow' && type !== 'arc') return [];

    return data
      .filter((d) => d.origin && d.destination)
      .map((d) => ({
        originState: d.origin!,
        destinationState: d.destination!,
        shipmentCount: d.shipmentCount || Math.round(d.value),
        totalCost: d.value,
      }));
  }, [data, type]);

  if (isLoading) {
    return (
      <Card variant="default" padding={compact ? 'sm' : 'md'}>
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card variant="default" padding={compact ? 'sm' : 'md'}>
        {title && (
          <h3 className={compact ? 'text-sm font-semibold text-gray-900 mb-2' : 'text-lg font-semibold text-gray-900 mb-4'}>
            {title}
          </h3>
        )}
        <div className="flex flex-col items-center justify-center text-slate-400" style={{ height }}>
          <MapIcon className="w-12 h-12 mb-2 opacity-50" />
          <p>No geographic data available</p>
        </div>
      </Card>
    );
  }

  const renderMap = () => {
    switch (type) {
      case 'choropleth':
        return (
          <div style={{ height }} className="rounded-lg overflow-hidden border border-slate-200">
            <CostPerStateMap data={stateData} isLoading={false} />
          </div>
        );

      case 'flow':
      case 'arc':
        return (
          <div style={{ height }} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <FlowMapSimple data={flowData} height={height} />
          </div>
        );

      case 'cluster':
        return (
          <div style={{ height }} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <ClusterMapSimple data={data} height={height} />
          </div>
        );

      default:
        return null;
    }
  };

  const titleClasses = compact
    ? 'text-sm font-semibold text-gray-900 mb-2'
    : 'text-lg font-semibold text-gray-900 mb-4';

  return (
    <Card variant="default" padding={compact ? 'sm' : 'md'}>
      {title && <h3 className={titleClasses}>{title}</h3>}
      {renderMap()}
    </Card>
  );
}

interface FlowMapSimpleProps {
  data: Array<{
    originState: string;
    destinationState: string;
    shipmentCount: number;
    totalCost: number;
  }>;
  height: number;
}

function FlowMapSimple({ data, height }: FlowMapSimpleProps) {
  const originCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((d) => {
      counts[d.originState] = (counts[d.originState] || 0) + d.shipmentCount;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [data]);

  const destCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((d) => {
      counts[d.destinationState] = (counts[d.destinationState] || 0) + d.shipmentCount;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [data]);

  const totalShipments = data.reduce((sum, d) => sum + d.shipmentCount, 0);
  const totalRoutes = data.length;
  const uniqueOrigins = new Set(data.map((d) => d.originState)).size;
  const uniqueDestinations = new Set(data.map((d) => d.destinationState)).size;

  return (
    <div className="h-full flex flex-col p-4" style={{ height }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>
            <span className="font-semibold text-slate-800">{uniqueOrigins}</span> origins
          </span>
          <span className="text-slate-300">|</span>
          <span>
            <span className="font-semibold text-slate-800">{uniqueDestinations}</span> destinations
          </span>
          <span className="text-slate-300">|</span>
          <span>
            <span className="font-semibold text-slate-800">{totalRoutes}</span> routes
          </span>
          <span className="text-slate-300">|</span>
          <span>
            <span className="font-semibold text-slate-800">{totalShipments.toLocaleString()}</span> shipments
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Top Origins
          </h4>
          <div className="space-y-2">
            {originCounts.map(([state, count]) => {
              const pct = (count / totalShipments) * 100;
              return (
                <div key={state} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium text-slate-700">{state}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="w-16 text-xs text-slate-500 text-right">
                    {count.toLocaleString()} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            Top Destinations
          </h4>
          <div className="space-y-2">
            {destCounts.map(([state, count]) => {
              const pct = (count / totalShipments) * 100;
              return (
                <div key={state} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium text-slate-700">{state}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="w-16 text-xs text-slate-500 text-right">
                    {count.toLocaleString()} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ClusterMapSimpleProps {
  data: MapDataPoint[];
  height: number;
}

function ClusterMapSimple({ data, height }: ClusterMapSimpleProps) {
  const stateGroups = useMemo(() => {
    const groups: Record<string, { count: number; value: number }> = {};
    data.forEach((d) => {
      const key = d.stateCode || d.label || 'Unknown';
      if (!groups[key]) {
        groups[key] = { count: 0, value: 0 };
      }
      groups[key].count += 1;
      groups[key].value += d.value;
    });
    return Object.entries(groups)
      .map(([state, stats]) => ({ state, ...stats }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [data]);

  const totalValue = stateGroups.reduce((sum, g) => sum + g.value, 0);
  const totalPoints = data.length;

  return (
    <div className="h-full flex flex-col p-4" style={{ height }}>
      <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
        <span>
          <span className="font-semibold text-slate-800">{totalPoints}</span> points
        </span>
        <span className="text-slate-300">|</span>
        <span>
          <span className="font-semibold text-slate-800">{stateGroups.length}</span> clusters
        </span>
        <span className="text-slate-300">|</span>
        <span>
          <span className="font-semibold text-slate-800">${totalValue.toLocaleString()}</span> total value
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-3 gap-3">
          {stateGroups.map(({ state, count, value }) => {
            const pct = (value / totalValue) * 100;
            return (
              <div
                key={state}
                className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-800">{state}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {count} points / ${value.toLocaleString()}
                </div>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${Math.max(pct, 5)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ReportMap;
