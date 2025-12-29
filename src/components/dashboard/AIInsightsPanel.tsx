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
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { profileData, generateInsights, generateFollowUps, parseQuery } from '../../services/ai';
import type { AIInsight, FollowUpSuggestion, DataProfile } from '../../types/aiVisualization';

interface AIInsightsPanelProps {
  className?: string;
}

export function AIInsightsPanel({ className = '' }: AIInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpSuggestion[]>([]);
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { effectiveCustomerId, isViewingAsCustomer, isAdmin } = useAuth();

  const shouldShow = effectiveCustomerId || (isAdmin() && !isViewingAsCustomer);

  const fetchDashboardData = async () => {
    if (!shouldShow) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('shipment_report_view')
        .select('*')
        .limit(500);

      if (effectiveCustomerId) {
        query = query.eq('customer_id', effectiveCustomerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const dataProfile = profileData(data);
        setProfile(dataProfile);

        const parsedQuery = parseQuery('analyze shipment costs by state');
        const generatedInsights = generateInsights(data, dataProfile, parsedQuery);
        const generatedFollowUps = generateFollowUps(parsedQuery, dataProfile, generatedInsights);

        setInsights(generatedInsights);
        setFollowUps(generatedFollowUps);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data for insights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shouldShow && !lastRefresh) {
      fetchDashboardData();
    }
  }, [shouldShow]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4" />;
      case 'trend':
        return <TrendingUp className="w-4 h-4" />;
      case 'pattern':
        return <MapPin className="w-4 h-4" />;
      case 'recommendation':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getInsightColor = (severity: AIInsight['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getCategoryIcon = (category: FollowUpSuggestion['category']) => {
    switch (category) {
      case 'drill_down':
        return <ChevronDown className="w-3 h-3" />;
      case 'compare':
        return <TrendingUp className="w-3 h-3" />;
      case 'trend':
        return <TrendingDown className="w-3 h-3" />;
      case 'root_cause':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <ArrowRight className="w-3 h-3" />;
    }
  };

  const summaryStats = useMemo(() => {
    if (!profile) return null;
    return {
      rows: profile.rowCount,
      columns: profile.columns.length,
      hasTrend: profile.patterns.hasTrend,
      trendDirection: profile.patterns.trendDirection,
      hasOutliers: profile.patterns.hasOutliers,
      stateCount: profile.geographicCoverage?.stateCount || 0,
    };
  }, [profile]);

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
            <h3 className="font-semibold text-sm">AI Insights</h3>
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
          {summaryStats && (
            <div className="p-4 border-b border-slate-700/50">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                Data Summary
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{summaryStats.rows.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Records</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{summaryStats.stateCount}</p>
                  <p className="text-xs text-slate-400">States</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {summaryStats.hasTrend ? (
                      summaryStats.trendDirection === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )
                    ) : (
                      <span className="text-lg font-bold text-slate-400">-</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Trend</p>
                </div>
              </div>
            </div>
          )}

          {insights.length > 0 && (
            <div className="p-4 border-b border-slate-700/50">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                Key Insights
              </h4>
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getInsightColor(insight.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white">{insight.title}</p>
                        <p className="text-xs text-slate-300 mt-1">{insight.description}</p>
                        {insight.evidence.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {insight.evidence.slice(0, 2).map((e, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-slate-700/50 text-xs"
                              >
                                {e.metric}: <span className="font-medium ml-1">{e.value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {insight.action && (
                          <button className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                            {insight.action.label}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {followUps.length > 0 && (
            <div className="p-4">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                Suggested Questions
              </h4>
              <div className="space-y-2">
                {followUps.map((followUp, index) => (
                  <a
                    key={index}
                    href={`/ai-studio?q=${encodeURIComponent(followUp.question)}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50 transition-colors group"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-colors">
                      {getCategoryIcon(followUp.category)}
                    </div>
                    <span className="flex-1 text-sm text-slate-300 group-hover:text-white transition-colors">
                      {followUp.question}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {!isLoading && insights.length === 0 && (
            <div className="p-6 text-center">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                No insights available yet.
              </p>
              <button
                onClick={handleRefresh}
                className="mt-3 text-sm text-amber-400 hover:text-amber-300"
              >
                Refresh analysis
              </button>
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

export default AIInsightsPanel;
