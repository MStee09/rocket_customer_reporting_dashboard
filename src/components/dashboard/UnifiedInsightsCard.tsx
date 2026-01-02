import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Package,
  BarChart3,
  Truck,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UnifiedInsightsCardProps {
  customerId: number;
  isAdmin: boolean;
  dateRange: {
    start: Date;
    end: Date;
  };
  className?: string;
}

interface Metrics {
  totalSpend: number;
  shipmentCount: number;
  avgCostPerShipment: number;
  topMode: string;
  topModePercent: number;
  topDestinationState: string;
}

interface Changes {
  spendChange: number;
  volumeChange: number;
  avgCostChange: number;
}

interface InsightsResponse {
  insights: string;
  metrics: {
    current: Metrics;
    previous: Metrics;
    changes: Changes;
  };
  generatedAt: string;
}

interface Alert {
  id: string;
  type: 'volume_spike' | 'volume_drop' | 'spend_spike' | 'spend_drop' | 'carrier_concentration' | 'carrier_cost_up' | 'carrier_cost_down';
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  description: string;
  metric?: string;
  change?: number;
  investigateQuery: string;
}

interface CarrierCostChange {
  carrier_name: string;
  current_avg_cost: number;
  previous_avg_cost: number;
  cost_change_percent: number;
  current_volume: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

async function detectAlerts(
  customerId: number,
  startDate: string,
  endDate: string
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    const { data: periodData } = await supabase.rpc('get_period_comparison', {
      p_customer_id: String(customerId),
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (periodData) {
      const volumeChange = periodData.volume_change_percent || 0;
      if (Math.abs(volumeChange) > 20) {
        const isSpike = volumeChange > 0;
        alerts.push({
          id: 'volume_' + (isSpike ? 'spike' : 'drop'),
          type: isSpike ? 'volume_spike' : 'volume_drop',
          severity: Math.abs(volumeChange) > 40 ? 'critical' : 'warning',
          title: isSpike ? 'Volume Spike' : 'Volume Drop',
          description: `${isSpike ? 'Up' : 'Down'} ${Math.abs(volumeChange).toFixed(0)}% vs prior period`,
          metric: `${periodData.current_volume?.toLocaleString() || 0} shipments`,
          change: volumeChange,
          investigateQuery: isSpike
            ? 'What caused my recent volume increase?'
            : 'Why did my shipment volume drop?'
        });
      }

      const spendChange = periodData.spend_change_percent || 0;
      if (Math.abs(spendChange) > 15) {
        const isSpike = spendChange > 0;
        alerts.push({
          id: 'spend_' + (isSpike ? 'spike' : 'drop'),
          type: isSpike ? 'spend_spike' : 'spend_drop',
          severity: isSpike ? 'warning' : 'success',
          title: isSpike ? 'Spend Increase' : 'Cost Savings',
          description: `${isSpike ? 'Up' : 'Down'} ${Math.abs(spendChange).toFixed(0)}%`,
          metric: formatCurrency(periodData.current_spend || 0),
          change: spendChange,
          investigateQuery: isSpike
            ? 'Which carriers or lanes are driving up my costs?'
            : 'What led to lower freight spend?'
        });
      }
    }

    const { data: concentrationData } = await supabase.rpc('get_carrier_concentration', {
      p_customer_id: String(customerId),
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (concentrationData) {
      const topCarrierPercent = concentrationData.top_carrier_percent || 0;
      if (topCarrierPercent > 60) {
        alerts.push({
          id: 'carrier_concentration',
          type: 'carrier_concentration',
          severity: topCarrierPercent > 80 ? 'warning' : 'info',
          title: 'High Carrier Concentration',
          description: `${concentrationData.top_carrier_name} handles ${topCarrierPercent.toFixed(0)}%`,
          metric: `${concentrationData.carrier_count} total carriers`,
          investigateQuery: 'Show me my carrier diversity and suggest alternatives'
        });
      }
    }

    const { data: carrierCostData } = await supabase.rpc('get_carrier_cost_changes', {
      p_customer_id: String(customerId),
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (carrierCostData && Array.isArray(carrierCostData) && carrierCostData.length > 0) {
      const costIncreases = carrierCostData.filter((c: CarrierCostChange) => c.cost_change_percent > 10);

      if (costIncreases.length >= 2) {
        const avgIncrease = costIncreases.reduce((sum: number, c: CarrierCostChange) => sum + c.cost_change_percent, 0) / costIncreases.length;
        alerts.push({
          id: 'carrier_cost_up_multiple',
          type: 'carrier_cost_up',
          severity: avgIncrease > 15 ? 'critical' : 'warning',
          title: 'Carrier Rate Increases',
          description: `${costIncreases.length} carriers up avg ${avgIncrease.toFixed(0)}%`,
          metric: costIncreases.map((c: CarrierCostChange) => c.carrier_name).slice(0, 2).join(', '),
          change: avgIncrease,
          investigateQuery: 'Which carriers are increasing their rates and why?'
        });
      }
    }

    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2, success: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return alerts.slice(0, 3);
  } catch (error) {
    console.error('Error detecting alerts:', error);
    return [];
  }
}

function AlertIcon({ type, severity }: { type: Alert['type']; severity: Alert['severity'] }) {
  const colorClass = {
    critical: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
    success: 'text-emerald-400'
  }[severity];

  switch (type) {
    case 'volume_spike':
    case 'spend_spike':
    case 'carrier_cost_up':
      return <TrendingUp className={`w-4 h-4 ${colorClass}`} />;
    case 'volume_drop':
    case 'spend_drop':
    case 'carrier_cost_down':
      return <TrendingDown className={`w-4 h-4 ${colorClass}`} />;
    case 'carrier_concentration':
      return <Truck className={`w-4 h-4 ${colorClass}`} />;
    default:
      return <AlertTriangle className={`w-4 h-4 ${colorClass}`} />;
  }
}

function AlertBadge({ alert, onInvestigate }: { alert: Alert; onInvestigate: (query: string) => void }) {
  const severityBg = {
    critical: 'bg-red-500/20 border-red-500/30 text-red-100',
    warning: 'bg-amber-500/20 border-amber-500/30 text-amber-100',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-100',
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100'
  }[alert.severity];

  return (
    <button
      onClick={() => onInvestigate(alert.investigateQuery)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${severityBg} hover:opacity-80 transition-opacity text-left`}
    >
      <AlertIcon type={alert.type} severity={alert.severity} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{alert.title}</p>
        <p className="text-xs opacity-80 truncate">{alert.description}</p>
      </div>
      <ArrowRight className="w-4 h-4 opacity-60 flex-shrink-0" />
    </button>
  );
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (value < 0) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function getTrendColor(value: number, inverse = false) {
  if (value === 0) return 'text-slate-400';
  const isPositive = inverse ? value < 0 : value > 0;
  return isPositive ? 'text-emerald-400' : 'text-red-400';
}

export function UnifiedInsightsCard({ customerId, isAdmin, dateRange, className = '' }: UnifiedInsightsCardProps) {
  const navigate = useNavigate();
  const [insightsData, setInsightsData] = useState<InsightsResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchKey, setLastFetchKey] = useState<string>('');

  const fetchKey = `${customerId}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`;
  const startDateStr = dateRange.start.toISOString().split('T')[0];
  const endDateStr = dateRange.end.toISOString().split('T')[0];

  const fetchData = useCallback(async (force = false) => {
    if (!force && fetchKey === lastFetchKey && insightsData) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [insightsResult, alertsResult] = await Promise.all([
        supabase.functions.invoke('generate-insights', {
          body: {
            customerId,
            dateRange: { start: startDateStr, end: endDateStr },
          },
        }),
        detectAlerts(customerId, startDateStr, endDateStr),
      ]);

      if (insightsResult.error) throw insightsResult.error;
      setInsightsData(insightsResult.data);
      setAlerts(alertsResult);
      setLastFetchKey(fetchKey);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setError('Unable to generate insights');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, startDateStr, endDateStr, fetchKey, lastFetchKey, insightsData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => fetchData(true);

  const handleInvestigate = (query: string) => {
    navigate(`/ai-studio?query=${encodeURIComponent(query)}`);
  };

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold">AI Insights</h3>
            <p className="text-sm text-slate-400">Analyzing your data...</p>
          </div>
        </div>
        <div className="space-y-3 mb-6">
          <div className="h-4 bg-slate-700/50 rounded animate-pulse w-full" />
          <div className="h-4 bg-slate-700/50 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-slate-700/50 rounded animate-pulse w-4/6" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-3">
              <div className="h-3 bg-slate-700/50 rounded animate-pulse w-16 mb-2" />
              <div className="h-5 bg-slate-700/50 rounded animate-pulse w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !insightsData) {
    return (
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold">AI Insights</h3>
              <p className="text-sm text-slate-400">Powered by Claude</p>
            </div>
          </div>
          <button onClick={handleRefresh} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className="text-slate-400">{error || 'No insights available'}</p>
      </div>
    );
  }

  const { insights, metrics } = insightsData;
  const { current, changes } = metrics;

  return (
    <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold">AI Insights</h3>
            <p className="text-sm text-slate-400">Powered by Claude</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh insights"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href="/ai-studio"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-400 text-sm font-medium transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Ask AI
          </a>
        </div>
      </div>

      <p className="text-base leading-relaxed text-slate-200 mb-5">{insights}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Spend</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(current.totalSpend)}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <TrendIcon value={-changes.spendChange} />
            <span className={`text-xs font-medium ${getTrendColor(changes.spendChange, true)}`}>
              {changes.spendChange > 0 ? '+' : ''}{changes.spendChange}%
            </span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Shipments</span>
          </div>
          <p className="text-lg font-bold">{current.shipmentCount.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <TrendIcon value={changes.volumeChange} />
            <span className={`text-xs font-medium ${getTrendColor(changes.volumeChange)}`}>
              {changes.volumeChange > 0 ? '+' : ''}{changes.volumeChange}%
            </span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Avg Cost</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(current.avgCostPerShipment)}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <TrendIcon value={-changes.avgCostChange} />
            <span className={`text-xs font-medium ${getTrendColor(changes.avgCostChange, true)}`}>
              {changes.avgCostChange > 0 ? '+' : ''}{changes.avgCostChange}%
            </span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Top Mode</span>
          </div>
          <p className="text-lg font-bold truncate" title={current.topMode}>
            {current.topMode || 'N/A'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{current.topModePercent}% of volume</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="border-t border-slate-700/50 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-slate-300">Attention Needed</span>
          </div>
          <div className="grid gap-2">
            {alerts.map((alert) => (
              <AlertBadge key={alert.id} alert={alert} onInvestigate={handleInvestigate} />
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="border-t border-slate-700/50 pt-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">All Clear - No anomalies detected</span>
          </div>
        </div>
      )}
    </div>
  );
}
