// ============================================================================
// LIVING DASHBOARD V3 - FULLY INTEGRATED FOR GO ROCKET SHIPPING
// ============================================================================
//
// This code integrates with your existing:
//   - DashboardPage.tsx
//   - WidgetGrid.tsx  
//   - DashboardWidgetCard.tsx
//   - widgetLibrary.ts
//   - AuthContext.tsx
//
// PASTE THIS INTO BOLT - It will create the files in correct locations
//
// ============================================================================


// ============================================================================
// FILE: src/types/widgetAlerts.ts
// ============================================================================

export type WidgetState = 'ambient' | 'active';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';

export type AlertStatus = 'active' | 'acknowledged' | 'dismissed' | 'snoozed' | 'resolved';

export type AlertType = 
  | 'volume_spike' 
  | 'volume_drop' 
  | 'spend_spike' 
  | 'spend_drop'
  | 'carrier_concentration' 
  | 'carrier_cost_up' 
  | 'carrier_cost_down'
  | 'mode_shift'
  | 'new_region'
  | 'regional_spike'
  | 'on_time_drop'
  | 'transit_time_increase'
  | 'cost_per_unit_spike'
  | 'spend_anomaly'
  | 'volume_anomaly'
  | 'carrier_shift';

export interface WidgetAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  change_percent?: number;
  current_value?: number;
  previous_value?: number;
  investigate_query?: string;
  methodology?: string;
  triggered_at: string;
}

export interface WidgetAlertGroup {
  widget_key: string;
  alert_count: number;
  max_severity: AlertSeverity;
  alerts: WidgetAlert[];
}

export interface DashboardAlertContextValue {
  alertsByWidget: Record<string, WidgetAlert[]>;
  totalAlerts: number;
  widgetsWithAlerts: string[];
  isLoading: boolean;
  error: Error | null;
  getAlertsForWidget: (widgetKey: string) => WidgetAlert[];
  getStateForWidget: (widgetKey: string) => WidgetState;
  getMaxSeverityForWidget: (widgetKey: string) => AlertSeverity | null;
  dismissAlert: (alertId: string) => Promise<void>;
  snoozeAlert: (alertId: string, minutes: number) => Promise<void>;
  dismissAllForWidget: (widgetKey: string) => Promise<void>;
  snoozeAllForWidget: (widgetKey: string, minutes: number) => Promise<void>;
  refetch: () => void;
  inspectorWidgetKey: string | null;
  openInspector: (widgetKey: string) => void;
  closeInspector: () => void;
}

// Styling constants matching your existing design system
export const SEVERITY_COLORS: Record<AlertSeverity, {
  bg: string;
  text: string;
  border: string;
  badge: string;
  dot: string;
  ring: string;
}> = {
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-500',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    ring: 'ring-red-500/30',
  },
  warning: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-500',
    ring: 'ring-orange-500/30',
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
    ring: 'ring-blue-500/30',
  },
  success: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-500',
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
    ring: 'ring-green-500/30',
  },
};

export function getSeverityScore(severity: AlertSeverity): number {
  const scores: Record<AlertSeverity, number> = { critical: 3, warning: 2, info: 1, success: 0 };
  return scores[severity] ?? 0;
}

export function getMaxSeverity(alerts: WidgetAlert[]): AlertSeverity | null {
  if (!alerts || alerts.length === 0) return null;
  return alerts.reduce((max, alert) => {
    return getSeverityScore(alert.severity) > getSeverityScore(max) ? alert.severity : max;
  }, alerts[0].severity);
}

// Maps alert types to widget IDs (matches your widgetLibrary keys)
export const ALERT_WIDGET_MAP: Record<AlertType, string> = {
  volume_spike: 'total_shipments',
  volume_drop: 'total_shipments',
  spend_spike: 'total_spend',
  spend_drop: 'total_spend',
  carrier_concentration: 'carrier_mix',
  carrier_cost_up: 'carrier_mix',
  carrier_cost_down: 'carrier_mix',
  mode_shift: 'shipments_by_mode',
  new_region: 'flow_map',
  regional_spike: 'cost_by_state',
  on_time_drop: 'on_time_pct',
  transit_time_increase: 'avg_transit_days',
  cost_per_unit_spike: 'avg_cost_per_shipment',
  spend_anomaly: 'total_spend',
  volume_anomaly: 'total_shipments',
  carrier_shift: 'carrier_mix',
};


// ============================================================================
// FILE: src/contexts/DashboardAlertContext.tsx
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { 
  WidgetAlert, 
  WidgetAlertGroup, 
  DashboardAlertContextValue, 
  WidgetState,
  AlertSeverity 
} from '../types/widgetAlerts';
import { getMaxSeverity } from '../types/widgetAlerts';

const DashboardAlertContext = createContext<DashboardAlertContextValue | null>(null);

interface DashboardAlertProviderProps {
  customerId: number | undefined;
  children: ReactNode;
}

export function DashboardAlertProvider({ customerId, children }: DashboardAlertProviderProps) {
  const [alertsByWidget, setAlertsByWidget] = useState<Record<string, WidgetAlert[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [inspectorWidgetKey, setInspectorWidgetKey] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!customerId) {
      setAlertsByWidget({});
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase.rpc('get_dashboard_alerts', {
        p_customer_id: customerId
      });

      if (fetchError) throw fetchError;

      const byWidget: Record<string, WidgetAlert[]> = {};
      (data || []).forEach((group: WidgetAlertGroup) => {
        byWidget[group.widget_key] = Array.isArray(group.alerts) ? group.alerts : [];
      });

      setAlertsByWidget(byWidget);
      setError(null);
    } catch (err) {
      console.error('[DashboardAlertProvider] Error fetching alerts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Realtime subscription - single channel for all customer alerts
  useEffect(() => {
    if (!customerId) return;

    const channel = supabase
      .channel(`dashboard-alerts:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widget_alerts',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, fetchAlerts]);

  const totalAlerts = useMemo(() => {
    return Object.values(alertsByWidget).reduce((sum, alerts) => sum + alerts.length, 0);
  }, [alertsByWidget]);

  const widgetsWithAlerts = useMemo(() => {
    return Object.keys(alertsByWidget).filter(key => alertsByWidget[key].length > 0);
  }, [alertsByWidget]);

  const getAlertsForWidget = useCallback((widgetKey: string): WidgetAlert[] => {
    return alertsByWidget[widgetKey] || [];
  }, [alertsByWidget]);

  const getStateForWidget = useCallback((widgetKey: string): WidgetState => {
    const alerts = alertsByWidget[widgetKey] || [];
    return alerts.length > 0 ? 'active' : 'ambient';
  }, [alertsByWidget]);

  const getMaxSeverityForWidget = useCallback((widgetKey: string): AlertSeverity | null => {
    const alerts = alertsByWidget[widgetKey] || [];
    return getMaxSeverity(alerts);
  }, [alertsByWidget]);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('dismiss_widget_alert', {
        p_alert_id: alertId,
        p_action: 'dismissed'
      });
      if (rpcError) throw rpcError;
      
      // Optimistic update
      setAlertsByWidget(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].filter(a => a.id !== alertId);
          if (updated[key].length === 0) delete updated[key];
        }
        return updated;
      });
    } catch (err) {
      console.error('[DashboardAlertProvider] Dismiss error:', err);
      fetchAlerts();
    }
  }, [fetchAlerts]);

  const snoozeAlert = useCallback(async (alertId: string, minutes: number) => {
    try {
      const { error: rpcError } = await supabase.rpc('snooze_widget_alert', {
        p_alert_id: alertId,
        p_minutes: minutes
      });
      if (rpcError) throw rpcError;
      
      setAlertsByWidget(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].filter(a => a.id !== alertId);
          if (updated[key].length === 0) delete updated[key];
        }
        return updated;
      });
    } catch (err) {
      console.error('[DashboardAlertProvider] Snooze error:', err);
      fetchAlerts();
    }
  }, [fetchAlerts]);

  const dismissAllForWidget = useCallback(async (widgetKey: string) => {
    if (!customerId) return;
    try {
      const { error: rpcError } = await supabase.rpc('dismiss_widget_alerts', {
        p_customer_id: customerId,
        p_widget_key: widgetKey
      });
      if (rpcError) throw rpcError;
      
      setAlertsByWidget(prev => {
        const updated = { ...prev };
        delete updated[widgetKey];
        return updated;
      });
      setInspectorWidgetKey(null);
    } catch (err) {
      console.error('[DashboardAlertProvider] Dismiss all error:', err);
      fetchAlerts();
    }
  }, [customerId, fetchAlerts]);

  const snoozeAllForWidget = useCallback(async (widgetKey: string, minutes: number) => {
    if (!customerId) return;
    try {
      const { error: rpcError } = await supabase.rpc('snooze_widget', {
        p_customer_id: customerId,
        p_widget_key: widgetKey,
        p_minutes: minutes
      });
      if (rpcError) throw rpcError;
      
      setAlertsByWidget(prev => {
        const updated = { ...prev };
        delete updated[widgetKey];
        return updated;
      });
      setInspectorWidgetKey(null);
    } catch (err) {
      console.error('[DashboardAlertProvider] Snooze widget error:', err);
      fetchAlerts();
    }
  }, [customerId, fetchAlerts]);

  const openInspector = useCallback((widgetKey: string) => {
    setInspectorWidgetKey(widgetKey);
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorWidgetKey(null);
  }, []);

  const value: DashboardAlertContextValue = {
    alertsByWidget,
    totalAlerts,
    widgetsWithAlerts,
    isLoading,
    error,
    getAlertsForWidget,
    getStateForWidget,
    getMaxSeverityForWidget,
    dismissAlert,
    snoozeAlert,
    dismissAllForWidget,
    snoozeAllForWidget,
    refetch: fetchAlerts,
    inspectorWidgetKey,
    openInspector,
    closeInspector,
  };

  return (
    <DashboardAlertContext.Provider value={value}>
      {children}
    </DashboardAlertContext.Provider>
  );
}

export function useDashboardAlerts() {
  const context = useContext(DashboardAlertContext);
  if (!context) {
    throw new Error('useDashboardAlerts must be used within a DashboardAlertProvider');
  }
  return context;
}

export function useWidgetAlerts(widgetKey: string) {
  const { 
    getAlertsForWidget, 
    getStateForWidget, 
    getMaxSeverityForWidget,
    openInspector 
  } = useDashboardAlerts();
  
  return {
    alerts: getAlertsForWidget(widgetKey),
    state: getStateForWidget(widgetKey),
    maxSeverity: getMaxSeverityForWidget(widgetKey),
    openInspector: () => openInspector(widgetKey),
  };
}


// ============================================================================
// FILE: src/components/dashboard/widgets/WidgetAlertBadge.tsx
// ============================================================================

import React from 'react';
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
  showAmbient = false,  // Default false - don't show "On track" unless asked
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
        {severity === 'critical' ? '• Critical' : severity === 'warning' ? '• Attention' : ''}
      </span>
    </button>
  );
}


// ============================================================================
// FILE: src/components/dashboard/widgets/AlertInspectorPanel.tsx
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Search,
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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={closeInspector}
      />

      {/* Panel */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-slide-in-right ${className}`}>
        {/* Header */}
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

        {/* Alerts list */}
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

        {/* Actions footer */}
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

// Individual alert card
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
      {/* Header */}
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

      {/* Description */}
      <p className="text-sm text-slate-600 mb-3">{alert.description}</p>

      {/* Methodology */}
      {alert.methodology && (
        <p className="text-xs text-slate-400 mb-3 italic">{alert.methodology}</p>
      )}

      {/* Actions */}
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


// ============================================================================
// FILE: src/components/dashboard/widgets/index.ts
// ============================================================================

export { WidgetAlertBadge } from './WidgetAlertBadge';
export { AlertInspectorPanel } from './AlertInspectorPanel';

export type {
  WidgetState,
  AlertSeverity,
  AlertStatus,
  AlertType,
  WidgetAlert,
  WidgetAlertGroup,
  DashboardAlertContextValue,
} from '../../../types/widgetAlerts';

export {
  DashboardAlertProvider,
  useDashboardAlerts,
  useWidgetAlerts,
} from '../../../contexts/DashboardAlertContext';

export {
  SEVERITY_COLORS,
  ALERT_WIDGET_MAP,
  getSeverityScore,
  getMaxSeverity,
} from '../../../types/widgetAlerts';
