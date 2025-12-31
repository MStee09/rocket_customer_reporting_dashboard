import { useState } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Truck,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { AttentionSignal } from '../../services/attentionSignalService';

interface AttentionSignalsProps {
  signals: AttentionSignal[];
  allClear: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onViewDetails?: (signal: AttentionSignal) => void;
}

const signalIcons: Record<AttentionSignal['type'], typeof TrendingUp> = {
  cost_spike: TrendingUp,
  volume_drop: TrendingDown,
  carrier_performance: Truck,
  delivery_delay: Clock,
};

const severityStyles: Record<AttentionSignal['severity'], { bg: string; border: string; icon: string }> = {
  high: { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600' },
};

export function AttentionSignals({ signals, allClear, isLoading, onRefresh, onViewDetails }: AttentionSignalsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5 mb-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200" />
          <div className="flex-1">
            <div className="h-5 bg-slate-200 rounded w-48 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (allClear) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900">All systems normal</h3>
              <p className="text-sm text-emerald-700">No anomalies detected in your logistics data</p>
            </div>
          </div>
          <button onClick={onRefresh} className="p-2 hover:bg-emerald-100 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
          </button>
        </div>
      </div>
    );
  }

  const visibleSignals = showAll ? signals : signals.slice(0, 3);
  const hiddenCount = signals.length - 3;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-orange-900">
              {signals.length} {signals.length === 1 ? 'thing needs' : 'things need'} your attention
            </h3>
            <p className="text-sm text-orange-700">This period's priority items</p>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-orange-600 ml-2" /> : <ChevronDown className="w-5 h-5 text-orange-600 ml-2" />}
        </button>
        <button onClick={onRefresh} className="p-2 hover:bg-orange-100 rounded-lg transition-colors">
          <RefreshCw className="w-5 h-5 text-orange-600" />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {visibleSignals.map((signal) => {
            const Icon = signalIcons[signal.type];
            const styles = severityStyles[signal.severity];
            return (
              <div key={signal.id} className={`${styles.bg} rounded-xl p-4 flex items-center justify-between border ${styles.border}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg ${styles.icon} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{signal.title}</p>
                    <p className="text-sm text-slate-500">{signal.description}</p>
                  </div>
                </div>
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(signal)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 flex items-center gap-2 border border-slate-200 transition-colors"
                  >
                    View Details <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          {signals.length > 3 && (
            <button onClick={() => setShowAll(!showAll)} className="w-full py-2 text-sm font-medium text-orange-700 hover:text-orange-900 transition-colors">
              {showAll ? 'Show less' : `Show ${hiddenCount} more`}
            </button>
          )}

          <div className="mt-4 pt-4 border-t border-orange-200 flex items-center gap-2 text-emerald-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Everything else is tracking within normal ranges</span>
          </div>
        </div>
      )}
    </div>
  );
}
