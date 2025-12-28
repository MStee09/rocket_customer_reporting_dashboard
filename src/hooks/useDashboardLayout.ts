import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { defaultDashboardLayout } from '../config/defaultDashboardLayout';
import { WidgetSizeLevel } from '../types/widgets';

interface SimpleDashboardLayout {
  layout: string[];
  widgetSizes?: Record<string, WidgetSizeLevel>;
}

export function useDashboardLayout(customerId: number | undefined) {
  const [layout, setLayout] = useState<string[]>(defaultDashboardLayout);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSizeLevel>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLayout = useCallback(async () => {
    if (!customerId) {
      setLayout(defaultDashboardLayout);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fileName = `${customerId}.json`;

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('dashboard-layouts')
        .download(fileName);

      if (downloadError) {
        if (downloadError.message.includes('not found') || downloadError.message.includes('does not exist')) {
          setLayout(defaultDashboardLayout);
        } else {
          console.error('Error downloading layout:', downloadError);
          setError('Failed to load dashboard layout');
          setLayout(defaultDashboardLayout);
        }
      } else if (fileData) {
        const text = await fileData.text();
        const parsedLayout: SimpleDashboardLayout = JSON.parse(text);
        setLayout(parsedLayout.layout || defaultDashboardLayout);
        setWidgetSizes(parsedLayout.widgetSizes || {});
      }
    } catch (err) {
      console.error('Error loading dashboard layout:', err);
      setError('Failed to load dashboard layout');
      setLayout(defaultDashboardLayout);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  const saveLayout = useCallback(
    async (newLayout: string[], newWidgetSizes?: Record<string, WidgetSizeLevel>) => {
      if (!customerId) {
        console.error('Cannot save layout: no customer ID');
        return false;
      }

      try {
        const fileName = `${customerId}.json`;
        const layoutConfig: SimpleDashboardLayout = {
          layout: newLayout,
          widgetSizes: newWidgetSizes !== undefined ? newWidgetSizes : widgetSizes,
        };
        const blob = new Blob([JSON.stringify(layoutConfig, null, 2)], {
          type: 'application/json',
        });

        const { data: existingFiles } = await supabase.storage
          .from('dashboard-layouts')
          .list('', {
            search: fileName,
          });

        if (existingFiles && existingFiles.length > 0) {
          const { error: updateError } = await supabase.storage
            .from('dashboard-layouts')
            .update(fileName, blob, {
              contentType: 'application/json',
              upsert: true,
            });

          if (updateError) {
            console.error('Error updating layout:', updateError);
            return false;
          }
        } else {
          const { error: uploadError } = await supabase.storage
            .from('dashboard-layouts')
            .upload(fileName, blob, {
              contentType: 'application/json',
              upsert: true,
            });

          if (uploadError) {
            console.error('Error uploading layout:', uploadError);
            return false;
          }
        }

        setLayout(newLayout);
        if (newWidgetSizes !== undefined) {
          setWidgetSizes(newWidgetSizes);
        }
        return true;
      } catch (err) {
        console.error('Error saving dashboard layout:', err);
        return false;
      }
    },
    [customerId, widgetSizes]
  );

  const updateLayout = useCallback(
    (newLayout: string[]) => {
      setLayout(newLayout);
    },
    []
  );

  const resetToDefault = useCallback(async () => {
    const success = await saveLayout(defaultDashboardLayout);
    if (success) {
      setLayout(defaultDashboardLayout);
    }
    return success;
  }, [saveLayout]);

  const addWidget = useCallback(
    (widgetId: string) => {
      const newLayout = [...layout, widgetId];
      setLayout(newLayout);
      return newLayout;
    },
    [layout]
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      const newLayout = layout.filter(id => id !== widgetId);
      setLayout(newLayout);
      return newLayout;
    },
    [layout]
  );

  const reorderWidgets = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newLayout = [...layout];
      const [removed] = newLayout.splice(fromIndex, 1);
      newLayout.splice(toIndex, 0, removed);
      setLayout(newLayout);
      return newLayout;
    },
    [layout]
  );

  return {
    layout,
    widgetSizes,
    isLoading,
    error,
    saveLayout,
    updateLayout,
    resetToDefault,
    addWidget,
    removeWidget,
    reorderWidgets,
    reloadLayout: loadLayout,
  };
}
