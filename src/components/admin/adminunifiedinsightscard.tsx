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
  Users,
  Truck,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Info,
  ChevronDown,
  Check,
  X,
  Play,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminUnifiedInsightsCardProps {
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  onCustomerClick?: (customerId: number) => void;
  className?: string;
}

interface AdminMetrics {
  totalSpend: number;
  totalShipments: number;
  activeCustomers: number;
  avgCostPerShipment: number;
  topCarrier: string;
  topCarrierPercent: number;
}

interface AdminChanges {
  spendChange: number;
  volumeChange: number;
  customerChange: number;
  avgCostChange: number;
}

interface AdminAlert {
  id: string;
  customerId: number;
  customerName: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  change?: number;
  investigateQuery: string;
  isFromDatabase: boolean;
  databaseId?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

// Get customer-friendly investigate query
function getInvestigateQuery(anomalyType: string, customerName: string): string {
  const queries: Record<string, string> = {
    'spend_spike': `What is driving ${customerName}'s spending increase?`,
    'spend_drop': `Why has ${customerName}'s shipping spend decreased?`,
    'volume_spike': `What is causing ${customerName}'s volume increase?`,
    'volume_drop': `Why has ${customerName}'s shipment volume dropped?`,
    'concentration_risk': `Show ${customerName}'s carrier diversity`,
    'new_lane': `What new lanes is ${customerName} shipping to?`,
  };
  return queries[anomalyType] || `Analyze ${customerName}'s shipping patterns`;
}

const MAX_VISIBLE_ALERTS = 5;

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

function AdminAlertBadge({ 
  alert, 
  onInvestigate,
  onViewCustomer,
  onAcknowledge,
  onDismiss,
}: { 
  alert: AdminAlert; 
  onInvestigate: (query: string, customerId: number) => void;
  onViewCustomer: (customerId: number) => void;
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  const bgColor = {
    critical: 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15',
    warning: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15',
    info: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15',
  }[alert.severity];

  const iconColor = {
    critical: 'text-rose-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
  }[alert.severity];

  const changeColor = alert.change
    ? (alert.change > 0 ? 'text-rose-400' : 'text-emerald-400')
    : '';

  return (
    <div className={`rounded-lg border ${bgColor} p-3 transition-colors`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <AlertTriangle className={`w-4 h-4 ${iconColor} flex-shrink-0 mt-0.5`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onViewCustomer(alert.customerId)}
                className="font-medium text-amber-400 hover:text-amber-300 text-sm"
              >
                {alert.customerName}
              </button>
              <span className="text-slate-500">•</span>
              <span className="font-medium text-white text-sm">{alert.title}</span>
              {alert.change !== undefined && (
                <span className={`text-xs font-medium flex items-center gap-0.5 ${changeColor}`}>
                  {alert.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {alert.change > 0 ? '+' : ''}{alert.change.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{alert.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onInvestigate(alert.investigateQuery, alert.customerId)}
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

export function AdminUnifiedInsightsCard({
  dateRange,
  onCustomerClick,
  className = ''
}: AdminUnifiedInsightsCardProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [changes, setChanges] = useState<AdminChanges | null>(null);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [insightsText, setInsightsText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const formatDateSafe = (date: Date | undefined | null): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  };

  const startDate = formatDateSafe(dateRange?.start);
  const endDate = formatDateSafe(dateRange?.end);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch admin-wide metrics
      const { data: adminMetrics, error: metricsError } = await supabase.rpc('get_admin_metrics', {
        p_start_date: startDate,
        p_end_date: endDate
      }).maybeSingle();

      if (metricsError) {
        console.error('Admin metrics error:', metricsError);
        // Use fallback query
        const { data: fallbackData } = await supabase
          .from('shipment')
          .select('retail, customer_id')
          .gte('pickup_date', startDate)
          .lte('pickup_date', endDate);

        if (fallbackData) {
          const totalSpend = fallbackData.reduce((sum, s) => sum + (s.retail || 0), 0);
          const uniqueCustomers = new Set(fallbackData.map(s => s.customer_id)).size;
          
          setMetrics({
            totalSpend,
            totalShipments: fallbackData.length,
            activeCustomers: uniqueCustomers,
            avgCostPerShipment: fallbackData.length > 0 ? totalSpend / fallbackData.length : 0,
            topCarrier: 'N/A',
            topCarrierPercent: 0,
          });
          
          setChanges({
            spendChange: 0,
            volumeChange: 0,
            customerChange: 0,
            avgCostChange: 0,
          });
        }
      } else if (adminMetrics) {
        setMetrics({
          totalSpend: adminMetrics.total_spend || 0,
          totalShipments: adminMetrics.total_shipments || 0,
          activeCustomers: adminMetrics.active_customers || 0,
          avgCostPerShipment: adminMetrics.avg_cost_per_shipment || 0,
          topCarrier: adminMetrics.top_carrier || 'N/A',
          topCarrierPercent: adminMetrics.top_carrier_percent || 0,
        });

        setChanges({
          spendChange: Math.round(adminMetrics.spend_change_percent || 0),
          volumeChange: Math.round(adminMetrics.volume_change_percent || 0),
          customerChange: Math.round(adminMetrics.customer_change_percent || 0),
          avgCostChange: Math.round(adminMetrics.avg_cost_change_percent || 0),
        });
      }

      // Fetch anomalies from all customers
      const { data: anomalyData } = await supabase.rpc('get_admin_anomaly_summary');

      let adminAlerts: AdminAlert[] = [];
      if (anomalyData && anomalyData.recent_critical) {
        adminAlerts = anomalyData.recent_critical.map((a: any) => ({
          id: `db_${a.id}`,
          customerId: a.customer_id,
          customerName: a.customer_name || `Customer ${a.customer_id}`,
          type: a.type,
          severity: a.severity as 'info' | 'warning' | 'critical',
          title: a.title,
          description: a.description,
          change: a.change_percent,
          investigateQuery: getInvestigateQuery(a.type, a.customer_name || `Customer ${a.customer_id}`),
          isFromDatabase: true,
          databaseId: a.id,
        }));

        // Sort by severity
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        adminAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      }
      
      setAlerts(adminAlerts);

      // Generate AI-style insights narrative
      const generateInsightsNarrative = (
        m: AdminMetrics, 
        c: AdminChanges, 
        alertList: AdminAlert[]
      ): string => {
        const parts: string[] = [];
        
        // Opening with key metrics
        parts.push(`Across your ${m.activeCustomers} active customers, operations processed ${formatNumber(m.totalShipments)} shipments totaling ${formatCurrency(m.totalSpend)} in freight spend`);
        
        // Volume trend
        if (Math.abs(c.volumeChange) > 5) {
          if (c.volumeChange > 20) {
            parts[0] += `, with volume surging ${c.volumeChange}% compared to the prior period`;
          } else if (c.volumeChange > 0) {
            parts[0] += `, up ${c.volumeChange}% from the prior period`;
          } else if (c.volumeChange < -20) {
            parts[0] += `, with volume declining ${Math.abs(c.volumeChange)}%`;
          } else {
            parts[0] += `, down ${Math.abs(c.volumeChange)}% from prior period`;
          }
        }
        parts[0] += '.';
        
        // Cost efficiency insight
        if (c.avgCostChange < -5) {
          parts.push(`Average cost per shipment improved ${Math.abs(c.avgCostChange)}% to ${formatCurrency(m.avgCostPerShipment)}, indicating better rate optimization across the portfolio.`);
        } else if (c.avgCostChange > 10) {
          parts.push(`Average shipment cost increased ${c.avgCostChange}% to ${formatCurrency(m.avgCostPerShipment)}, which may warrant a carrier rate review.`);
        }
        
        // Top carrier insight
        if (m.topCarrier && m.topCarrier !== 'N/A' && m.topCarrierPercent > 0) {
          if (m.topCarrierPercent > 40) {
            parts.push(`${m.topCarrier} handles ${m.topCarrierPercent}% of total volume across customers.`);
          }
        }
        
        // Anomaly summary
        const criticalCount = alertList.filter(a => a.severity === 'critical').length;
        const warningCount = alertList.filter(a => a.severity === 'warning').length;
        const affectedCustomers = new Set(alertList.map(a => a.customerId)).size;
        
        if (criticalCount > 0 || warningCount > 0) {
          let anomalyText = '';
          if (criticalCount > 0 && warningCount > 0) {
            anomalyText = `${criticalCount} critical and ${warningCount} warning anomalies detected across ${affectedCustomers} customer${affectedCustomers > 1 ? 's' : ''} requiring attention.`;
          } else if (criticalCount > 0) {
            anomalyText = `${criticalCount} critical anomal${criticalCount > 1 ? 'ies' : 'y'} detected across ${affectedCustomers} customer${affectedCustomers > 1 ? 's' : ''} — immediate review recommended.`;
          } else {
            anomalyText = `${warningCount} warning${warningCount > 1 ? 's' : ''} flagged across ${affectedCustomers} customer${affectedCustomers > 1 ? 's' : ''} for your review.`;
          }
          parts.push(anomalyText);
        } else {
          parts.push('No anomalies detected — all customers are operating within normal parameters.');
        }
        
        return parts.join(' ');
      };

      // Set metrics first so we can use them
      const m: AdminMetrics = metrics || {
        totalSpend: adminMetrics?.total_spend || 0,
        totalShipments: adminMetrics?.total_shipments || 0,
        activeCustomers: adminMetrics?.active_customers || 0,
        avgCostPerShipment: adminMetrics?.avg_cost_per_shipment || 0,
        topCarrier: adminMetrics?.top_carrier || 'N/A',
        topCarrierPercent: adminMetrics?.top_carrier_percent || 0,
      };
      
      const c: AdminChanges = changes || {
        spendChange: Math.round(adminMetrics?.spend_change_percent || 0),
        volumeChange: Math.round(adminMetrics?.volume_change_percent || 0),
        customerChange: Math.round(adminMetrics?.customer_change_percent || 0),
        avgCostChange: Math.round(adminMetrics?.avg_cost_change_percent || 0),
      };

      if (!metrics) setMetrics(m);
      if (!changes) setChanges(c);
      
      // Generate the narrative using the fetched alerts
      setInsightsText(generateInsightsNarrative(m, c, adminAlerts));

    } catch (err) {
      console.error('Error fetching admin insights:', err);
      setError('Unable to load insights');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-anomaly-detection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ force: true }),
        }
      );
      
      if (response.ok) {
        // Refresh data after scan
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to run scan:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleInvestigate = (query: string, customerId: number) => {
    // Switch to customer context and navigate to AI Studio
    if (onCustomerClick) {
      onCustomerClick(customerId);
    }
    navigate(`/ai-studio?query=${encodeURIComponent(query)}`);
  };

  const handleViewCustomer = (customerId: number) => {
    if (onCustomerClick) {
      onCustomerClick(customerId);
    }
  };

  const handleAcknowledge = async (anomalyId: string) => {
    try {
      await supabase
        .from('detected_anomalies')
        .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
        .eq('id', anomalyId);
      
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
            <p className="text-sm text-slate-400">Analyzing all customer data...</p>
          </div>
        </div>
        <div className="space-y-3 mb-6">
          <div className="h-4 bg-slate-700/50 rounded animate-pulse w-full" />
          <div className="h-4 bg-slate-700/50 rounded animate-pulse w-5/6" />
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

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const customersAffected = new Set(alerts.map(a => a.customerId)).size;

  return (
    <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold">AI Insights</h3>
            <p className="text-sm text-slate-400">Cross-customer analytics powered by Claude</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 rounded-lg text-teal-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${isScanning ? 'animate-pulse' : ''}`} />
            {isScanning ? 'Scanning...' : 'Scan'}
          </button>
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

      {/* AI Narrative Summary */}
      <p className="text-base leading-relaxed text-slate-200 mb-5">{insightsText}</p>

      {/* Business Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Total Spend</span>
          </div>
          <p className="text-lg font-bold">{metrics ? formatCurrency(metrics.totalSpend) : '$0'}</p>
          {changes && changes.spendChange !== 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <TrendIcon value={-changes.spendChange} />
              <span className={`text-xs font-medium ${getTrendColor(changes.spendChange, true)}`}>
                {changes.spendChange > 0 ? '+' : ''}{changes.spendChange}%
              </span>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Shipments</span>
          </div>
          <p className="text-lg font-bold">{metrics ? formatNumber(metrics.totalShipments) : '0'}</p>
          {changes && changes.volumeChange !== 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <TrendIcon value={changes.volumeChange} />
              <span className={`text-xs font-medium ${getTrendColor(changes.volumeChange)}`}>
                {changes.volumeChange > 0 ? '+' : ''}{changes.volumeChange}%
              </span>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Customers</span>
          </div>
          <p className="text-lg font-bold">{metrics?.activeCustomers || 0}</p>
          {changes && changes.customerChange !== 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <TrendIcon value={changes.customerChange} />
              <span className={`text-xs font-medium ${getTrendColor(changes.customerChange)}`}>
                {changes.customerChange > 0 ? '+' : ''}{changes.customerChange}%
              </span>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Avg Cost</span>
          </div>
          <p className="text-lg font-bold">{metrics ? formatCurrency(metrics.avgCostPerShipment) : '$0'}</p>
          {changes && changes.avgCostChange !== 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <TrendIcon value={-changes.avgCostChange} />
              <span className={`text-xs font-medium ${getTrendColor(changes.avgCostChange, true)}`}>
                {changes.avgCostChange > 0 ? '+' : ''}{changes.avgCostChange}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Anomaly Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Total New</span>
          </div>
          <p className="text-lg font-bold">{alerts.length}</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Critical</span>
          </div>
          <p className="text-lg font-bold text-rose-400">{criticalCount}</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Warnings</span>
          </div>
          <p className="text-lg font-bold text-amber-400">{warningCount}</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Customers</span>
          </div>
          <p className="text-lg font-bold">{customersAffected}</p>
        </div>
      </div>

      {/* Alerts section */}
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
              <AdminAlertBadge 
                key={alert.id} 
                alert={alert} 
                onInvestigate={handleInvestigate}
                onViewCustomer={handleViewCustomer}
                onAcknowledge={handleAcknowledge}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
          {alerts.length > MAX_VISIBLE_ALERTS && !alertsExpanded && (
            <button
              onClick={() => setAlertsExpanded(true)}
              className="w-full mt-3 py-2 text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center justify-center gap-1 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              See all {alerts.length} anomalies
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
            <span className="text-sm font-medium">All Clear - No anomalies detected across customers</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Click "Scan" to run anomaly detection on all customers
          </p>
        </div>
      )}
    </div>
  );
}
