import { AlertTriangle, Check, ChevronRight } from 'lucide-react';
import { useWidgetAlerts } from '../../../contexts/DashboardAlertContext';

interface WidgetAlertBadgeProps {
  widgetKey: string;
  showAmbient?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function WidgetAlertBadge({
  widgetKey,
  showAmbient = false,
  className = '',
  size = 'sm'
}: WidgetAlertBadgeProps) {
  const { alerts, state, maxSeverity, openInspector } = useWidgetAlerts(widgetKey);

  if (state === 'ambient') {
    if (!showAmbient) return null;
    return (
      <div className={`flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
        <Check className="w-3 h-3" />
        <span>On track</span>
      </div>
    );
  }

  const severity = maxSeverity || 'warning';

  const sizeClasses = size === 'md'
    ? 'px-3 py-1.5 text-sm gap-2'
    : 'px-2.5 py-1 text-xs gap-1.5';

  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const chevronSize = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';

  const getSeverityStyles = () => {
    if (severity === 'critical') {
      return 'bg-red-100 text-red-700 hover:bg-red-200 ring-2 ring-red-500/30 animate-pulse';
    }
    return 'bg-orange-100 text-orange-700 hover:bg-orange-200 ring-2 ring-orange-500/20';
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        openInspector();
      }}
      className={`inline-flex items-center ${sizeClasses} rounded-full font-semibold transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${getSeverityStyles()} ${className}`}
    >
      <AlertTriangle className={iconSize} />
      <span className="font-bold">{alerts.length}</span>
      <span className="hidden sm:inline font-medium">
        {severity === 'critical' ? 'Critical' : alerts.length === 1 ? 'Alert' : 'Alerts'}
      </span>
      <ChevronRight className={`${chevronSize} opacity-60`} />
    </button>
  );
}
