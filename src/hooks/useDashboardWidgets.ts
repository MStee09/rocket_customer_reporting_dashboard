import { useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';

interface DashboardWidget {
  id: string;
  customer_id: number | null;
  widget_id: string;
  position: number;
  size: string;
  tab: string;
  config: any;
  created_at: string;
  updated_at: string;
}

export const useDashboardWidgets = (tab: string = 'overview') => {
  const supabase = useSupabase();
  const { effectiveCustomerId, isAdmin } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWidgets = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('tab', tab)
        .order('position');

      if (effectiveCustomerId) {
        query = query.eq('customer_id', effectiveCustomerId);
      } else if (isAdmin()) {
        query = query.is('customer_id', null);
      } else {
        setWidgets([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setWidgets(data || []);
    } catch (err: any) {
      console.error('Failed to load dashboard widgets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWidgets();
  }, [effectiveCustomerId, tab, isAdmin]);

  const addWidget = async (widgetId: string, options?: { size?: string; tab?: string }) => {
    const maxPosition = widgets.reduce((max, w) => Math.max(max, w.position), -1);

    const { data, error: insertError } = await supabase
      .from('dashboard_widgets')
      .insert({
        customer_id: effectiveCustomerId || null,
        widget_id: widgetId,
        position: maxPosition + 1,
        size: options?.size || 'medium',
        tab: options?.tab || tab,
        config: {},
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    await loadWidgets();
    return data;
  };

  const removeWidget = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('dashboard_widgets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    await loadWidgets();
  };

  const updateWidget = async (id: string, updates: Partial<DashboardWidget>) => {
    const { error: updateError } = await supabase
      .from('dashboard_widgets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    await loadWidgets();
  };

  const isWidgetOnDashboard = (widgetId: string): boolean => {
    return widgets.some(w => w.widget_id === widgetId);
  };

  return {
    widgets,
    loading,
    error,
    addWidget,
    removeWidget,
    updateWidget,
    isWidgetOnDashboard,
    refresh: loadWidgets,
  };
};
