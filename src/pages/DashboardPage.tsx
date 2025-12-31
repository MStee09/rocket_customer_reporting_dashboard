import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, addMonths, addDays, subYears } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { AIInsightsCard } from '../components/dashboard/AIInsightsCard';
import { AIReportWidgetConfig } from '../components/ai-studio';
import {
  DashboardHeader,
  ComparisonMetrics,
  AIReportsSection,
  WidgetGrid,
  AIInsightsPanel,
  InlineEditToolbar,
  WidgetGalleryModal,
} from '../components/dashboard';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { useDashboardWidgets } from '../hooks/useDashboardWidgets';
import { useComparisonStats } from '../hooks/useComparisonStats';
import { useDashboardEditMode } from '../hooks/useDashboardEditMode';
import { widgetLibrary, getGlobalWidgets } from '../config/widgetLibrary';
import { AdminDashboardPage } from './AdminDashboardPage';
import { loadCustomWidget, loadAllCustomWidgets } from '../config/widgets/customWidgetStorage';
import { supabase } from '../lib/supabase';
import { WidgetSizeConstraint } from '../config/widgetConstraints';

type ComparisonType = 'previous' | 'lastYear' | 'custom';

interface ComparisonConfig {
  enabled: boolean;
  type: ComparisonType;
  customRange?: { start: Date; end: Date };
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState('last6months');
  const [comparison, setComparison] = useState<ComparisonConfig | null>(null);
  const [showComparisonDropdown, setShowComparisonDropdown] = useState(false);
  const [saveNotification, setSaveNotification] = useState(false);
  const [addWidgetNotification, setAddWidgetNotification] = useState(false);
  const [aiWidgets, setAiWidgets] = useState<AIReportWidgetConfig[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const { user, isAdmin, effectiveCustomerIds, isViewingAsCustomer, effectiveCustomerId } = useAuth();
  const editMode = useDashboardEditMode();

  const showAdminDashboard = isAdmin() && !isViewingAsCustomer;
  const customerId = effectiveCustomerIds.length > 0 ? effectiveCustomerIds[0] : undefined;

  const {
    layout,
    widgetSizes: storedWidgetSizes,
    isLoading,
    saveLayout,
  } = useDashboardLayout(customerId);

  const { widgets: dashboardWidgets, loading: widgetsLoading } = useDashboardWidgets('overview');
  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSizeConstraint>>(
    Object.fromEntries(Object.entries(storedWidgetSizes).map(([k, v]) => [k, (v === 'large' ? 3 : v === 'expanded' ? 2 : 1) as WidgetSizeConstraint]))
  );
  const [customWidgets, setCustomWidgets] = useState<Record<string, unknown>>({});
  const [availableWidgets, setAvailableWidgets] = useState<Array<{ id: string; name: string; description: string; type: string; iconColor?: string; category?: string }>>([]);
  const [editLayout, setEditLayout] = useState<string[]>([]);
  const [editSizes, setEditSizes] = useState<Record<string, WidgetSizeConstraint>>({});
  const [hasEditChanges, setHasEditChanges] = useState(false);

  useEffect(() => {
    const converted = Object.fromEntries(
      Object.entries(storedWidgetSizes).map(([k, v]) => [k, (v === 'large' ? 3 : v === 'expanded' ? 2 : 1) as WidgetSizeConstraint])
    );
    setWidgetSizes(converted);
  }, [storedWidgetSizes]);

  useEffect(() => {
    const loadCustomWidgetsFromStorage = async () => {
      const widgets: Record<string, any> = {};
      const missingWidgetIds: string[] = [];
      const dbWidgetIds = new Set(dashboardWidgets.map(dw => dw.widget_id));
      const allWidgetIds = new Set([
        ...dashboardWidgets.map(dw => dw.widget_id),
        ...layout.filter(id => !dbWidgetIds.has(id)),
      ]);

      for (const widgetId of allWidgetIds) {
        if (widgetLibrary[widgetId]) {
          continue;
        }
        const customWidget = await loadCustomWidget(
          supabase,
          widgetId,
          isAdmin(),
          effectiveCustomerId || undefined
        );
        if (customWidget) {
          widgets[widgetId] = customWidget;
        } else {
          missingWidgetIds.push(widgetId);
        }
      }
      setCustomWidgets(widgets);

      if (missingWidgetIds.length > 0 && layout.some(id => missingWidgetIds.includes(id))) {
        const cleanedLayout = layout.filter(id => !missingWidgetIds.includes(id) || widgetLibrary[id]);
        if (cleanedLayout.length !== layout.length) {
          saveLayout(cleanedLayout, widgetSizes);
        }
      }
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
        iconColor: w.display?.iconColor || w.iconColor || 'bg-rocket-600',
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
      if (e.key === 'dashboard_ai_widgets') {
        loadAIWidgets();
      }
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
        saveLayout(newLayout, widgetSizes).then((success) => {
          if (success) {
            setAddWidgetNotification(true);
            setTimeout(() => setAddWidgetNotification(false), 3000);
          }
        });
      }
      searchParams.delete('addWidget');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, isLoading, layout, widgetSizes, saveLayout, setSearchParams]);

  const { start: startDate, end: endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateRange) {
      case 'last7':
        start = subDays(now, 7);
        break;
      case 'last30':
        start = subDays(now, 30);
        break;
      case 'last90':
        start = subDays(now, 90);
        break;
      case 'last6months':
        start = subMonths(now, 6);
        break;
      case 'lastyear':
        start = subMonths(now, 12);
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'thisQuarter':
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case 'thisYear':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'upcoming':
        start = now;
        end = addMonths(now, 12);
        break;
      case 'next30':
        start = now;
        end = addDays(now, 30);
        break;
      case 'next90':
        start = now;
        end = addDays(now, 90);
        break;
      default:
        start = subMonths(now, 6);
    }

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  const comparisonDates = useMemo(() => {
    if (!comparison?.enabled) return null;

    const currentStart = new Date(startDate);
    const currentEnd = new Date(endDate);

    if (comparison.type === 'custom' && comparison.customRange) {
      return {
        start: format(comparison.customRange.start, 'yyyy-MM-dd'),
        end: format(comparison.customRange.end, 'yyyy-MM-dd'),
      };
    }

    if (comparison.type === 'lastYear') {
      return {
        start: format(subYears(currentStart, 1), 'yyyy-MM-dd'),
        end: format(subYears(currentEnd, 1), 'yyyy-MM-dd'),
      };
    }

    const duration = currentEnd.getTime() - currentStart.getTime();
    const dayInMs = 86400000;

    return {
      start: format(new Date(currentStart.getTime() - duration - dayInMs), 'yyyy-MM-dd'),
      end: format(new Date(currentStart.getTime() - dayInMs), 'yyyy-MM-dd'),
    };
  }, [comparison, startDate, endDate]);

  const { currentStats, comparisonStats, isLoading: comparisonLoading } = useComparisonStats(
    effectiveCustomerIds,
    isAdmin(),
    isViewingAsCustomer,
    startDate,
    endDate,
    comparisonDates?.start || null,
    comparisonDates?.end || null
  );

  const dateRangeLabel = useMemo(() => {
    const rangeLabels: Record<string, string> = {
      last7: 'Last 7 Days',
      last30: 'Last 30 Days',
      last90: 'Last 90 Days',
      last6months: 'Last 6 Months',
      lastyear: 'Last Year',
      thisMonth: 'This Month',
      thisQuarter: 'This Quarter',
      thisYear: 'This Year',
      next30: 'Next 30 Days',
      next90: 'Next 90 Days',
      upcoming: 'Upcoming',
    };
    return rangeLabels[dateRange] || dateRange;
  }, [dateRange]);

  const comparisonLabel = useMemo(() => {
    if (!comparison?.enabled) return '';
    if (comparison.type === 'previous') return 'Previous Period';
    if (comparison.type === 'lastYear') return 'Last Year';
    return 'Custom Period';
  }, [comparison]);

  const handleEnterEditMode = useCallback(() => {
    const dbWidgetIds = new Set(dashboardWidgets.map(dw => dw.widget_id));
    const currentLayout = [
      ...layout.filter(id => !dbWidgetIds.has(id)),
      ...dashboardWidgets.map(dw => dw.widget_id),
    ];
    setEditLayout(currentLayout);
    setEditSizes({ ...widgetSizes });
    setHasEditChanges(false);
    editMode.enterEditMode();
  }, [layout, dashboardWidgets, widgetSizes, editMode]);

  const handleExitEditMode = useCallback(() => {
    setHasEditChanges(false);
    editMode.exitEditMode();
  }, [editMode]);

  const handleSaveEditMode = useCallback(async () => {
    const sizeLevelMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(editSizes)) {
      sizeLevelMap[k] = v === 3 ? 'large' : v === 2 ? 'expanded' : 'default';
    }
    const success = await saveLayout(editLayout, sizeLevelMap);
    if (success) {
      setWidgetSizes(editSizes);
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 2000);
      editMode.exitEditMode();
      setHasEditChanges(false);
    }
  }, [editLayout, editSizes, saveLayout, editMode]);

  const handleResetLayout = useCallback(() => {
    const dbWidgetIds = new Set(dashboardWidgets.map(dw => dw.widget_id));
    const currentLayout = [
      ...layout.filter(id => !dbWidgetIds.has(id)),
      ...dashboardWidgets.map(dw => dw.widget_id),
    ];
    setEditLayout(currentLayout);
    setEditSizes({ ...widgetSizes });
    setHasEditChanges(false);
  }, [layout, dashboardWidgets, widgetSizes]);

  const handleWidgetRemove = useCallback((widgetId: string) => {
    setEditLayout(prev => prev.filter(id => id !== widgetId));
    setHasEditChanges(true);
  }, []);

  const handleWidgetSizeChange = useCallback((widgetId: string, size: WidgetSizeConstraint) => {
    setEditSizes(prev => ({ ...prev, [widgetId]: size }));
    setHasEditChanges(true);
  }, []);

  const handleReorder = useCallback((newOrder: string[]) => {
    setEditLayout(newOrder);
    setHasEditChanges(true);
  }, []);

  const handleAddWidget = useCallback((widgetId: string, size: WidgetSizeConstraint) => {
    setEditLayout(prev => [...prev, widgetId]);
    setEditSizes(prev => ({ ...prev, [widgetId]: size }));
    setHasEditChanges(true);
  }, []);

  if (showAdminDashboard) {
    return <AdminDashboardPage />;
  }

  if (isLoading || widgetsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  const dbWidgetIds = new Set(dashboardWidgets.map(dw => dw.widget_id));
  const allWidgets = [
    ...layout.filter(id => !dbWidgetIds.has(id)).map(id => ({ id, source: 'layout' as const })),
    ...dashboardWidgets.map(dw => ({ id: dw.widget_id, source: 'db' as const })),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-6 py-8 max-w-[1600px]">
        <DashboardHeader
          userName={user?.email?.split('@')[0] || 'User'}
          isViewingAsCustomer={isViewingAsCustomer}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          comparison={comparison}
          onComparisonChange={setComparison}
          showComparisonDropdown={showComparisonDropdown}
          onShowComparisonDropdownChange={setShowComparisonDropdown}
          comparisonDates={comparisonDates}
          onRefresh={() => window.location.reload()}
          customizeButton={
            <InlineEditToolbar
              isEditing={editMode.state.isEditing}
              hasChanges={hasEditChanges}
              onEnterEdit={handleEnterEditMode}
              onExitEdit={handleExitEditMode}
              onSave={handleSaveEditMode}
              onReset={handleResetLayout}
              onAddWidget={() => setShowGallery(true)}
            />
          }
        />

        {saveNotification && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            Dashboard layout saved successfully!
          </div>
        )}

        {addWidgetNotification && (
          <div className="fixed top-4 right-4 bg-rocket-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            Widget added to dashboard successfully!
          </div>
        )}

        {effectiveCustomerId && (
          <AIInsightsCard
            customerId={effectiveCustomerId}
            dateRange={{
              start: new Date(startDate),
              end: new Date(endDate),
            }}
            className="mb-6"
          />
        )}

        {comparison?.enabled && currentStats && comparisonStats && !comparisonLoading && (
          <ComparisonMetrics
            currentStats={currentStats}
            comparisonStats={comparisonStats}
            dateRangeLabel={dateRangeLabel}
            comparisonLabel={comparisonLabel}
          />
        )}

        <WidgetGrid
          widgets={editMode.state.isEditing
            ? editLayout.map(id => ({ id, source: 'layout' as const }))
            : allWidgets
          }
          customWidgets={customWidgets}
          widgetSizes={editMode.state.isEditing ? editSizes : widgetSizes}
          customerId={customerId?.toString()}
          startDate={startDate}
          endDate={endDate}
          comparisonDates={comparisonDates}
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
          currentWidgets={editMode.state.isEditing ? editLayout : allWidgets.map(w => w.id)}
          isAdmin={isAdmin()}
        />

        <style>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
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

      <AIInsightsPanel />
    </div>
  );
}
