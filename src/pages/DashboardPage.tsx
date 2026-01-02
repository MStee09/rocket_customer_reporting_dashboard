import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, addMonths, addDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { AIReportWidgetConfig } from '../components/ai-studio';
import {
  DashboardHeader,
  AIReportsSection,
  WidgetGrid,
  InlineEditToolbar,
  WidgetGalleryModal,
  UnifiedInsightsCard,
} from '../components/dashboard';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { useDashboardWidgets } from '../hooks/useDashboardWidgets';
import { useDashboardEditMode } from '../hooks/useDashboardEditMode';
import { widgetLibrary, getGlobalWidgets } from '../config/widgetLibrary';
import { clampWidgetSize, WidgetSizeConstraint, getDefaultSize } from '../config/widgetConstraints';
import { AdminDashboardPage } from './AdminDashboardPage';
import { loadCustomWidget, loadAllCustomWidgets } from '../config/widgets/customWidgetStorage';
import { supabase } from '../lib/supabase';

type WidgetSizeValue = 1 | 2 | 3;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState('last30');
  const [saveNotification, setSaveNotification] = useState(false);
  const [autoSaveNotification, setAutoSaveNotification] = useState(false);
  const [addWidgetNotification, setAddWidgetNotification] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [aiWidgets, setAiWidgets] = useState<AIReportWidgetConfig[]>([]);
  const { user, isAdmin, effectiveCustomerIds, isViewingAsCustomer, effectiveCustomerId } = useAuth();

  const showAdminDashboard = isAdmin() && !isViewingAsCustomer;
  const customerId = effectiveCustomerIds.length > 0 ? effectiveCustomerIds[0] : undefined;

  const {
    layout,
    widgetSizes: storedWidgetSizes,
    isLoading,
    saveLayout,
  } = useDashboardLayout(customerId);

  const { widgets: dashboardWidgets, loading: widgetsLoading } = useDashboardWidgets('overview');
  const editMode = useDashboardEditMode();

  const [localLayout, setLocalLayout] = useState<string[]>(layout);
  const [localSizes, setLocalSizes] = useState<Record<string, WidgetSizeValue>>({});
  const [customWidgets, setCustomWidgets] = useState<Record<string, unknown>>({});
  const [availableWidgets, setAvailableWidgets] = useState<Array<{ id: string; name: string; description: string; type: string; iconColor?: string; category?: string }>>([]);

  const [hoverDragPending, setHoverDragPending] = useState(false);
  const debouncedLayout = useDebounce(localLayout, 1000);
  const lastSavedLayoutRef = useRef<string[]>(layout);

  const convertSizes = useCallback((
    sizes: Record<string, string>,
    currentLayout: string[]
  ): Record<string, WidgetSizeValue> => {
    const converted: Record<string, WidgetSizeValue> = {};

    Object.entries(sizes).forEach(([key, value]) => {
      if (value === 'default' || value === '1') converted[key] = 1;
      else if (value === 'large' || value === 'expanded' || value === '2') converted[key] = 2;
      else if (value === 'xlarge' || value === 'full' || value === '3') converted[key] = 3;
      else converted[key] = 1;
    });

    for (const widgetId of currentLayout) {
      if (!(widgetId in converted)) {
        const widget = widgetLibrary[widgetId] || customWidgets[widgetId];
        if (widget) {
          const widgetDef = widget as { type: string };
          converted[widgetId] = getDefaultSize(widgetId, widgetDef.type);
        } else {
          converted[widgetId] = 1;
        }
      }
    }

    return converted;
  }, [customWidgets]);

  useEffect(() => {
    if (!editMode.state.isEditing) {
      setLocalLayout(layout);
      setLocalSizes(convertSizes(storedWidgetSizes, layout));
      lastSavedLayoutRef.current = layout;
    }
  }, [layout, storedWidgetSizes, editMode.state.isEditing, convertSizes]);

  useEffect(() => {
    if (
      !editMode.state.isEditing &&
      hoverDragPending &&
      JSON.stringify(debouncedLayout) !== JSON.stringify(lastSavedLayoutRef.current)
    ) {
      const autoSave = async () => {
        const success = await saveLayout(debouncedLayout, storedWidgetSizes);
        if (success) {
          lastSavedLayoutRef.current = debouncedLayout;
          setAutoSaveNotification(true);
          setTimeout(() => setAutoSaveNotification(false), 1500);
        }
        setHoverDragPending(false);
      };
      autoSave();
    }
  }, [debouncedLayout, editMode.state.isEditing, hoverDragPending, saveLayout, storedWidgetSizes]);

  useEffect(() => {
    const loadCustomWidgetsFromStorage = async () => {
      const widgets: Record<string, unknown> = {};
      const dbWidgetIds = new Set(dashboardWidgets.map(dw => dw.widget_id));
      const allWidgetIds = new Set([
        ...dashboardWidgets.map(dw => dw.widget_id),
        ...layout.filter(id => !dbWidgetIds.has(id)),
      ]);

      for (const widgetId of allWidgetIds) {
        if (widgetLibrary[widgetId]) continue;
        const customWidget = await loadCustomWidget(
          supabase,
          widgetId,
          isAdmin(),
          effectiveCustomerId || undefined
        );
        if (customWidget) {
          widgets[widgetId] = customWidget;
        }
      }
      setCustomWidgets(widgets);
    };

    if (dashboardWidgets.length > 0 || layout.length > 0) {
      loadCustomWidgetsFromStorage();
    }
  }, [dashboardWidgets, layout, effectiveCustomerId, isAdmin]);

  useEffect(() => {
    const loadAvailableWidgets = async () => {
      const systemWidgets = getGlobalWidgets().map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        type: w.type,
        iconColor: w.iconColor,
        category: w.category,
      }));

      const customWidgetsList = await loadAllCustomWidgets(
        supabase,
        isAdmin(),
        effectiveCustomerId || undefined
      );

      const customWidgetItems = customWidgetsList.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description || '',
        type: w.type || 'kpi',
        iconColor: w.display?.iconColor || w.iconColor || 'bg-orange-500',
        category: 'custom' as string,
      }));

      setAvailableWidgets([...systemWidgets, ...customWidgetItems]);
    };

    loadAvailableWidgets();
  }, [effectiveCustomerId, isAdmin]);

  useEffect(() => {
    const loadAIWidgets = () => {
      const saved = localStorage.getItem('dashboard_ai_widgets');
      if (saved) {
        try {
          setAiWidgets(JSON.parse(saved));
        } catch {
          setAiWidgets([]);
        }
      }
    };
    loadAIWidgets();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboard_ai_widgets') loadAIWidgets();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRemoveAIWidget = (index: number) => {
    const newWidgets = aiWidgets.filter((_, i) => i !== index);
    setAiWidgets(newWidgets);
    localStorage.setItem('dashboard_ai_widgets', JSON.stringify(newWidgets));
  };

  useEffect(() => {
    const addWidget = searchParams.get('addWidget');
    if (addWidget && !isLoading && layout) {
      if (!layout.includes(addWidget)) {
        const newLayout = [...layout, addWidget];
        saveLayout(newLayout, storedWidgetSizes).then((success) => {
          if (success) {
            setAddWidgetNotification(true);
            setTimeout(() => setAddWidgetNotification(false), 3000);
          }
        });
      }
      searchParams.delete('addWidget');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, isLoading, layout, storedWidgetSizes, saveLayout, setSearchParams]);

  const { start: startDate, end: endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateRange) {
      case 'last7': start = subDays(now, 7); break;
      case 'last30': start = subDays(now, 30); break;
      case 'last90': start = subDays(now, 90); break;
      case 'last6months': start = subMonths(now, 6); break;
      case 'lastyear': start = subMonths(now, 12); break;
      case 'thisMonth': start = startOfMonth(now); end = endOfMonth(now); break;
      case 'thisQuarter': start = startOfQuarter(now); end = endOfQuarter(now); break;
      case 'thisYear': start = startOfYear(now); end = endOfYear(now); break;
      case 'upcoming': start = now; end = addMonths(now, 12); break;
      case 'next30': start = now; end = addDays(now, 30); break;
      case 'next90': start = now; end = addDays(now, 90); break;
      default: start = subMonths(now, 6);
    }

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  const handleWidgetRemove = useCallback((widgetId: string) => {
    setLocalLayout(prev => prev.filter(id => id !== widgetId));
    editMode.setPendingChanges(true);
  }, [editMode]);

  const handleWidgetSizeChange = useCallback((widgetId: string, size: WidgetSizeConstraint) => {
    const widget = widgetLibrary[widgetId] || customWidgets[widgetId];
    if (widget) {
      const widgetDef = widget as { type: string };
      const clampedSize = clampWidgetSize(size, widgetId, widgetDef.type);
      setLocalSizes(prev => ({ ...prev, [widgetId]: clampedSize }));
      editMode.setPendingChanges(true);
    }
  }, [customWidgets, editMode]);

  const handleReorder = useCallback((newOrder: string[]) => {
    setLocalLayout(newOrder);

    if (editMode.state.isEditing) {
      editMode.setPendingChanges(true);
    } else {
      setHoverDragPending(true);
    }
  }, [editMode]);

  const handleAddWidget = useCallback((widgetId: string, size: WidgetSizeConstraint) => {
    if (!localLayout.includes(widgetId)) {
      setLocalLayout(prev => [...prev, widgetId]);
      setLocalSizes(prev => ({ ...prev, [widgetId]: size }));
      editMode.setPendingChanges(true);
    }
    setShowGallery(false);
  }, [localLayout, editMode]);

  const handleSaveChanges = useCallback(async () => {
    const sizesToSave: Record<string, string> = {};
    Object.entries(localSizes).forEach(([key, value]) => {
      sizesToSave[key] = String(value);
    });

    const success = await saveLayout(localLayout, sizesToSave);
    if (success) {
      lastSavedLayoutRef.current = localLayout;
      editMode.exitEditMode();
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 2000);
    }
  }, [localLayout, localSizes, saveLayout, editMode]);

  const handleResetChanges = useCallback(() => {
    setLocalLayout(layout);
    setLocalSizes(convertSizes(storedWidgetSizes, layout));
    editMode.setPendingChanges(false);
  }, [layout, storedWidgetSizes, convertSizes, editMode]);

  const handleCancelEdit = useCallback(() => {
    handleResetChanges();
    editMode.exitEditMode();
  }, [handleResetChanges, editMode]);

  if (showAdminDashboard) {
    return <AdminDashboardPage />;
  }

  if (isLoading || widgetsLoading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  const dbWidgetIds = new Set(dashboardWidgets.map(dw => dw.widget_id));
  const allWidgetItems = localLayout.map(id => ({
    id,
    source: dbWidgetIds.has(id) ? 'db' as const : 'layout' as const,
  }));

  return (
    <div className="bg-slate-50">
      <div className="max-w-[1600px] mx-auto">
        <DashboardHeader
          userName={user?.email?.split('@')[0] || 'User'}
          isViewingAsCustomer={isViewingAsCustomer}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          customizeButton={
            <InlineEditToolbar
              isEditing={editMode.state.isEditing}
              hasChanges={editMode.state.pendingChanges}
              onEnterEdit={editMode.enterEditMode}
              onExitEdit={handleCancelEdit}
              onSave={handleSaveChanges}
              onReset={handleResetChanges}
              onAddWidget={() => setShowGallery(true)}
            />
          }
        />

        {saveNotification && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Dashboard layout saved!
          </div>
        )}

        {autoSaveNotification && (
          <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Layout saved
          </div>
        )}

        {addWidgetNotification && (
          <div className="fixed top-4 right-4 bg-orange-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            Widget added to dashboard!
          </div>
        )}

        {effectiveCustomerId && (
          <div className="mb-6">
            <UnifiedInsightsCard
              customerId={effectiveCustomerId}
              isAdmin={isAdmin()}
              dateRange={{
                start: new Date(startDate),
                end: new Date(endDate),
              }}
            />
          </div>
        )}

        <WidgetGrid
          widgets={allWidgetItems}
          customWidgets={customWidgets}
          widgetSizes={localSizes}
          customerId={customerId?.toString()}
          startDate={startDate}
          endDate={endDate}
          isEditMode={editMode.state.isEditing}
          selectedWidgetId={editMode.state.selectedWidgetId}
          onWidgetSelect={editMode.selectWidget}
          onWidgetRemove={handleWidgetRemove}
          onWidgetSizeChange={handleWidgetSizeChange}
          onReorder={handleReorder}
          allowHoverDrag={true}
        />

        <AIReportsSection
          aiWidgets={aiWidgets}
          customerId={customerId?.toString()}
          isAdmin={isAdmin()}
          onRemoveWidget={handleRemoveAIWidget}
        />

        <WidgetGalleryModal
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onAddWidget={handleAddWidget}
          currentWidgets={localLayout}
          isAdmin={isAdmin()}
        />

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes wiggle {
            0%, 100% { transform: rotate(-0.3deg); }
            50% { transform: rotate(0.3deg); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes scale-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
          .animate-shimmer {
            animation: shimmer 1.5s infinite;
          }
          .animate-scale-in {
            animation: scale-in 0.15s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
}
