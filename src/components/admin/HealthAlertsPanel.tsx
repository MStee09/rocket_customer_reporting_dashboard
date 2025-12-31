import { Bell, Check, X, AlertTriangle } from 'lucide-react';
import type { CustomerHealthAlert, AlertSeverity } from '../../types/customerHealth';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  alerts: CustomerHealthAlert[];
  isLoading: boolean;
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { bg: string; icon: string }> = {
  critical: { bg: 'bg-red-100', icon: 'text-red-600' },
  high: { bg: 'bg-orange-100', icon: 'text-orange-600' },
  medium: { bg: 'bg-amber-100', icon: 'text-amber-600' },
  low: { bg: 'bg-blue-100', icon: 'text-blue-600' },
};

export function HealthAlertsPanel({ alerts, isLoading, onAcknowledge, onDismiss }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="h-6 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-slate-800">Health Alerts</h3>
        </div>
        {alerts.length > 0 && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            {alerts.length}
          </span>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No active alerts</p>
          </div>
        ) : (
          alerts.map(alert => {
            const config = SEVERITY_CONFIG[alert.severity];

            return (
              <div key={alert.id} className="p-4 border-b hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded ${config.bg}`}>
                    <AlertTriangle className={`w-4 h-4 ${config.icon}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800">
                        {alert.customer_name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{alert.message}</p>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Acknowledge
                      </button>
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
