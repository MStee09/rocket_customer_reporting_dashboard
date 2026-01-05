import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
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
