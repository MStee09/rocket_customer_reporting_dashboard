import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Plus, Search, Truck, MapPin, DollarSign, Layers, Star, ChevronDown, ChevronRight, Calendar, Sparkles, ArrowLeft, Globe, BarChart3, Clock, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardAlertProvider } from '../contexts/DashboardAlertContext';
import { AlertInspectorPanel } from '../components/dashboard/widgets';
import { WidgetGrid, InlineEditToolbar, WidgetGalleryModal, CarrierAnalyticsSection } from '../components/dashboard';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { useDashboardWidgets } from '../hooks/useDashboardWidgets';
import { useDashboardEditMode } from '../hooks/useDashboardEditMode';
import { widgetLibrary } from '../config/widgetLibrary';
import { clampWidgetSize, WidgetSizeConstraint, getDefaultSize } from '../config/widgetConstraints';
import { loadCustomWidget } from '../config/widgets/customWidgetStorage';
import { supabase } from '../lib/supabase';

type WidgetSizeValue = 1 | 2 | 3 | 4;

const ICON_MAP: Record<string, React.ElementType> = {
  globe: Globe,
  truck: Truck,
  map: MapPin,
  dollar: DollarSign,
  layers: Layers,
  star: Star,
  chart: BarChart3,
  clock: Clock,
  building: Building2,
};

const WIDGET_SECTIONS: Record<string, string[]> = {
  'geographic': ['flow_map', 'cost_by_state'],
  'volume': ['total_shipments', 'in_transit', 'delivered_month'],
  'financial': ['total_cost', 'avg_cost_shipment', 'monthly_spend'],
  'carrier-analytics': ['carrier_performance', 'carrier_mix', 'spend_by_carrier'],
  'performance': ['on_time_pct', 'avg_transit_days'],
  'breakdown': ['mode_breakdown', 'top_lanes'],
};

const DEFAULT_SECTIONS = [
  { id: 'geographic', title: 'Geographic Analysis', description: 'Flow maps and regional cost analysis', icon: 'globe', order: 1 },
  { id: 'volume', title: 'Volume Metrics', description: 'Shipment counts and delivery tracking', icon: 'truck', order: 2 },
  { id: 'financial', title: 'Financial Analytics', description: 'Spend tracking and cost analysis', icon: 'dollar', order: 3 },
  { id: 'carrier-analytics', title: 'Carrier Analytics', description: 'Carrier performance, spend distribution, and comparisons', icon: 'building', order: 4 },
  { id: 'performance', title: 'Performance Metrics', description: 'On-time delivery and transit times', icon: 'clock', order: 5 },
  { id: 'breakdown', title: 'Breakdowns', description: 'Mode and lane analysis', icon: 'chart', order: 6 },
  { id: 'custom', title: 'My Analytics', description: 'Your pinned reports and custom widgets', icon: 'star', order: 7 },
];

const DATE_RANGE_OPTIONS = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
];

const DEFAULT_WIDGET_LAYOUT = [
  'flow_map',
  'cost_by_state',
  'total_shipments',
  'in_transit',
  'delivered_month',
  'total_cost',
  'avg_cost_shipment',
  'monthly_spend',
  'carrier_performance',
  'carrier_mix',
  'spend_by_carrier',
  'on_time_pct',
  'avg_transit_days',
  'mode_breakdown',
  'top_lanes',
];

export function AnalyticsHubPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('last30');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
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

  // Combine stored layout with any widgets from dashboard_widgets that aren't in the layout yet
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

      console.log('[AnalyticsHub] Loading custom widgets...');
      console.log('[AnalyticsHub] dashboardWidgets:', dashboardWidgets);
      console.log('[AnalyticsHub] localLayout:', localLayout);
      console.log('[AnalyticsHub] allWidgetIds to load:', [...allWidgetIds]);

      for (const widgetId of allWidgetIds) {
        if (widgetLibrary[widgetId]) continue;
        console.log('[AnalyticsHub] Loading custom widget:', widgetId);
        const customWidget = await loadCustomWidget(
          supabase,
          widgetId,
          isAdmin(),
          effectiveCustomerId || undefined
        );
        if (customWidget) {
          console.log('[AnalyticsHub] Loaded widget:', widgetId, customWidget);
          widgets[widgetId] = customWidget;
        } else {
          console.log('[AnalyticsHub] Failed to load widget:', widgetId);
        }
      }
      console.log('[AnalyticsHub] Final customWidgets:', widgets);
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

  const getWidgetsForSection = (sectionId: string) => {
    // For the 'custom' section, show all widgets that aren't in other sections
    if (sectionId === 'custom') {
      const allSectionWidgetIds = Object.values(WIDGET_SECTIONS).flat();
      const customWidgetsList = localLayout
        .filter(id => !allSectionWidgetIds.includes(id))
        .map(id => ({ id, source: 'layout' as const }));
      console.log('[AnalyticsHub] Custom section widgets:', customWidgetsList, 'from localLayout:', localLayout);
      return customWidgetsList;
    }
    
    const sectionWidgetIds = WIDGET_SECTIONS[sectionId] || [];
    return localLayout
      .filter(id => sectionWidgetIds.includes(id))
      .map(id => ({ id, source: 'layout' as const }));
  };

  const handleAskAI = useCallback((sectionId: string) => {
    const section = DEFAULT_SECTIONS.find(s => s.id === sectionId);
    const query = `Help me analyze my ${section?.title.toLowerCase() || 'data'}. What insights can you find?`;
    navigate(`/ai-studio?query=${encodeURIComponent(query)}`);
  }, [navigate]);

  const handleBackToPulse = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

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

  const filteredSections = searchQuery
    ? DEFAULT_SECTIONS.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : DEFAULT_SECTIONS;

  if (isLoading || widgetsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading analytics...</div>
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
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics Hub</h1>
                <p className="text-slate-500 mt-1">Deep dive into your logistics data</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all"
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
            <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Layout saved!
            </div>
          )}

          <div className="relative max-w-md mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sections and widgets..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="space-y-6">
            {filteredSections.map((section) => {
              const Icon = ICON_MAP[section.icon] || Star;
              const isCollapsed = collapsedSections.has(section.id);
              const sectionWidgets = getWidgetsForSection(section.id);
              const hasWidgets = sectionWidgets.length > 0;

              return (
                <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-5 py-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="text-left">
                        <h2 className="font-semibold text-slate-900">{section.title}</h2>
                        <p className="text-sm text-slate-500">{section.description}</p>
                      </div>
                      {hasWidgets && section.id !== 'carrier-analytics' && (
                        <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                          {sectionWidgets.length} widget{sectionWidgets.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {section.id !== 'carrier-analytics' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAskAI(section.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Sparkles className="w-4 h-4" />
                          Ask AI
                        </button>
                      )}
                      {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="p-5">
                      {section.id === 'carrier-analytics' ? (
                        <CarrierAnalyticsSection
                          customerId={customerId}
                          startDate={startDate}
                          endDate={endDate}
                          onAskAI={(context) => navigate(`/ai-studio?query=${encodeURIComponent(context)}`)}
                        />
                      ) : hasWidgets ? (
                        <WidgetGrid
                          widgets={sectionWidgets}
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
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                            <Plus className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="text-slate-600 font-medium mb-1">No widgets yet</p>
                          <p className="text-sm text-slate-400 mb-4">Add widgets or pin reports to see them here</p>
                          <button
                            onClick={() => setShowGallery(true)}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            + Add your first widget
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredSections.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No sections match your search</p>
            </div>
          )}
        </div>

        <WidgetGalleryModal
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onAddWidget={handleAddWidget}
          currentWidgets={localLayout}
          isAdmin={isAdmin()}
        />
      </div>

      <AlertInspectorPanel />
    </DashboardAlertProvider>
  );
}
