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
  Info,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
  type: 'volume_spike' | 'volume_drop' | 'spend_spike' | 'spend_drop' | 'carrier_concentration' | 'carrier_cost_up' | 'carrier_cost_down' | 'concentration_risk' | 'new_lane';
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  description: string;
  metric?: string;
  change?: number;
  methodology?: string;
  investigateQuery: string;
  // For database anomalies
  isFromDatabase?: boolean;
  databaseId?: string;
}

interface CarrierCostChange {
  carrier_name: string;
  current_avg_cost: number;
  previous_avg_cost: number;
  cost_change_percent: number;
  current_volume: number;
}

interface DetectedAnomaly {
  id: string;
  anomaly_type: string;
  severity: string;
  title: string;
  description: string;
  change_percent: number | null;
  suggested_actions: Array<{ action: string; priority: string }> | null;
  status: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

// Map database anomaly types to investigate queries (customer-friendly)
function getInvestigateQuery(anomalyType: string): string {
  const queries: Record<string, string> = {
    'spend_spike': 'What is driving my recent spending increase?',
    'spend_drop': 'Why has my shipping spend decreased recently?',
    'volume_spike': 'What is causing my shipment volume to increase?',
    'volume_drop': 'Why has my shipment volume decreased?',
    'concentration_risk': 'Show me my carrier diversity and suggest alternatives',
    'new_lane': 'Tell me about my new shipping lanes and their rates',
  };
  return queries[anomalyType] || 'Analyze my recent shipping patterns';
}

async function fetchDatabaseAnomalies(customerId: number): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('detected_anomalies')
    .select('*')
    .eq('customer_id', customerId)
    .eq('status', 'new')
    .order('detection_date', { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return data.map((anomaly: DetectedAnomaly) => ({
    id: `db_${anomaly.id}`,
    type: anomaly.anomaly_type as Alert['type'],
    severity: anomaly.severity as Alert['severity'],
    title: anomaly.title,
    description: anomaly.description,
    change: anomaly.change_percent || undefined,
    investigateQuery: getInvestigateQuery(anomaly.anomaly_type),
    isFromDatabase: true,
    databaseId: anomaly.id,
  }));
}

async function detectAlerts(
  customerId: number,
  startDate: string,
  endDate: string
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - periodDays);

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const periodLabel = `${formatDate(start)} - ${formatDate(end)}`;
  const prevPeriodLabel = `${formatDate(prevStart)} - ${formatDate(prevEnd)}`;

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
          methodology: `Comparing ${periodLabel} (${periodData.current_volume?.toLocaleString() || 0} shipments) to ${prevPeriodLabel} (${periodData.previous_volume?.toLocaleString() || 0} shipments)`,
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
          methodology: `Comparing ${periodLabel} (${formatCurrency(periodData.current_spend || 0)}) to ${prevPeriodLabel} (${formatCurrency(periodData.previous_spend || 0)})`,
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
          methodology: `Based on ${periodLabel} shipment data. Top carrier has ${topCarrierPercent.toFixed(0)}% of volume out of ${concentrationData.carrier_count} carriers used.`,
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
        const carrierNames = costIncreases.map((c: CarrierCostChange) => c.carrier_name).slice(0, 3).join(', ');
        alerts.push({
          id: 'carrier_cost_up_multiple',
          type: 'carrier_cost_up',
          severity: avgIncrease > 15 ? 'critical' : 'warning',
          title: 'Carrier Rate Increases',
          description: `${costIncreases.length} carriers up avg ${avgIncrease.toFixed(0)}%`,
          metric: costIncreases.map((c: CarrierCostChange) => c.carrier_name).slice(0, 2).join(', '),
          change: avgIncrease,
          methodology: `Comparing avg shipment cost for ${periodLabel} vs ${prevPeriodLabel}. Affected carriers: ${carrierNames}${costIncreases.length > 3 ? ` and ${costIncreases.length - 3} more` : ''}.`,
          investigateQuery: 'Which carriers are increasing their rates and why?'
        });
      }
    }
  } catch (err) {
    console.error('Error detecting alerts:', err);
  }

  return alerts;
}

const MAX_VISIBLE_ALERTS = 3;

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-3 h-3" />;
  if (value < 0) return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

function getTrendColor(value: number, inverse = false): string {
  if (value === 0) return 'text-slate-400';
  const isPositive = inverse ? value < 0 : value > 0;
  return isPositive ? 'text-emerald-400' : 'text-rose-400';
}

function AlertBadge({ 
  alert, 
  onInvestigate,
  onAcknowledge,
  onDismiss,
}: { 
  alert: Alert; 
  onInvestigate: (query: string) => void;
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  const [showMethodology, setShowMethodology] = useState(false);
  
  const bgColor = {
    critical: 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15',
    warning: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15',
    info: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15',
    success: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15',
  }[alert.severity];

  const iconColor = {
    critical: 'text-rose-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
    success: 'text-emerald-400',
  }[alert.severity];

  const changeColor = alert.change
    ? (alert.change > 0 ? 'text-rose-400' : 'text-emerald-400')
    : '';

  return (
    <div className={`rounded-lg border ${bgColor} p-3 transition-colors`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <TrendingUp className={`w-4 h-4 ${iconColor} flex-shrink-0 mt-0.5`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white text-sm">{alert.title}</span>
              {alert.methodology && (
                <button 
                  onClick={() => setShowMethodology(!showMethodology)}
                  className="text-slate-500 hover:text-slate-300"
                  title="How was this calculated?"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              )}
              {alert.change !== undefined && (
                <span className={`text-xs font-medium flex items-center gap-0.5 ${changeColor}`}>
                  {alert.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {alert.change > 0 ? '+' : ''}{alert.change.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{alert.description}</p>
            {showMethodology && alert.methodology && (
              <p className="text-xs text-slate-500 mt-2 italic border-t border-slate-700/50 pt-2">
                {alert.methodology}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onInvestigate(alert.investigateQuery)}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap flex items-center gap-1 px-2 py-1 rounded hover:bg-amber-500/10 transition-colors"
          >
            Investigate
            <ArrowRight className="w-3 h-3" />
          </button>
          {alert.isFromDatabase && onAcknowledge && onDismiss && (
            <>
              <button
                onClick={() => onAcknowledge(alert.databaseId!)}
                className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                title="Acknowledge"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDismiss(alert.databaseId!)}
                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function UnifiedInsightsCard({ customerId, isAdmin, dateRange, className = '' }: UnifiedInsightsCardProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [insightsData, setInsightsData] = useState<InsightsResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDate = dateRange.start.toISOString().split('T')[0];
  const endDate = dateRange.end.toISOString().split('T')[0];

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch period-based alerts
      const detectedAlerts = await detectAlerts(customerId, startDate, endDate);
      
      // Fetch database anomalies (proactive detection)
      const databaseAnomalies = await fetchDatabaseAnomalies(customerId);
      
      // Merge and deduplicate (prefer database anomalies as they're more specific)
      const mergedAlerts = [...detectedAlerts];
      for (const dbAnomaly of databaseAnomalies) {
        // Don't add if we already have a similar type from period comparison
        const hasOverlap = detectedAlerts.some(a => 
          a.type === dbAnomaly.type || 
          (a.type.includes('spend') && dbAnomaly.type.includes('spend')) ||
          (a.type.includes('volume') && dbAnomaly.type.includes('volume'))
        );
        if (!hasOverlap) {
          mergedAlerts.push(dbAnomaly);
        }
      }
      
      // Sort by severity (critical first, then warning, then info)
      const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
      mergedAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      
      setAlerts(mergedAlerts);

      // Fetch metrics for insights
      const { data: metrics } = await supabase.rpc('get_pulse_executive_metrics', {
        p_customer_id: String(customerId),
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (metrics) {
        const current: Metrics = {
          totalSpend: metrics.current_spend || 0,
          shipmentCount: metrics.current_volume || 0,
          avgCostPerShipment: metrics.current_avg_cost || 0,
          topMode: metrics.top_mode || 'N/A',
          topModePercent: metrics.top_mode_percent || 0,
          topDestinationState: metrics.top_destination || '',
        };

        const changes: Changes = {
          spendChange: Math.round(metrics.spend_change_percent || 0),
          volumeChange: Math.round(metrics.volume_change_percent || 0),
          avgCostChange: Math.round(metrics.avg_cost_change_percent || 0),
        };

        // Generate insights text
        let insightsText = '';
        if (changes.volumeChange > 20) {
          insightsText = `Freight operations experienced significant growth with volume up ${changes.volumeChange}%`;
        } else if (changes.volumeChange < -20) {
          insightsText = `Shipping volume declined ${Math.abs(changes.volumeChange)}% compared to prior period`;
        } else {
          insightsText = `Operations remained stable with ${current.shipmentCount.toLocaleString()} shipments`;
        }

        if (changes.avgCostChange < -5) {
          insightsText += `, while achieving cost efficiency with a ${Math.abs(changes.avgCostChange)}% reduction in average cost per shipment to ${formatCurrency(current.avgCostPerShipment)}.`;
        } else if (changes.avgCostChange > 10) {
          insightsText += `. Average cost per shipment increased ${changes.avgCostChange}% to ${formatCurrency(current.avgCostPerShipment)}, warranting rate review.`;
        } else {
          insightsText += ` at an average of ${formatCurrency(current.avgCostPerShipment)} per shipment.`;
        }

        if (current.topMode && current.topModePercent > 80) {
          insightsText += ` ${current.topMode} handles ${current.topModePercent}% of volume.`;
        }

        setInsightsData({
          insights: insightsText,
          metrics: {
            current,
            previous: current, // We don't have previous separately
            changes,
          },
          generatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError('Unable to load insights');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, startDate, endDate]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleRefresh = () => {
    fetchInsights();
  };

  const handleInvestigate = (query: string) => {
    navigate(`/ai-studio?query=${encodeURIComponent(query)}`);
  };

  const handleAcknowledge = async (anomalyId: string) => {
    try {
      await supabase
        .from('detected_anomalies')
        .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
        .eq('id', anomalyId);
      
      // Remove from local state
      setAlerts(prev => prev.filter(a => a.databaseId !== anomalyId));
    } catch (err) {
      console.error('Failed to acknowledge anomaly:', err);
    }
  };

  const handleDismiss = async (anomalyId: string) => {
    try {
      await supabase
        .from('detected_anomalies')
        .update({ status: 'dismissed' })
        .eq('id', anomalyId);
      
      // Remove from local state
      setAlerts(prev => prev.filter(a => a.databaseId !== anomalyId));
    } catch (err) {
      console.error('Failed to dismiss anomaly:', err);
    }
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
              <p className="text-sm text-slate-400">AI-powered analytics</p>
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-slate-300">Attention Needed</span>
              {alerts.length > MAX_VISIBLE_ALERTS && (
                <span className="text-xs text-slate-500">
                  ({alertsExpanded ? alerts.length : MAX_VISIBLE_ALERTS} of {alerts.length})
                </span>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            {(alertsExpanded ? alerts : alerts.slice(0, MAX_VISIBLE_ALERTS)).map((alert) => (
              <AlertBadge 
                key={alert.id} 
                alert={alert} 
                onInvestigate={handleInvestigate}
                onAcknowledge={alert.isFromDatabase ? handleAcknowledge : undefined}
                onDismiss={alert.isFromDatabase ? handleDismiss : undefined}
              />
            ))}
          </div>
          {alerts.length > MAX_VISIBLE_ALERTS && !alertsExpanded && (
            <button
              onClick={() => setAlertsExpanded(true)}
              className="w-full mt-3 py-2 text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center justify-center gap-1 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              See all {alerts.length} insights
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          {alertsExpanded && alerts.length > MAX_VISIBLE_ALERTS && (
            <button
              onClick={() => setAlertsExpanded(false)}
              className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-300 font-medium flex items-center justify-center gap-1 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              Show less
              <ChevronDown className="w-4 h-4 rotate-180" />
            </button>
          )}
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
