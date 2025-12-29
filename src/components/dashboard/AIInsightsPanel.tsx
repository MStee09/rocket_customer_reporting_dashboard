import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MapPin,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Loader2,
  DollarSign,
  Truck,
  Clock,
  Package,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format, subMonths } from 'date-fns';
import {
  useDashboardStats,
  useMonthlyTrend,
  useCarrierMix,
  useTopLanes,
  useCostPerStateData,
  usePerformanceMetrics,
  type StateData,
  type CarrierData,
  type LaneData,
  type MonthlyDataPoint,
} from '../../hooks/useDashboardData';

interface FreightInsight {
  id: string;
  type: 'cost' | 'carrier' | 'regional' | 'volume' | 'service' | 'optimization';
  severity: 'info' | 'warning' | 'opportunity';
  title: string;
  description: string;
  metric?: { label: string; value: string };
  action?: { label: string; href?: string };
}

interface AIInsightsPanelProps {
  className?: string;
}

export function AIInsightsPanel({ className = '' }: AIInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { effectiveCustomerId, effectiveCustomerIds, isViewingAsCustomer, isAdmin } = useAuth();

  const shouldShow = effectiveCustomerId || (isAdmin() && !isViewingAsCustomer);

  const now = new Date();
  const startDate = format(subMonths(now, 6), 'yyyy-MM-dd');
  const endDate = format(now, 'yyyy-MM-dd');

  const customerIds = effectiveCustomerIds.length > 0 ? effectiveCustomerIds : [];

  const { stats, isLoading: statsLoading } = useDashboardStats(
    customerIds,
    isAdmin(),
    isViewingAsCustomer,
    startDate,
    endDate
  );

  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyTrend(
    customerIds,
    isAdmin(),
    isViewingAsCustomer,
    startDate,
    endDate
  );

  const { data: carrierData, isLoading: carrierLoading } = useCarrierMix(
    customerIds,
    isAdmin(),
    isViewingAsCustomer,
    startDate,
    endDate
  );

  const { data: stateData, isLoading: stateLoading } = useCostPerStateData(
    customerIds,
    isAdmin(),
    isViewingAsCustomer,
    startDate,
    endDate
  );

  const { data: laneData, isLoading: laneLoading } = useTopLanes(
    customerIds,
    isAdmin(),
    isViewingAsCustomer,
    startDate,
    endDate
  );

  const { data: perfData, isLoading: perfLoading } = usePerformanceMetrics(
    customerIds,
    isAdmin(),
    isViewingAsCustomer,
    startDate,
    endDate
  );

  const isLoading = statsLoading || monthlyLoading || carrierLoading || stateLoading || laneLoading || perfLoading;

  const insights = useMemo(() => {
    if (isLoading || !stats) return [];

    const generatedInsights: FreightInsight[] = [];

    generateCostInsights(generatedInsights, stateData, stats);
    generateCarrierInsights(generatedInsights, carrierData, stats);
    generateRegionalInsights(generatedInsights, stateData, laneData);
    generateVolumeInsights(generatedInsights, monthlyData, stats);
    generateServiceInsights(generatedInsights, perfData);
    generateOptimizationInsights(generatedInsights, laneData, carrierData, stats);

    return generatedInsights.slice(0, 6);
  }, [isLoading, stats, stateData, carrierData, monthlyData, laneData, perfData]);

  useEffect(() => {
    if (!isLoading && insights.length > 0 && !lastRefresh) {
      setLastRefresh(new Date());
    }
  }, [isLoading, insights.length]);

  const handleRefresh = () => {
    setLastRefresh(new Date());
  };

  const getInsightIcon = (type: FreightInsight['type']) => {
    switch (type) {
      case 'cost':
        return <DollarSign className="w-4 h-4" />;
      case 'carrier':
        return <Truck className="w-4 h-4" />;
      case 'regional':
        return <MapPin className="w-4 h-4" />;
      case 'volume':
        return <Package className="w-4 h-4" />;
      case 'service':
        return <Clock className="w-4 h-4" />;
      case 'optimization':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getInsightColor = (severity: FreightInsight['severity']) => {
    switch (severity) {
      case 'warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'opportunity':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  if (!shouldShow) return null;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-slate-900 to-slate-800 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform ${className}`}
      >
        <Sparkles className="w-6 h-6 text-amber-400" />
        {insights.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full text-xs font-bold text-slate-900 flex items-center justify-center">
            {insights.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl text-white transition-all duration-300 ${
        isExpanded ? 'w-96 max-h-[70vh]' : 'w-80'
      } ${className}`}
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer border-b border-slate-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Freight Insights</h3>
            <p className="text-xs text-slate-400">
              {isLoading ? 'Analyzing...' : `${insights.length} insights found`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            disabled={isLoading}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh insights"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            title="Minimize"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
          <div className="p-1.5">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
          {stats && (
            <div className="p-4 border-b border-slate-700/50">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                Quick Summary
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{stats.totalShipments.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Shipments</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">
                    ${stats.avgCostPerShipment >= 1000
                      ? `${(stats.avgCostPerShipment / 1000).toFixed(1)}K`
                      : stats.avgCostPerShipment.toFixed(0)}
                  </p>
                  <p className="text-xs text-slate-400">Avg Cost</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{stateData.length}</p>
                  <p className="text-xs text-slate-400">States</p>
                </div>
              </div>
            </div>
          )}

          {insights.length > 0 && (
            <div className="p-4">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                Key Insights
              </h4>
              <div className="space-y-2">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-3 rounded-lg border ${getInsightColor(insight.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white">{insight.title}</p>
                        <p className="text-xs text-slate-300 mt-1">{insight.description}</p>
                        {insight.metric && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-700/50 text-xs">
                              {insight.metric.label}: <span className="font-medium ml-1">{insight.metric.value}</span>
                            </span>
                          </div>
                        )}
                        {insight.action && (
                          <a
                            href={insight.action.href || '/ai-studio'}
                            className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            {insight.action.label}
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && insights.length === 0 && (
            <div className="p-6 text-center">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                Not enough data for insights yet.
              </p>
            </div>
          )}
        </div>
      )}

      {!isExpanded && insights.length > 0 && (
        <div className="p-3">
          <div className={`p-2 rounded-lg ${getInsightColor(insights[0].severity)} text-xs`}>
            <div className="flex items-center gap-2">
              {getInsightIcon(insights[0].type)}
              <span className="truncate">{insights[0].title}</span>
            </div>
          </div>
          {insights.length > 1 && (
            <p className="text-xs text-slate-400 mt-2 text-center">
              +{insights.length - 1} more insights
            </p>
          )}
        </div>
      )}

      {lastRefresh && (
        <div className="px-4 py-2 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 text-center">
            Updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

function generateCostInsights(
  insights: FreightInsight[],
  stateData: StateData[],
  stats: { avgCostPerShipment: number; totalCost: number }
) {
  if (stateData.length === 0) return;

  const networkAvg = stats.avgCostPerShipment;
  const highCostStates = stateData
    .filter(s => s.avgCost > networkAvg * 1.25 && s.shipmentCount >= 3)
    .sort((a, b) => b.avgCost - a.avgCost);

  if (highCostStates.length > 0) {
    const top = highCostStates[0];
    const aboveAvgPct = Math.round(((top.avgCost - networkAvg) / networkAvg) * 100);

    insights.push({
      id: 'cost-anomaly-state',
      type: 'cost',
      severity: aboveAvgPct > 40 ? 'warning' : 'info',
      title: `${top.stateCode} costs ${aboveAvgPct}% above average`,
      description: `Shipments to ${top.stateCode} averaging $${Math.round(top.avgCost)}, compared to network average of $${Math.round(networkAvg)}.`,
      metric: { label: 'Shipments', value: top.shipmentCount.toString() },
      action: { label: 'View state details', href: '/reports' },
    });
  }

  const outlierStates = stateData.filter(s => s.isOutlier);
  if (outlierStates.length > 1) {
    insights.push({
      id: 'cost-outliers',
      type: 'cost',
      severity: 'warning',
      title: `${outlierStates.length} states with cost outliers`,
      description: `${outlierStates.map(s => s.stateCode).join(', ')} have significantly higher shipping costs than typical.`,
      action: { label: 'Analyze costs', href: '/ai-studio?q=why are costs high' },
    });
  }
}

function generateCarrierInsights(
  insights: FreightInsight[],
  carrierData: CarrierData[],
  stats: { totalShipments: number }
) {
  if (carrierData.length < 2) return;

  const totalVolume = carrierData.reduce((sum, c) => sum + c.value, 0);
  const topCarrier = carrierData[0];
  const topCarrierPct = Math.round((topCarrier.value / totalVolume) * 100);

  if (topCarrierPct > 50) {
    insights.push({
      id: 'carrier-concentration',
      type: 'carrier',
      severity: 'info',
      title: `${topCarrierPct}% of volume with ${topCarrier.name}`,
      description: `Heavy reliance on a single carrier. Consider diversifying to reduce risk and improve negotiating leverage.`,
      metric: { label: 'Shipments', value: topCarrier.value.toLocaleString() },
      action: { label: 'Compare carriers', href: '/carriers' },
    });
  }

  if (carrierData.length >= 3) {
    const secondCarrier = carrierData[1];
    const thirdCarrier = carrierData[2];

    if (secondCarrier.value > 10 && thirdCarrier.value > 10) {
      insights.push({
        id: 'carrier-mix',
        type: 'carrier',
        severity: 'info',
        title: `Using ${carrierData.length} carriers`,
        description: `Top 3: ${topCarrier.name} (${topCarrier.value}), ${secondCarrier.name} (${secondCarrier.value}), ${thirdCarrier.name} (${thirdCarrier.value}).`,
        action: { label: 'View carrier performance', href: '/carriers' },
      });
    }
  }
}

function generateRegionalInsights(
  insights: FreightInsight[],
  stateData: StateData[],
  laneData: LaneData[]
) {
  if (stateData.length < 5) return;

  const westCoastStates = ['CA', 'OR', 'WA'];
  const eastCoastStates = ['NY', 'NJ', 'PA', 'MA', 'FL', 'GA'];
  const midwestStates = ['IL', 'OH', 'MI', 'IN', 'WI', 'MN'];

  const calcRegionAvg = (states: string[]) => {
    const regionStates = stateData.filter(s => states.includes(s.stateCode));
    if (regionStates.length === 0) return null;
    const totalCost = regionStates.reduce((sum, s) => sum + s.avgCost * s.shipmentCount, 0);
    const totalShipments = regionStates.reduce((sum, s) => sum + s.shipmentCount, 0);
    return totalShipments > 0 ? totalCost / totalShipments : null;
  };

  const westAvg = calcRegionAvg(westCoastStates);
  const eastAvg = calcRegionAvg(eastCoastStates);
  const midwestAvg = calcRegionAvg(midwestStates);

  if (westAvg && eastAvg) {
    const diff = Math.abs(westAvg - eastAvg);
    if (diff > 50) {
      const higher = westAvg > eastAvg ? 'West Coast' : 'East Coast';
      const lower = westAvg > eastAvg ? 'East Coast' : 'West Coast';
      insights.push({
        id: 'regional-cost-diff',
        type: 'regional',
        severity: 'info',
        title: `${higher} costs $${Math.round(diff)} more`,
        description: `${higher} shipments average $${Math.round(Math.max(westAvg, eastAvg))} vs $${Math.round(Math.min(westAvg, eastAvg))} for ${lower}.`,
        action: { label: 'View regional breakdown', href: '/reports' },
      });
    }
  }

  if (laneData.length > 0) {
    const topLane = laneData[0];
    if (topLane.shipmentCount >= 10) {
      insights.push({
        id: 'top-lane',
        type: 'regional',
        severity: 'info',
        title: `${topLane.origin} to ${topLane.destination} is your top lane`,
        description: `${topLane.shipmentCount} shipments at $${Math.round(topLane.avgCost)} average cost.`,
        metric: { label: 'Total spend', value: `$${Math.round(topLane.totalCost).toLocaleString()}` },
      });
    }
  }
}

function generateVolumeInsights(
  insights: FreightInsight[],
  monthlyData: MonthlyDataPoint[],
  stats: { totalShipments: number }
) {
  if (monthlyData.length < 2) return;

  const lastMonth = monthlyData[monthlyData.length - 1];
  const prevMonth = monthlyData[monthlyData.length - 2];

  if (lastMonth && prevMonth && prevMonth.shipmentCount > 0) {
    const volumeChange = ((lastMonth.shipmentCount - prevMonth.shipmentCount) / prevMonth.shipmentCount) * 100;
    const costChange = ((lastMonth.totalCost - prevMonth.totalCost) / prevMonth.totalCost) * 100;

    if (Math.abs(volumeChange) >= 10) {
      const direction = volumeChange > 0 ? 'up' : 'down';
      const icon = volumeChange > 0 ? TrendingUp : TrendingDown;

      insights.push({
        id: 'volume-trend',
        type: 'volume',
        severity: volumeChange < -20 ? 'warning' : 'info',
        title: `Volume ${direction} ${Math.abs(Math.round(volumeChange))}% vs last month`,
        description: `${lastMonth.shipmentCount.toLocaleString()} shipments this month compared to ${prevMonth.shipmentCount.toLocaleString()} last month.`,
        metric: { label: 'Spend change', value: `${costChange >= 0 ? '+' : ''}${Math.round(costChange)}%` },
      });
    }
  }

  if (monthlyData.length >= 3) {
    const recentMonths = monthlyData.slice(-3);
    const avgMonthlyVolume = recentMonths.reduce((sum, m) => sum + m.shipmentCount, 0) / 3;
    const avgMonthlyCost = recentMonths.reduce((sum, m) => sum + m.totalCost, 0) / 3;

    if (avgMonthlyVolume > 50) {
      insights.push({
        id: 'avg-monthly',
        type: 'volume',
        severity: 'info',
        title: `Averaging ${Math.round(avgMonthlyVolume)} shipments/month`,
        description: `Monthly spend averaging $${avgMonthlyCost >= 1000 ? `${(avgMonthlyCost / 1000).toFixed(0)}K` : avgMonthlyCost.toFixed(0)} over the last 3 months.`,
      });
    }
  }
}

function generateServiceInsights(
  insights: FreightInsight[],
  perfData: { onTimePercentage?: number; avgTransitDays?: number }
) {
  if (perfData.onTimePercentage !== undefined) {
    if (perfData.onTimePercentage < 90) {
      insights.push({
        id: 'on-time-warning',
        type: 'service',
        severity: 'warning',
        title: `On-time delivery at ${perfData.onTimePercentage.toFixed(0)}%`,
        description: `Below 90% on-time rate may indicate carrier performance issues or transit time estimation problems.`,
        action: { label: 'Review delays', href: '/shipments?filter=delayed' },
      });
    } else if (perfData.onTimePercentage >= 95) {
      insights.push({
        id: 'on-time-good',
        type: 'service',
        severity: 'opportunity',
        title: `Excellent ${perfData.onTimePercentage.toFixed(0)}% on-time rate`,
        description: `Strong carrier performance. Consider negotiating better rates based on this track record.`,
      });
    }
  }

  if (perfData.avgTransitDays !== undefined && perfData.avgTransitDays > 5) {
    insights.push({
      id: 'transit-time',
      type: 'service',
      severity: 'info',
      title: `Average transit: ${perfData.avgTransitDays.toFixed(1)} days`,
      description: `Consider expedited options for time-sensitive shipments or review carrier routing.`,
    });
  }
}

function generateOptimizationInsights(
  insights: FreightInsight[],
  laneData: LaneData[],
  carrierData: CarrierData[],
  stats: { totalCost: number; totalShipments: number }
) {
  if (laneData.length < 3 || stats.totalShipments < 20) return;

  const highVolumeLanes = laneData.filter(l => l.shipmentCount >= 5);
  if (highVolumeLanes.length >= 2) {
    const potentialSavings = Math.round(stats.totalCost * 0.03);

    insights.push({
      id: 'consolidation-opportunity',
      type: 'optimization',
      severity: 'opportunity',
      title: 'Consolidation opportunity detected',
      description: `${highVolumeLanes.length} high-volume lanes may benefit from rate negotiations or shipment consolidation.`,
      metric: { label: 'Potential savings', value: `~$${potentialSavings.toLocaleString()}/month` },
      action: { label: 'Explore savings', href: '/ai-studio?q=how can I reduce shipping costs' },
    });
  }

  if (carrierData.length >= 3) {
    const topThreeVolume = carrierData.slice(0, 3).reduce((sum, c) => sum + c.value, 0);
    const totalVolume = carrierData.reduce((sum, c) => sum + c.value, 0);
    const concentrationPct = Math.round((topThreeVolume / totalVolume) * 100);

    if (concentrationPct < 80 && carrierData.length > 5) {
      insights.push({
        id: 'carrier-consolidation',
        type: 'optimization',
        severity: 'opportunity',
        title: 'Carrier consolidation opportunity',
        description: `Volume spread across ${carrierData.length} carriers. Consolidating to fewer carriers could improve rates.`,
        action: { label: 'Analyze carrier mix', href: '/carriers' },
      });
    }
  }
}

export default AIInsightsPanel;
