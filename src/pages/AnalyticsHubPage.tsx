import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Search, ChevronDown, Calendar, ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardAlertProvider } from '../contexts/DashboardAlertContext';
import { AlertInspectorPanel } from '../components/dashboard/widgets';
import { WidgetGrid, InlineEditToolbar, WidgetGalleryModal } from '../components/dashboard';
import { CarrierAnalyticsSection } from '../components/dashboard/carrieranalyticssection';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { useDashboardWidgets } from '../hooks/useDashboardWidgets';
import { useDashboardEditMode } from '../hooks/useDashboardEditMode';
import { widgetLibrary } from '../config/widgetLibrary';
import { clampWidgetSize, WidgetSizeConstraint, getDefaultSize } from '../config/widgetConstraints';
import { loadCustomWidget } from '../config/widgets/customWidgetStorage';
import { supabase } from '../lib/supabase';

type WidgetSizeValue = 1 | 2 | 3 | 4;

const DATE_RANGE_OPTIONS = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
];

const DEFAULT_WIDGET_LAYOUT = [
  'flow_map',
  'total_shipments',
  'total_cost',
  'on_time_pct',
  'monthly_spend',
  'carrier_mix',
  'cost_by_state',
  'avg_cost_shipment',
  'in_transit',
  'delivered_month',
  'spend_by_carrier',
  'avg_transit_days',
  'mode_breakdown',
  'top_lanes',
];

export function AnalyticsHubPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('last30');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [saveNotification, setSaveNotification] = useState(false);
  const { isAdmin, effectiveCustomerIds, effectiveCustomerId } = useAuth();

  const customerId = effectiveCustomerIds.length > 0 ? effectiveCustomerIds[0] : undefined;

  const {
    layout,
    widgetSizes: storedWidgetSizes,
    isLoading,
    saveLayout,
  } = useDashboardLayout(customerId);

  const { widgets: dashboardWidgets, loading: widgetsLoading } = useDashboardWidgets('overview');
  const editMode = useDashboardEditMode();

  const combinedLayout = useMemo(() => {
    const baseLayout = layout.length > 0 ? layout : DEFAULT_WIDGET_LAYOUT;
    const dbWidgetIds = dashboardWidgets.map(dw => dw.widget_id);
    const newWidgets = dbWidgetIds.filter(id => !baseLayout.includes(id));
    return [...baseLayout, ...newWidgets];
  }, [layout, dashboardWidgets]);

  const [localLayout, setLocalLayout] = useState<string[]>(combinedLayout);
  const [localSizes, setLocalSizes] = useState<Record<string, WidgetSizeValue>>({});
  const [customWidgets, setCustomWidgets] = useState<Record<string, unknown>>({});

  const currentDateOption = DATE_RANGE_OPTIONS.find(opt => opt.value === dateRange);

  const convertSizes = useCallback((
    sizes: Record<string, string>,
    currentLayout: string[]
  ): Record<string, WidgetSizeValue> => {
    const converted: Record<string, WidgetSizeValue> = {};

    Object.entries(sizes).forEach(([key, value]) => {
      if (value === 'default' || value === '1') converted[key] = 1;
      else if (value === 'large' || value === 'expanded' || value === '2') converted[key] = 2;
      else if (value === 'xlarge' || value === 'full' || value === '3') converted[key] = 3;
      else if (value === '4') converted[key] = 4;
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
      setLocalLayout(combinedLayout);
      setLocalSizes(convertSizes(storedWidgetSizes, combinedLayout));
    }
  }, [combinedLayout, storedWidgetSizes, editMode.state.isEditing, convertSizes]);

  useEffect(() => {
    const loadCustomWidgetsFromStorage = async () => {
      const widgets: Record<string, unknown> = {};
      const dbWidgetIds = new Set(dashboardWidgets.map(dw => dw.widget_id));
      const allWidgetIds = new Set([
        ...dashboardWidgets.map(dw => dw.widget_id),
        ...localLayout.filter(id => !dbWidgetIds.has(id)),
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

    if (dashboardWidgets.length > 0 || localLayout.length > 0) {
      loadCustomWidgetsFromStorage();
    }
  }, [dashboardWidgets, localLayout, effectiveCustomerId, isAdmin]);

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateRange) {
      case 'last7': start = subDays(now, 7); break;
      case 'last30': start = subDays(now, 30); break;
      case 'last90': start = subDays(now, 90); break;
      case 'thisMonth': start = startOfMonth(now); end = endOfMonth(now); break;
      case 'lastMonth': start = startOfMonth(subMonths(now, 1)); end = endOfMonth(subMonths(now, 1)); break;
      default: start = subDays(now, 30);
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  const filteredWidgets = useMemo(() => {
    const validWidgets = localLayout.filter(widgetId => {
      if (widgetLibrary[widgetId]) return true;
      if (customWidgets[widgetId]) return true;
      return false;
    });

    if (!searchQuery.trim()) return validWidgets;

    const query = searchQuery.toLowerCase();
    return validWidgets.filter(widgetId => {
      const widget = widgetLibrary[widgetId] || customWidgets[widgetId];
      if (!widget) return false;

      const widgetDef = widget as { name?: string; description?: string; category?: string };
      return (
        widgetDef.name?.toLowerCase().includes(query) ||
        widgetDef.description?.toLowerCase().includes(query) ||
        widgetDef.category?.toLowerCase().includes(query)
      );
    });
  }, [localLayout, searchQuery, customWidgets]);

  const handleBackToPulse = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

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
    editMode.setPendingChanges(true);
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
      editMode.exitEditMode();
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 2000);
    }
  }, [localLayout, localSizes, saveLayout, editMode]);

  const handleResetChanges = useCallback(() => {
    const effectiveLayout = layout.length > 0 ? layout : DEFAULT_WIDGET_LAYOUT;
    setLocalLayout(effectiveLayout);
    setLocalSizes(convertSizes(storedWidgetSizes, effectiveLayout));
    editMode.setPendingChanges(false);
  }, [layout, storedWidgetSizes, convertSizes, editMode]);

  const handleCancelEdit = useCallback(() => {
    handleResetChanges();
    editMode.exitEditMode();
  }, [handleResetChanges, editMode]);

  const handleAskAI = useCallback(() => {
    navigate('/ai-studio?query=' + encodeURIComponent('Help me analyze my logistics data'));
  }, [navigate]);

  if (isLoading || widgetsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-600">Loading your analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <DashboardAlertProvider customerId={customerId}>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-[1600px] mx-auto px-6 py-6">

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToPulse}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Back to Pulse"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics Hub</h1>
                <p className="text-slate-500 mt-0.5">
                  {localLayout.length} widget{localLayout.length !== 1 ? 's' : ''} - Drag to reorder, resize as needed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAskAI}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Ask AI</span>
              </button>

              <InlineEditToolbar
                isEditing={editMode.state.isEditing}
                hasChanges={editMode.state.pendingChanges}
                onEnterEdit={editMode.enterEditMode}
                onExitEdit={handleCancelEdit}
                onSave={handleSaveChanges}
                onReset={handleResetChanges}
                onAddWidget={() => setShowGallery(true)}
              />

              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-sm"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">{currentDateOption?.label}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                </button>

                {showDatePicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                      {DATE_RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setDateRange(option.value);
                            setShowDatePicker(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            option.value === dateRange
                              ? 'bg-orange-50 text-orange-600 font-medium'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {saveNotification && (
            <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slide-in">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Layout saved!
            </div>
          )}

          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search widgets..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="mb-4 text-sm text-slate-500">
              {filteredWidgets.length === 0 ? (
                <span>No widgets match "{searchQuery}"</span>
              ) : (
                <span>
                  Showing {filteredWidgets.length} of {localLayout.length} widgets
                </span>
              )}
            </div>
          )}

          {filteredWidgets.length > 0 ? (
            <WidgetGrid
              widgets={filteredWidgets.map(id => ({ id, source: 'layout' as const }))}
              customWidgets={customWidgets}
              widgetSizes={localSizes}
              customerId={customerId?.toString()}
              startDate={startDate}
              endDate={endDate}
              comparisonDates={null}
              isEditMode={editMode.state.isEditing}
              selectedWidgetId={editMode.state.selectedWidgetId}
              onWidgetSelect={editMode.selectWidget}
              onWidgetRemove={handleWidgetRemove}
              onWidgetSizeChange={handleWidgetSizeChange}
              onReorder={handleReorder}
              allowHoverDrag={true}
            />
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Plus className="w-10 h-10 text-slate-400" />
                </div>
                {searchQuery ? (
                  <>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      No widgets match your search
                    </h3>
                    <p className="text-slate-500 mb-6">
                      Try a different search term or clear the filter
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                    >
                      Clear Search
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Build Your Analytics Dashboard
                    </h3>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                      Add widgets to create your personalized analytics view.
                      Drag to reorder, resize to fit your needs.
                    </p>
                    <button
                      onClick={() => setShowGallery(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Add Your First Widget
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {filteredWidgets.length > 0 && !editMode.state.isEditing && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowGallery(true)}
                className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add more widgets</span>
              </button>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Carrier Analytics</h2>
            <CarrierAnalyticsSection
              customerId={effectiveCustomerId}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        </div>

        <WidgetGalleryModal
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onAddWidget={handleAddWidget}
          currentWidgets={localLayout}
          isAdmin={isAdmin()}
          customerId={customerId}
        />
      </div>

      <AlertInspectorPanel />

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
      `}</style>
    </DashboardAlertProvider>
  );
}

export default AnalyticsHubPage;
