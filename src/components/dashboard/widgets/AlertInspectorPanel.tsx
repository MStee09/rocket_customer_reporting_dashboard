import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Check,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useDashboardAlerts } from '../../../contexts/DashboardAlertContext';
import { widgetLibrary } from '../../../config/widgetLibrary';
import type { WidgetAlert } from '../../../types/widgetAlerts';
import { SEVERITY_COLORS, getSeverityScore } from '../../../types/widgetAlerts';

interface AlertInspectorPanelProps {
  className?: string;
}

export function AlertInspectorPanel({ className = '' }: AlertInspectorPanelProps) {
  const navigate = useNavigate();
  const {
    inspectorWidgetKey,
    closeInspector,
    getAlertsForWidget,
    dismissAlert,
    snoozeAlert,
    dismissAllForWidget,
    snoozeAllForWidget,
  } = useDashboardAlerts();

  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState<string | null>(null);

  if (!inspectorWidgetKey) return null;

  const alerts = getAlertsForWidget(inspectorWidgetKey);
  const widgetDef = widgetLibrary[inspectorWidgetKey];
  const widgetName = widgetDef?.name || inspectorWidgetKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const sortedAlerts = [...alerts].sort(
    (a, b) => getSeverityScore(b.severity) - getSeverityScore(a.severity)
  );

  const handleInvestigate = (query?: string) => {
    const investigateQuery = query || sortedAlerts[0]?.investigate_query || `Analyze my ${widgetName} data and explain any unusual patterns`;
    navigate(`/ai-studio?query=${encodeURIComponent(investigateQuery)}`);
    closeInspector();
  };

  const snoozeOptions = [
    { label: '1 hour', minutes: 60 },
    { label: '4 hours', minutes: 240 },
    { label: '1 day', minutes: 1440 },
    { label: '1 week', minutes: 10080 },
  ];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={closeInspector}
      />

      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-slide-in-right ${className}`}>
        <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{widgetName}</h2>
              <p className="text-sm text-slate-500">
                {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'} need attention
              </p>
            </div>
          </div>
          <button
            onClick={closeInspector}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {sortedAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              snoozeMenuOpen={snoozeMenuOpen === alert.id}
              onToggleSnooze={() => setSnoozeMenuOpen(snoozeMenuOpen === alert.id ? null : alert.id)}
              onDismiss={() => dismissAlert(alert.id)}
              onSnooze={(minutes) => {
                snoozeAlert(alert.id, minutes);
                setSnoozeMenuOpen(null);
              }}
              onInvestigate={() => handleInvestigate(alert.investigate_query)}
              snoozeOptions={snoozeOptions}
            />
          ))}

          {alerts.length === 0 && (
            <div className="text-center py-12">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">All clear!</p>
              <p className="text-sm text-slate-400">No active alerts for this widget</p>
            </div>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            <button
              onClick={() => handleInvestigate()}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Investigate with AI
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <button
                  onClick={() => setSnoozeMenuOpen(snoozeMenuOpen === 'all' ? null : 'all')}
                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Snooze All
                </button>
                {snoozeMenuOpen === 'all' && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSnoozeMenuOpen(null)} />
                    <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                      {snoozeOptions.map((option) => (
                        <button
                          key={option.minutes}
                          onClick={() => {
                            snoozeAllForWidget(inspectorWidgetKey, option.minutes);
                            setSnoozeMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => dismissAllForWidget(inspectorWidgetKey)}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Mark Reviewed
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

interface AlertCardProps {
  alert: WidgetAlert;
  snoozeMenuOpen: boolean;
  onToggleSnooze: () => void;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  onInvestigate: () => void;
  snoozeOptions: Array<{ label: string; minutes: number }>;
}

function AlertCard({
  alert,
  snoozeMenuOpen,
  onToggleSnooze,
  onDismiss,
  onSnooze,
  onInvestigate,
  snoozeOptions,
}: AlertCardProps) {
  const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.warning;

  return (
    <div className={`p-4 rounded-xl ${colors.bg} border ${colors.border}/30`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <span className={`font-medium ${colors.text}`}>{alert.title}</span>
        </div>
        {alert.change_percent !== undefined && alert.change_percent !== null && (
          <span className={`text-sm font-semibold flex items-center ${
            alert.change_percent > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {alert.change_percent > 0 ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {alert.change_percent > 0 ? '+' : ''}{Math.round(alert.change_percent)}%
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600 mb-3">{alert.description}</p>

      {alert.methodology && (
        <p className="text-xs text-slate-400 mb-3 italic">{alert.methodology}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onInvestigate}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/80 hover:bg-white text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          Investigate
        </button>

        <div className="relative">
          <button
            onClick={onToggleSnooze}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors"
            title="Snooze"
          >
            <Clock className="w-4 h-4" />
          </button>
          {snoozeMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onToggleSnooze} />
              <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                {snoozeOptions.map((option) => (
                  <button
                    key={option.minutes}
                    onClick={() => onSnooze(option.minutes)}
                    className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
