import { useState, useEffect } from 'react';
import { Package, DollarSign, Clock, Truck, ArrowUpRight, ArrowDownRight, Minus, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MetricTooltip } from '../ui/MetricTooltip';
import type { MetricId } from '../ui/MetricTooltip';

interface ExecutiveMetricsRowProps {
  customerId: string;
  startDate: string;
  endDate: string;
}

interface MetricsData {
  totalShipments: number;
  totalSpend: number;
  avgCostPerShipment: number;
  onTimePercentage: number;
  avgTransitDays: number;
  activeCarriers: number;
  shipmentsChange: number;
  spendChange: number;
  onTimeChange: number;
}

function TrendIndicator({ value, inverse = false }: { value: number; inverse?: boolean }) {
  if (Math.abs(value) < 0.5) {
    return (
      <span className="flex items-center gap-1 text-slate-500 text-xs">
        <Minus className="w-3 h-3" />
        <span>No change</span>
      </span>
    );
  }

  const isPositive = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  const colorClass = isPositive ? 'text-emerald-600' : 'text-red-500';

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>
    </span>
  );
}

function StatusIndicator({ value, threshold, label }: { value: number; threshold: number; label: string }) {
  const isGood = value >= threshold;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>
      {isGood ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </span>
  );
}

function formatPeriod(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return 'Last 7 days';
  if (diffDays <= 30) return 'Last 30 days';
  if (diffDays <= 90) return 'Last 90 days';

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function ExecutiveMetricsRow({ customerId, startDate, endDate }: ExecutiveMetricsRowProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const period = formatPeriod(startDate, endDate);

  useEffect(() => {
    async function loadMetrics() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('get_pulse_executive_metrics', {
          p_customer_id: parseInt(customerId),
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (rpcError) {
          console.error('RPC Error:', rpcError);
          setError(rpcError.message);
          setMetrics(null);
        } else if (data) {
          setMetrics(data);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load metrics');
        setMetrics(null);
      } finally {
        setIsLoading(false);
      }
    }

    if (customerId) {
      loadMetrics();
    }
  }, [customerId, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-4 bg-slate-100 rounded w-24 animate-pulse" />
            </div>
            <div className="h-9 bg-slate-100 rounded w-20 mb-3 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-16 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    const emptyKpis: { icon: typeof Package; label: string; iconBg: string; iconColor: string; metricId: MetricId }[] = [
      { icon: Package, label: 'Total Shipments', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', metricId: 'total_shipments' },
      { icon: DollarSign, label: 'Total Spend', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', metricId: 'total_spend' },
      { icon: Clock, label: 'On-Time %', iconBg: 'bg-teal-100', iconColor: 'text-teal-600', metricId: 'on_time_percentage' },
      { icon: Truck, label: 'Active Carriers', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', metricId: 'active_carriers' },
    ];

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {emptyKpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
                <MetricTooltip metricId={kpi.metricId} period={period}>
                  <span className="text-sm font-medium text-slate-600">{kpi.label}</span>
                </MetricTooltip>
              </div>
              <div className="text-3xl font-bold text-slate-300 mb-3">--</div>
              <div className="text-xs text-slate-400">No data for this period</div>
            </div>
          );
        })}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${Math.round(value / 1000)}K`;
    return `$${Math.round(value).toLocaleString()}`;
  };

  const kpis: {
    label: string;
    value: string;
    icon: typeof Package;
    iconBg: string;
    iconColor: string;
    trend: number;
    inverse: boolean;
    metricId: MetricId;
    recordCount?: number;
    statusThreshold?: number;
    showStable?: boolean;
  }[] = [
    {
      label: 'Total Shipments',
      value: metrics.totalShipments.toLocaleString(),
      icon: Package,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: metrics.shipmentsChange,
      inverse: false,
      metricId: 'total_shipments',
      recordCount: metrics.totalShipments,
    },
    {
      label: 'Total Spend',
      value: formatCurrency(metrics.totalSpend),
      icon: DollarSign,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      trend: metrics.spendChange,
      inverse: true,
      metricId: 'total_spend',
      recordCount: metrics.totalShipments,
    },
    {
      label: 'On-Time %',
      value: `${metrics.onTimePercentage.toFixed(1)}%`,
      icon: Clock,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      trend: metrics.onTimeChange,
      inverse: false,
      statusThreshold: 90,
      metricId: 'on_time_percentage',
      recordCount: metrics.totalShipments,
    },
    {
      label: 'Active Carriers',
      value: metrics.activeCarriers.toString(),
      icon: Truck,
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      trend: 0,
      inverse: false,
      showStable: true,
      metricId: 'active_carriers',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${kpi.iconColor}`} />
              </div>
              <MetricTooltip
                metricId={kpi.metricId}
                period={period}
                recordCount={kpi.recordCount}
              >
                <span className="text-sm font-medium text-slate-600">{kpi.label}</span>
              </MetricTooltip>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-3">{kpi.value}</div>
            {kpi.showStable ? (
              <StatusIndicator value={100} threshold={0} label="Stable" />
            ) : kpi.statusThreshold !== undefined ? (
              <StatusIndicator
                value={metrics.onTimePercentage}
                threshold={kpi.statusThreshold}
                label={metrics.onTimePercentage >= kpi.statusThreshold ? 'On track' : 'Needs attention'}
              />
            ) : (
              <TrendIndicator value={kpi.trend} inverse={kpi.inverse} />
            )}
          </div>
        );
      })}
    </div>
  );
}
