import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
} from 'lucide-react';
import { useAdminAnomalies } from '../../hooks/useAdminAnomalies';

interface AnomalyDetectionPanelProps {
  onCustomerClick?: (customerId: number) => void;
}

export function AnomalyDetectionPanel({ onCustomerClick }: AnomalyDetectionPanelProps) {
  const {
    summary,
    loading,
    refetch,
    runScan,
    criticalCount,
    warningCount,
    customersAffected,
  } = useAdminAnomalies();

  const [expanded, setExpanded] = useState(true);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleRunScan = async () => {
    setScanning(true);
    try {
      await runScan(undefined, true);
    } catch (error) {
      console.error('Failed to run scan:', error);
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-20 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  const hasCritical = criticalCount > 0;
  const hasWarnings = warningCount > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            hasCritical ? 'bg-red-100' : hasWarnings ? 'bg-amber-100' : 'bg-teal-100'
          }`}>
            <Zap className={`w-5 h-5 ${
              hasCritical ? 'text-red-600' : hasWarnings ? 'text-amber-600' : 'text-teal-600'
            }`} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Anomaly Detection</h3>
            <p className="text-sm text-gray-500">
              {customersAffected} customers with anomalies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasCritical && (
            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
              {criticalCount} critical
            </span>
          )}
          {hasWarnings && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
              {warningCount} warnings
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-gray-600">Critical:</span>
                <span className="font-semibold text-gray-900">{summary?.critical_count ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-gray-600">Warning:</span>
                <span className="font-semibold text-gray-900">{summary?.warning_count ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">Info:</span>
                <span className="font-semibold text-gray-900">{summary?.info_count ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Affected:</span>
                <span className="font-semibold text-gray-900">{summary?.customers_affected ?? 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleRunScan}
                disabled={scanning}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Play className={`w-4 h-4 ${scanning ? 'animate-pulse' : ''}`} />
                {scanning ? 'Scanning...' : 'Run Scan'}
              </button>
            </div>
          </div>

          {summary?.anomalies_by_customer && summary.anomalies_by_customer.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Anomalies by Customer</h4>
              <div className="space-y-2">
                {(showAllCustomers
                  ? summary.anomalies_by_customer
                  : summary.anomalies_by_customer.slice(0, 5)
                ).map((customer) => (
                  <button
                    key={customer.customer_id}
                    onClick={() => onCustomerClick?.(customer.customer_id)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{customer.customer_name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({customer.total} anomalies)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {customer.critical_count > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          {customer.critical_count}
                        </span>
                      )}
                      {customer.warning_count > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          {customer.warning_count}
                        </span>
                      )}
                      {customer.info_count > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          {customer.info_count}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {summary.anomalies_by_customer.length > 5 && (
                  <button
                    onClick={() => setShowAllCustomers(!showAllCustomers)}
                    className="w-full text-center py-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    {showAllCustomers
                      ? 'Show less'
                      : `Show ${summary.anomalies_by_customer.length - 5} more`}
                  </button>
                )}
              </div>
            </div>
          )}

          {summary?.recent_critical && summary.recent_critical.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Critical & Warnings</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {summary.recent_critical.slice(0, 8).map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className={`p-3 rounded-lg border ${
                      anomaly.severity === 'critical'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        {anomaly.severity === 'critical' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm">
                              {anomaly.title}
                            </span>
                            {anomaly.change_percent !== null && (
                              <span className={`flex items-center text-xs font-medium ${
                                anomaly.change_percent > 0 ? 'text-red-600' : 'text-green-600'
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
                          <p className="text-xs text-gray-600 mt-0.5 truncate">
                            {anomaly.customer_name}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onCustomerClick?.(anomaly.customer_id)}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!summary?.total_new || summary.total_new === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No anomalies detected</p>
              <p className="text-xs text-gray-400 mt-1">
                Click "Run Scan" to check all customers
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
