import { AlertTriangle, Check } from 'lucide-react';
import { useWidgetAlerts } from '../../../contexts/DashboardAlertContext';
import { SEVERITY_COLORS } from '../../../types/widgetAlerts';

interface WidgetAlertBadgeProps {
  widgetKey: string;
  showAmbient?: boolean;
  className?: string;
}

export function WidgetAlertBadge({
  widgetKey,
  showAmbient = false,
  className = ''
}: WidgetAlertBadgeProps) {
  const { alerts, state, maxSeverity, openInspector } = useWidgetAlerts(widgetKey);

  if (state === 'ambient') {
    if (!showAmbient) return null;
    return (
      <div className={`flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg text-xs font-medium ${className}`}>
        <Check className="w-3.5 h-3.5" />
        <span>On track</span>
      </div>
    );
  }

  const severity = maxSeverity || 'warning';
  const colors = SEVERITY_COLORS[severity];

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        openInspector();
      }}
      className={`flex items-center gap-1.5 ${colors.badge} px-2 py-1 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer ${className}`}
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>{alerts.length}</span>
      <span className="hidden sm:inline">
        {severity === 'critical' ? '- Critical' : severity === 'warning' ? '- Attention' : ''}
      </span>
    </button>
  );
}
