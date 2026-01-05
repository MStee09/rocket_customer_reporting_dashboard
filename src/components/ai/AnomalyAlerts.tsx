import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Zap,
  Search
} from 'lucide-react';
import { useAnomalies, Anomaly } from '../../hooks/useAnomalies';

interface AnomalyAlertsProps {
  customerId: string;
  compact?: boolean;
  onInvestigate?: (anomaly: Anomaly) => void;
}

export function AnomalyAlerts({ customerId, compact = false, onInvestigate }: AnomalyAlertsProps) {
  const {
    anomalies,
    loading,
    criticalCount,
    warningCount,
    newCount,
    acknowledgeAnomaly,
    dismissAnomaly
  } = useAnomalies({ customerId, status: 'new' });

  const [expanded, setExpanded] = useState(!compact);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl h-20" />
    );
  }

  if (anomalies.length === 0) {
    return null;
  }

  const SeverityIcon = ({ severity }: { severity: string }) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const severityBg: Record<string, string> = {
    critical: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Attention Needed</h3>
            <p className="text-sm text-gray-500">
              {criticalCount > 0 && (
                <span className="text-red-600 font-medium">{criticalCount} critical</span>
              )}
              {criticalCount > 0 && warningCount > 0 && ', '}
              {warningCount > 0 && (
                <span className="text-amber-600 font-medium">{warningCount} warnings</span>
              )}
              {criticalCount === 0 && warningCount === 0 && (
                <span className="text-gray-500">{newCount} items to review</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
              {newCount} new
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
        <div className="border-t divide-y">
          {anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`p-4 ${severityBg[anomaly.severity] || 'bg-gray-50'}`}
            >
              <div className="flex items-start gap-3">
                <SeverityIcon severity={anomaly.severity} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-gray-900">{anomaly.title}</h4>
                    {anomaly.change_percent !== null && (
                      <span className={`flex items-center text-sm font-medium ${
                        anomaly.change_percent > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {anomaly.change_percent > 0 ? (
                          <TrendingUp className="w-4 h-4 mr-0.5" />
                        ) : (
                          <TrendingDown className="w-4 h-4 mr-0.5" />
                        )}
                        {anomaly.change_percent > 0 ? '+' : ''}{anomaly.change_percent}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>

                  {anomaly.suggested_actions?.length > 0 && (
                    <p className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">Suggested: </span>
                      {anomaly.suggested_actions[0]?.action}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {onInvestigate && (
                      <button
                        onClick={() => onInvestigate(anomaly)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <Search className="w-4 h-4" />
                        Investigate
                      </button>
                    )}
                    <button
                      onClick={() => acknowledgeAnomaly(anomaly.id)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Acknowledge"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => dismissAnomaly(anomaly.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
