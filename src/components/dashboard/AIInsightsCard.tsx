import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AIInsightsCardProps {
  customerId: number;
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

export function AIInsightsCard({ customerId, dateRange, className = '' }: AIInsightsCardProps) {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchKey, setLastFetchKey] = useState<string>('');

  const fetchKey = `${customerId}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`;

  const fetchInsights = useCallback(async (force = false) => {
    if (!force && fetchKey === lastFetchKey && data) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: responseData, error: fnError } = await supabase.functions.invoke(
        'generate-insights',
        {
          body: {
            customerId,
            dateRange: {
              start: dateRange.start.toISOString().split('T')[0],
              end: dateRange.end.toISOString().split('T')[0],
            },
          },
        }
      );

      if (fnError) throw fnError;
      setData(responseData);
      setLastFetchKey(fetchKey);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setError('Unable to generate insights');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, dateRange, fetchKey, lastFetchKey, data]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleRefresh = () => {
    fetchInsights(true);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendColor = (value: number, inverse = false) => {
    if (value === 0) return 'text-slate-500';
    const isPositive = inverse ? value < 0 : value > 0;
    return isPositive ? 'text-emerald-600' : 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold">AI Insights</h3>
            <p className="text-sm text-slate-400">Analyzing your data...</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-700 rounded animate-pulse w-full" />
          <div className="h-4 bg-slate-700 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-slate-700 rounded animate-pulse w-4/6" />
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4">
              <div className="h-3 bg-slate-700 rounded animate-pulse w-16 mb-2" />
              <div className="h-6 bg-slate-700 rounded animate-pulse w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
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
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className="text-slate-400">{error || 'No insights available'}</p>
      </div>
    );
  }

  const { insights, metrics } = data;
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

      <p className="text-lg leading-relaxed text-slate-100 mb-6">{insights}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Total Spend</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(current.totalSpend)}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon value={changes.spendChange} />
            <span className={`text-sm font-medium ${getTrendColor(changes.spendChange, true)}`}>
              {changes.spendChange > 0 ? '+' : ''}{changes.spendChange}%
            </span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Shipments</span>
          </div>
          <p className="text-xl font-bold">{current.shipmentCount.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon value={changes.volumeChange} />
            <span className={`text-sm font-medium ${getTrendColor(changes.volumeChange)}`}>
              {changes.volumeChange > 0 ? '+' : ''}{changes.volumeChange}%
            </span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Avg Cost</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(current.avgCostPerShipment)}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon value={changes.avgCostChange} />
            <span className={`text-sm font-medium ${getTrendColor(changes.avgCostChange, true)}`}>
              {changes.avgCostChange > 0 ? '+' : ''}{changes.avgCostChange}%
            </span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Top Mode</span>
          </div>
          <p className="text-xl font-bold truncate" title={current.topMode}>
            {current.topMode}
          </p>
          <p className="text-sm text-slate-400 mt-1">{current.topModePercent}% of volume</p>
        </div>
      </div>
    </div>
  );
}
