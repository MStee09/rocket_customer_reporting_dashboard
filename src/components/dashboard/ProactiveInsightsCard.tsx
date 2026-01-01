import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Truck,
  ArrowRight,
  RefreshCw,
  Sparkles,
  XCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ProactiveInsightsCardProps {
  customerId: number;
  isAdmin: boolean;
  dateRange: { start: Date; end: Date };
  className?: string;
}

interface Insight {
  id: string;
  type: 'volume_spike' | 'volume_drop' | 'spend_spike' | 'spend_drop' | 'carrier_concentration';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric?: string;
  change?: number;
  investigateQuery: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

async function detectInsights(
  customerId: number,
  startDate: string,
  endDate: string
): Promise<Insight[]> {
  const insights: Insight[] = [];

  try {
    const { data: periodData, error: periodError } = await supabase.rpc('get_period_comparison', {
      p_customer_id: String(customerId),
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (periodError) {
      console.error('Period comparison error:', periodError);
    }

    if (periodData) {
      const volumeChange = periodData.volume_change_percent || 0;
      if (Math.abs(volumeChange) > 20) {
        const isSpike = volumeChange > 0;
        insights.push({
          id: 'volume_' + (isSpike ? 'spike' : 'drop'),
          type: isSpike ? 'volume_spike' : 'volume_drop',
          severity: Math.abs(volumeChange) > 40 ? 'critical' : 'warning',
          title: isSpike ? 'Volume Spike Detected' : 'Volume Drop Detected',
          description: `Shipment volume ${isSpike ? 'increased' : 'decreased'} by ${Math.abs(volumeChange).toFixed(0)}% compared to previous period`,
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
        insights.push({
          id: 'spend_' + (isSpike ? 'spike' : 'drop'),
          type: isSpike ? 'spend_spike' : 'spend_drop',
          severity: isSpike ? 'warning' : 'info',
          title: isSpike ? 'Spend Increase' : 'Spend Decrease',
          description: `Freight spend ${isSpike ? 'increased' : 'decreased'} by ${Math.abs(spendChange).toFixed(0)}%`,
          metric: formatCurrency(periodData.current_spend || 0),
          change: spendChange,
          investigateQuery: isSpike
            ? 'Which carriers or lanes are driving up my costs?'
            : 'What led to lower freight spend?'
        });
      }
    }

    const { data: concentrationData, error: concError } = await supabase.rpc('get_carrier_concentration', {
      p_customer_id: String(customerId),
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (concError) {
      console.error('Carrier concentration error:', concError);
    }

    if (concentrationData) {
      const topCarrierPercent = concentrationData.top_carrier_percent || 0;
      if (topCarrierPercent > 60) {
        insights.push({
          id: 'carrier_concentration',
          type: 'carrier_concentration',
          severity: topCarrierPercent > 80 ? 'warning' : 'info',
          title: 'High Carrier Concentration',
          description: `${concentrationData.top_carrier_name} handles ${topCarrierPercent.toFixed(0)}% of your shipments`,
          metric: `${concentrationData.carrier_count} total carriers`,
          investigateQuery: 'Show me my carrier diversity and suggest alternatives'
        });
      }
    }

    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return insights.slice(0, 4);
  } catch (error) {
    console.error('Error detecting insights:', error);
    return [];
  }
}

function InsightIcon({ type, severity }: { type: Insight['type']; severity: Insight['severity'] }) {
  const colorClass = {
    critical: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500'
  }[severity];

  switch (type) {
    case 'volume_spike':
    case 'spend_spike':
      return <TrendingUp className={`w-5 h-5 ${colorClass}`} />;
    case 'volume_drop':
    case 'spend_drop':
      return <TrendingDown className={`w-5 h-5 ${colorClass}`} />;
    case 'carrier_concentration':
      return <Truck className={`w-5 h-5 ${colorClass}`} />;
    default:
      return <AlertTriangle className={`w-5 h-5 ${colorClass}`} />;
  }
}

function InsightCard({
  insight,
  onInvestigate
}: {
  insight: Insight;
  onInvestigate: (query: string) => void
}) {
  const severityBg = {
    critical: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200'
  }[insight.severity];

  return (
    <div className={`p-4 rounded-xl border ${severityBg} transition-all hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <InsightIcon type={insight.type} severity={insight.severity} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm">{insight.title}</h4>
          <p className="text-xs text-gray-600 mt-0.5">{insight.description}</p>
          {insight.metric && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-gray-700">{insight.metric}</span>
              {insight.change !== undefined && (
                <span className={insight.change > 0 ? 'text-green-600' : 'text-red-600'}>
                  ({insight.change > 0 ? '+' : ''}{insight.change.toFixed(0)}%)
                </span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => onInvestigate(insight.investigateQuery)}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
        >
          Investigate
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function ProactiveInsightsCard({
  customerId,
  isAdmin,
  dateRange,
  className = ''
}: ProactiveInsightsCardProps) {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];
      const detected = await detectInsights(customerId, startDate, endDate);
      setInsights(detected);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setError('Unable to analyze data');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, dateRange]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleInvestigate = (query: string) => {
    navigate(`/ai-studio?query=${encodeURIComponent(query)}`);
  };

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold">Proactive Insights</h3>
            <p className="text-sm text-slate-400">Analyzing your data...</p>
          </div>
        </div>
        <div className="grid gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold">Proactive Insights</h3>
              <p className="text-sm text-slate-400">{error}</p>
            </div>
          </div>
          <button onClick={fetchInsights} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold">All Clear</h3>
              <p className="text-sm text-slate-400">No anomalies detected</p>
            </div>
          </div>
          <button onClick={fetchInsights} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className="text-slate-400 text-sm">
          Your shipping patterns look normal. We'll alert you if we detect any unusual changes.
        </p>
        <button
          onClick={() => navigate('/ai-studio?query=' + encodeURIComponent('Give me an overview of my shipping performance'))}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-xl text-amber-400 text-sm font-medium transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Ask AI Assistant
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold">Attention Needed</h3>
            <p className="text-sm text-slate-400">
              {insights.length} insight{insights.length > 1 ? 's' : ''} detected
            </p>
          </div>
        </div>
        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onInvestigate={handleInvestigate}
          />
        ))}
      </div>

      <button
        onClick={() => navigate('/ai-studio')}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-xl text-amber-400 text-sm font-medium transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Deep Dive with AI
      </button>
    </div>
  );
}

export default ProactiveInsightsCard;
