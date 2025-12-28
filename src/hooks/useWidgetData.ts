import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { dashboardWidgets } from '../config/dashboardWidgets';
import { WidgetData, DateRange } from '../types/widgets';

interface UseWidgetDataParams {
  widgetId: string;
  customerId?: number;
  effectiveCustomerIds: number[];
  isAdmin: boolean;
  isViewingAsCustomer: boolean;
  dateRange: DateRange;
  enabled?: boolean;
}

export function useWidgetData({
  widgetId,
  customerId,
  effectiveCustomerIds,
  isAdmin,
  isViewingAsCustomer,
  dateRange,
  enabled = true,
}: UseWidgetDataParams) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const widget = dashboardWidgets[widgetId];

    if (!widget) {
      setError(`Widget ${widgetId} not found`);
      setIsLoading(false);
      return;
    }

    if (widget.adminOnly && !isAdmin) {
      setError('Widget not available');
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await widget.calculate({
          supabase,
          customerId,
          effectiveCustomerIds,
          isAdmin,
          isViewingAsCustomer,
          dateRange,
        });

        setData(result);
      } catch (err) {
        console.error(`Error loading widget ${widgetId}:`, err);
        setError('Failed to load widget data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [widgetId, customerId, effectiveCustomerIds, isAdmin, isViewingAsCustomer, dateRange, enabled]);

  const retry = () => {
    const widget = dashboardWidgets[widgetId];
    if (!widget || !enabled) return;

    setIsLoading(true);
    setError(null);

    widget
      .calculate({
        supabase,
        customerId,
        effectiveCustomerIds,
        isAdmin,
        isViewingAsCustomer,
        dateRange,
      })
      .then((result) => {
        setData(result);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(`Error loading widget ${widgetId}:`, err);
        setError('Failed to load widget data');
        setIsLoading(false);
      });
  };

  return { data, isLoading, error, retry };
}
