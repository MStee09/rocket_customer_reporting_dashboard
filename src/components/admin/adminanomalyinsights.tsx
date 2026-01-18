import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Search,
  Zap,
  Play
} from 'lucide-react';
import { useAdminAnomalies, AdminAnomaly, CustomerAnomalySummary } from '../../hooks/useAdminAnomalies';
import { useAuth } from '../../contexts/AuthContext';

interface AdminAnomalyInsightsProps {
  className?: string;
  onCustomerClick?: (customerId: number) => void;
}

export function AdminAnomalyInsights({ className = '', onCustomerClick }: AdminAnomalyInsightsProps) {
  const navigate = useNavigate();
  const { setViewingAsCustomerId } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const {
    summary,
    loading,
    error,
    refetch,
    acknowledgeAnomaly,
    dismissAnomaly,
    runScan,
    totalNew,
    criticalCount,
    warningCount,
    customersAffected,
    recentCritical,
    anomaliesByCustomer
  } = useAdminAnomalies();

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      await runScan(undefined, true);
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleViewCustomer = (customerId: number) => {
    if (onCustomerClick) {
      onCustomerClick(customerId);
    } else {
      setViewingAsCustomerId(customerId);
    }
  };

  const handleInvestigate = (anomaly: AdminAnomaly) => {
    // First set the customer context, then navigate to AI studio
    setViewingAsCustomerId(anomaly.customer_id);
    const query = `Investigate this anomaly: ${anomaly.title}. ${anomaly.description}`;
    navigate(`/ai-studio?query=${encodeURIComponent(query)}`);
  };

  const SeverityIcon = ({ severity }: { severity: string }) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const severityBg: Record<string, string> = {
    critical: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    info: 'bg-blue-500/10 border-blue-500/30'
  };

  if (loading && !summary) {
    return (
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold">AI Insights</h3>
            <p className="text-sm text-slate-400">Loading anomaly data...</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-700/50 rounded animate-pulse w-full" />
          <div className="h-4 bg-slate-700/50 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-slate-700/50 rounded animate-pulse w-4/6" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold">AI Insights</h3>
              <p className="text-sm text-slate-400">Error loading data</p>
            </div>
          </div>
          <button onClick={refetch} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className="text-slate-400">{error}</p>
      </div>
    );
  }

  const visibleCustomers = showAllCustomers ? anomaliesByCustomer : anomaliesByCustomer.slice(0, 5);

  return (
    <div className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold">AI Insights</h3>
            <p className="text-sm text-slate-400">Anomalies across all customers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium transition-colors disabled:opacity-50"
            title="Run anomaly scan"
          >
            <Play className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Scan'}
          </button>
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Total New</span>
          </div>
          <p className="text-lg font-bold">{totalNew}</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Critical</span>
          </div>
          <p className="text-lg font-bold text-red-400">{criticalCount}</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
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

      {/* Recent Critical Anomalies */}
      {recentCritical.length > 0 && (
        <div className="border-t border-slate-700/50 pt-4 mb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between mb-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-slate-300">Attention Needed</span>
              <span className="text-xs text-slate-500">({recentCritical.length})</span>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expanded && (
            <div className="space-y-2">
              {recentCritical.slice(0, 5).map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-3 rounded-lg border ${severityBg[anomaly.severity] || 'bg-slate-800/50 border-slate-700'}`}
                >
                  <div className="flex items-start gap-2">
                    <SeverityIcon severity={anomaly.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleViewCustomer(anomaly.customer_id)}
                          className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          {anomaly.customer_name}
                        </button>
                        <span className="text-slate-500">•</span>
                        <span className="text-sm text-slate-300">{anomaly.title}</span>
                        {anomaly.change_percent !== null && (
                          <span className={`flex items-center text-xs font-medium ${
                            anomaly.change_percent > 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {anomaly.change_percent > 0 ? (
                              <TrendingUp className="w-3 h-3 mr-0.5" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-0.5" />
                            )}
                            {anomaly.change_percent > 0 ? '+' : ''}{anomaly.change_percent}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{anomaly.description}</p>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleInvestigate(anomaly)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded hover:bg-amber-500/30 transition-colors"
                        >
                          <Search className="w-3 h-3" />
                          Investigate
                        </button>
                        <button
                          onClick={() => handleViewCustomer(anomaly.customer_id)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700/50 text-slate-300 text-xs font-medium rounded hover:bg-slate-700 transition-colors"
                        >
                          View Customer
                        </button>
                        <button
                          onClick={() => acknowledgeAnomaly(anomaly.id)}
                          className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                          title="Acknowledge"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => dismissAnomaly(anomaly.id)}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customers with Anomalies */}
      {anomaliesByCustomer.length > 0 && (
        <div className="border-t border-slate-700/50 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">Customers with Anomalies</span>
          </div>
          <div className="space-y-1.5">
            {visibleCustomers.map((customer) => (
              <button
                key={customer.customer_id}
                onClick={() => handleViewCustomer(customer.customer_id)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors text-left"
              >
                <span className="text-sm text-slate-300 truncate">{customer.customer_name}</span>
                <div className="flex items-center gap-2">
                  {customer.critical_count > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded">
                      {customer.critical_count}
                    </span>
                  )}
                  {customer.warning_count > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded">
                      {customer.warning_count}
                    </span>
                  )}
                  {customer.info_count > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">
                      {customer.info_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {anomaliesByCustomer.length > 5 && (
            <button
              onClick={() => setShowAllCustomers(!showAllCustomers)}
              className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-300 font-medium flex items-center justify-center gap-1 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              {showAllCustomers ? 'Show less' : `Show all ${anomaliesByCustomer.length} customers`}
              <ChevronDown className={`w-4 h-4 transition-transform ${showAllCustomers ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}

      {/* No Anomalies State */}
      {totalNew === 0 && (
        <div className="border-t border-slate-700/50 pt-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">All Clear - No anomalies detected across customers</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Click "Scan" to run anomaly detection across all customers
          </p>
        </div>
      )}
    </div>
  );
}

export default AdminAnomalyInsights;
