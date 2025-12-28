import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RefreshCw, Layout, Sparkles } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, addMonths, addDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { DashboardWidgetCard } from '../components/DashboardWidgetCard';
import { LayoutEditorModal } from '../components/LayoutEditorModal';
import { AIReportWidget } from '../components/dashboard/AIReportWidget';
import { AIInsightsCard } from '../components/dashboard/AIInsightsCard';
import { AIReportWidgetConfig } from '../components/ai-studio';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { useDashboardWidgets } from '../hooks/useDashboardWidgets';
import { widgetLibrary, getEffectiveColSpan, getScaleFactor } from '../config/widgetLibrary';
import { WidgetSizeLevel } from '../types/widgets';
import { AdminDashboardPage } from './AdminDashboardPage';
import { loadCustomWidget, loadAllCustomWidgets } from '../config/widgets/customWidgetStorage';
import { supabase } from '../lib/supabase';
import { getGlobalWidgets } from '../config/widgetLibrary';

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('last6months');
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
        iconColor: w.display?.iconColor || w.iconColor || 'bg-blue-500',
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
    ...dashboardWidgets.map(dw => ({ id: dw.widget_id, source: 'db' as const, dbRecord: dw })),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-6 py-8 max-w-[1600px]">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Welcome back, {user?.email?.split('@')[0]}!
            </h1>
            <p className="text-slate-600">
              {isViewingAsCustomer ? 'Viewing customer dashboard' : 'Your logistics dashboard'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="last6months">Last 6 Months</option>
              <option value="lastyear">Last Year</option>
              <option value="thisMonth">This Month</option>
              <option value="thisQuarter">This Quarter</option>
              <option value="thisYear">This Year</option>
              <option value="next30">Next 30 Days</option>
              <option value="next90">Next 90 Days</option>
              <option value="upcoming">Upcoming (Next Year)</option>
            </select>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setIsEditorOpen(true)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors text-sm"
            >
              <Layout className="w-4 h-4" />
              Customize
            </button>
          </div>
        </div>

        {saveNotification && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            Dashboard layout saved successfully!
          </div>
        )}

        {addWidgetNotification && (
          <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
          {allWidgets.map((item) => {
            const widgetId = item.id;
            let widget = widgetLibrary[widgetId];
            let isCustom = false;

            if (!widget) {
              widget = customWidgets[widgetId];
              isCustom = true;
            }

            if (!widget) return null;

            const sizeLevel = widgetSizes[widgetId] || 'default';
            const colSpan = getEffectiveColSpan(widget.type, widget.size || 'small', sizeLevel);
            const scaleFactor = getScaleFactor(sizeLevel);

            return (
              <div key={widgetId} className={`${colSpan} transition-all duration-300 ease-out`}>
                <DashboardWidgetCard
                  widget={widget}
                  customerId={customerId?.toString()}
                  dateRange={{ start: startDate, end: endDate }}
                  isEditing={false}
                  isCustomWidget={isCustom}
                  sizeLevel={sizeLevel}
                  scaleFactor={scaleFactor}
                  onRemove={() => {}}
                  onCycleSize={() => {}}
                  onResetSize={() => {}}
                />
              </div>
            );
          })}
        </div>

        {aiWidgets.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-800">AI Reports</h2>
              </div>
              <button
                onClick={() => navigate('/ai-studio')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Create New Report
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aiWidgets.map((widget, index) => (
                <AIReportWidget
                  key={`${widget.reportId}-${index}`}
                  config={widget}
                  customerId={customerId?.toString()}
                  isAdmin={isAdmin()}
                  onRemove={() => handleRemoveAIWidget(index)}
                />
              ))}
            </div>
          </div>
        )}

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
