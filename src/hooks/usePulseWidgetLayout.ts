import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { WidgetSizeLevel } from '../types/widgets';

interface PulseWidgetLayout {
  widgets: string[];
  widgetSizes?: Record<string, WidgetSizeLevel>;
}

const STORAGE_BUCKET = 'dashboard-layouts';
const getLayoutPath = (customerId: number) => `pulse/${customerId}.json`;

export function usePulseWidgetLayout(customerId: number | undefined) {
  const [widgets, setWidgets] = useState<string[]>([]);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSizeLevel>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLayout = useCallback(async () => {
    if (!customerId) {
      setWidgets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const path = getLayoutPath(customerId);

      const { data: fileData, error: downloadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(path);

      if (downloadError) {
        if (downloadError.message.includes('not found') || downloadError.message.includes('does not exist')) {
          setWidgets([]);
        } else {
          console.error('Error downloading pulse layout:', downloadError);
          setError('Failed to load pulse widget layout');
          setWidgets([]);
        }
      } else if (fileData) {
        const text = await fileData.text();
        const parsedLayout: PulseWidgetLayout = JSON.parse(text);
        setWidgets(parsedLayout.widgets || []);
        setWidgetSizes(parsedLayout.widgetSizes || {});
      }
    } catch (err) {
      console.error('Error loading pulse widget layout:', err);
      setError('Failed to load pulse widget layout');
      setWidgets([]);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  const saveLayout = useCallback(
    async (newWidgets: string[], newWidgetSizes?: Record<string, WidgetSizeLevel>) => {
      if (!customerId) {
        console.error('Cannot save pulse layout: no customer ID');
        return false;
      }

      try {
        const path = getLayoutPath(customerId);
        const layoutConfig: PulseWidgetLayout = {
          widgets: newWidgets,
          widgetSizes: newWidgetSizes !== undefined ? newWidgetSizes : widgetSizes,
        };
        const blob = new Blob([JSON.stringify(layoutConfig, null, 2)], {
          type: 'application/json',
        });

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, blob, {
            contentType: 'application/json',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error saving pulse layout:', uploadError);
          return false;
        }

        setWidgets(newWidgets);
        if (newWidgetSizes !== undefined) {
          setWidgetSizes(newWidgetSizes);
        }
        return true;
      } catch (err) {
        console.error('Error saving pulse widget layout:', err);
        return false;
      }
    },
    [customerId, widgetSizes]
  );

  const addWidget = useCallback(
    async (widgetId: string) => {
      if (widgets.includes(widgetId)) return false;
      const newWidgets = [...widgets, widgetId];
      return saveLayout(newWidgets);
    },
    [widgets, saveLayout]
  );

  const removeWidget = useCallback(
    async (widgetId: string) => {
      const newWidgets = widgets.filter(id => id !== widgetId);
      const newSizes = { ...widgetSizes };
      delete newSizes[widgetId];
      return saveLayout(newWidgets, newSizes);
    },
    [widgets, widgetSizes, saveLayout]
  );

  const reorderWidgets = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const newWidgets = [...widgets];
      const [removed] = newWidgets.splice(fromIndex, 1);
      newWidgets.splice(toIndex, 0, removed);
      return saveLayout(newWidgets);
    },
    [widgets, saveLayout]
  );

  const updateWidgetSize = useCallback(
    async (widgetId: string, size: WidgetSizeLevel) => {
      const newSizes = { ...widgetSizes, [widgetId]: size };
      return saveLayout(widgets, newSizes);
    },
    [widgets, widgetSizes, saveLayout]
  );

  const resetLayout = useCallback(async () => {
    return saveLayout([], {});
  }, [saveLayout]);

  return {
    widgets,
    widgetSizes,
    isLoading,
    error,
    addWidget,
    removeWidget,
    reorderWidgets,
    updateWidgetSize,
    resetLayout,
    reloadLayout: loadLayout,
  };
}
