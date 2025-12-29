import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, addMonths, addDays, subYears } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { LayoutEditorModal } from '../components/LayoutEditorModal';
import { AIInsightsCard } from '../components/dashboard/AIInsightsCard';
import { AIReportWidgetConfig } from '../components/ai-studio';
import {
  DashboardHeader,
  ComparisonMetrics,
  AIReportsSection,
  WidgetGrid,
} from '../components/dashboard';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { useDashboardWidgets } from '../hooks/useDashboardWidgets';
import { useComparisonStats } from '../hooks/useComparisonStats';
import { widgetLibrary, getGlobalWidgets } from '../config/widgetLibrary';
import { WidgetSizeLevel } from '../types/widgets';
import { AdminDashboardPage } from './AdminDashboardPage';
import { loadCustomWidget, loadAllCustomWidgets } from '../config/widgets/customWidgetStorage';
import { supabase } from '../lib/supabase';

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
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saveNotification, setSaveNotification] = useState(false);
  const [addWidgetNotification, setAddWidgetNotification] = useState(false);
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
  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSizeLevel>>(storedWidgetSizes);
  const [customWidgets, setCustomWidgets] = useState<Record<string, any>>({});
  const [availableWidgets, setAvailableWidgets] = useState<Array<{ id: string; name: string; description: string; type: string; iconColor?: string; category?: string }>>([]);

  useMemo(() => {
    setWidgetSizes(storedWidgetSizes);
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

  const handleSaveLayout = async (newOrder: string[], newSizes: Record<string, WidgetSizeLevel>) => {
    const success = await saveLayout(newOrder, newSizes);
    if (success) {
      setWidgetSizes(newSizes);
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 2000);
      setIsEditorOpen(false);
    }
  };

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
          onCustomize={() => setIsEditorOpen(true)}
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
          widgets={allWidgets}
          customWidgets={customWidgets}
          widgetSizes={widgetSizes}
          customerId={customerId?.toString()}
          startDate={startDate}
          endDate={endDate}
          comparisonDates={comparisonDates}
        />

        <AIReportsSection
          aiWidgets={aiWidgets}
          customerId={customerId?.toString()}
          isAdmin={isAdmin()}
          onRemoveWidget={handleRemoveAIWidget}
        />

        <LayoutEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          widgetOrder={layout}
          widgetSizes={widgetSizes}
          widgetLibrary={widgetLibrary}
          customWidgets={customWidgets}
          availableWidgets={availableWidgets}
          onSave={handleSaveLayout}
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
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}
