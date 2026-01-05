# Analytics Hub Full Widget Implementation

## Overview
This transforms the Analytics Hub from empty sections into the full widget dashboard with:
- All existing widgets (flow_map, cost_by_state, carrier_mix, etc.)
- Organized by section (Geographic, Volume, Financial, Performance, Breakdown)
- Same drag/drop, resize, and customization as the original dashboard
- Persisted layouts per customer

---

## PART 1: Update AnalyticsHubPage.tsx

Replace the entire `src/pages/AnalyticsHubPage.tsx` with:

```tsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Plus, Search, Truck, MapPin, DollarSign, Layers, Star, ChevronDown, ChevronRight, Calendar, Sparkles, ArrowLeft, Globe, BarChart3, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardAlertProvider } from '../contexts/DashboardAlertContext';
import { AlertInspectorPanel } from '../components/dashboard/widgets';
import {
  WidgetGrid,
  InlineEditToolbar,
  WidgetGalleryModal,
} from '../components/dashboard';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { useDashboardWidgets } from '../hooks/useDashboardWidgets';
import { useDashboardEditMode } from '../hooks/useDashboardEditMode';
import { widgetLibrary, getGlobalWidgets } from '../config/widgetLibrary';
import { clampWidgetSize, WidgetSizeConstraint, getDefaultSize } from '../config/widgetConstraints';
import { loadCustomWidget, loadAllCustomWidgets } from '../config/widgets/customWidgetStorage';
import { supabase } from '../lib/supabase';

type WidgetSizeValue = 1 | 2 | 3;

const ICON_MAP: Record<string, React.ElementType> = {
  globe: Globe,
  truck: Truck,
  map: MapPin,
  dollar: DollarSign,
  layers: Layers,
  star: Star,
  chart: BarChart3,
  clock: Clock,
};

// Widget categorization - which widgets go in which section
const WIDGET_SECTIONS: Record<string, string[]> = {
  'geographic': ['flow_map', 'cost_by_state'],
  'volume': ['total_shipments', 'in_transit', 'delivered_month'],
  'financial': ['total_cost', 'avg_cost_shipment', 'monthly_spend'],
  'performance': ['on_time_pct', 'avg_transit_days', 'carrier_performance'],
  'breakdown': ['mode_breakdown', 'carrier_mix', 'top_lanes'],
};

const DEFAULT_SECTIONS = [
  { id: 'geographic', title: 'Geographic Analysis', description: 'Flow maps and regional cost analysis', icon: 'globe', order: 1 },
  { id: 'volume', title: 'Volume Metrics', description: 'Shipment counts and delivery tracking', icon: 'truck', order: 2 },
  { id: 'financial', title: 'Financial Analytics', description: 'Spend tracking and cost analysis', icon: 'dollar', order: 3 },
  { id: 'performance', title: 'Performance Metrics', description: 'On-time delivery and transit times', icon: 'clock', order: 4 },
  { id: 'breakdown', title: 'Breakdowns', description: 'Mode, carrier, and lane analysis', icon: 'chart', order: 5 },
  { id: 'custom', title: 'My Analytics', description: 'Your pinned reports and custom widgets', icon: 'star', order: 6 },
];

const DATE_RANGE_OPTIONS = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
];

// Default layout for new users - all widgets in their sections
const DEFAULT_WIDGET_LAYOUT = [
  'flow_map',
  'cost_by_state',
  'total_shipments',
  'in_transit',
  'delivered_month',
  'total_cost',
  'avg_cost_shipment',
  'monthly_spend',
  'on_time_pct',
  'avg_transit_days',
  'mode_breakdown',
  'carrier_mix',
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
  const { user, isAdmin, effectiveCustomerIds, isViewingAsCustomer, effectiveCustomerId } = useAuth();
  
  const customerId = effectiveCustomerIds.length > 0 ? effectiveCustomerIds[0] : undefined;

  // Use the existing dashboard layout hook for persistence
  const {
    layout,
    widgetSizes: storedWidgetSizes,
    isLoading,
    saveLayout,
  } = useDashboardLayout(customerId);

  const { widgets: dashboardWidgets, loading: widgetsLoading } = useDashboardWidgets('overview');
  const editMode = useDashboardEditMode();

  const [localLayout, setLocalLayout] = useState<string[]>(layout.length > 0 ? layout : DEFAULT_WIDGET_LAYOUT);
  const [localSizes, setLocalSizes] = useState<Record<string, WidgetSizeValue>>({});
  const [customWidgets, setCustomWidgets] = useState<Record<string, unknown>>({});

  const currentDateOption = DATE_RANGE_OPTIONS.find(opt => opt.value === dateRange);

  // Convert stored sizes to numeric values
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

    // Set default sizes for widgets not in stored sizes
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

  // Sync local state with stored layout
  useEffect(() => {
    if (!editMode.state.isEditing) {
      const effectiveLayout = layout.length > 0 ? layout : DEFAULT_WIDGET_LAYOUT;
      setLocalLayout(effectiveLayout);
      setLocalSizes(convertSizes(storedWidgetSizes, effectiveLayout));
    }
  }, [layout, storedWidgetSizes, editMode.state.isEditing, convertSizes]);

  // Load custom widgets
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

  // Get widgets for a specific section
  const getWidgetsForSection = (sectionId: string) => {
    const sectionWidgetIds = WIDGET_SECTIONS[sectionId] || [];
    return localLayout
      .filter(id => sectionWidgetIds.includes(id))
      .map(id => ({ id, source: 'layout' as const }));
  };

  // Handler functions
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

  // Filter sections based on search
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
          {/* Header */}
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
              {/* Edit Mode Toolbar */}
              <InlineEditToolbar
                isEditing={editMode.state.isEditing}
                hasChanges={editMode.state.pendingChanges}
                onEnterEdit={editMode.enterEditMode}
                onExitEdit={handleCancelEdit}
                onSave={handleSaveChanges}
                onReset={handleResetChanges}
                onAddWidget={() => setShowGallery(true)}
              />

              {/* Date Range Picker */}
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

          {/* Save Notification */}
          {saveNotification && (
            <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Layout saved!
            </div>
          )}

          {/* Search */}
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

          {/* Sections with Widgets */}
          <div className="space-y-6">
            {filteredSections.map((section) => {
              const Icon = ICON_MAP[section.icon] || Star;
              const isCollapsed = collapsedSections.has(section.id);
              const sectionWidgets = getWidgetsForSection(section.id);
              const hasWidgets = sectionWidgets.length > 0;

              return (
                <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Section Header */}
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
                      {hasWidgets && (
                        <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                          {sectionWidgets.length} widget{sectionWidgets.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                      {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Section Content - Widgets */}
                  {!isCollapsed && (
                    <div className="p-5">
                      {hasWidgets ? (
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

        {/* Widget Gallery Modal */}
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
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>

      <AlertInspectorPanel />
    </DashboardAlertProvider>
  );
}
```

---

## PART 2: Update WidgetGrid Props (if needed)

Check if WidgetGrid has the `comparisonDates` prop. If it shows an error, you may need to make it optional. In `src/components/dashboard/WidgetGrid.tsx`, update the interface:

```tsx
interface WidgetGridProps {
  widgets: WidgetItem[];
  customWidgets: Record<string, unknown>;
  widgetSizes: Record<string, WidgetSizeValue>;
  customerId: string | undefined;
  startDate: string;
  endDate: string;
  comparisonDates?: { start: string; end: string } | null;  // Make optional
  isEditMode?: boolean;
  selectedWidgetId?: string | null;
  onWidgetSelect?: (widgetId: string | null) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetSizeChange?: (widgetId: string, size: WidgetSizeValue) => void;
  onReorder?: (newOrder: string[]) => void;
  allowHoverDrag?: boolean;
}
```

---

## PART 3: Add Analytics to Sidebar Navigation

In `src/components/Sidebar.tsx`, update the imports and mainNavItems:

```tsx
// Add BarChart3 to imports
import { LayoutDashboard, Truck, Users, Building2, FileText, X, UserCog, Settings, BookOpen, Search, LucideIcon, Bookmark, ChevronDown, Pin, HelpCircle, Eye, Activity, BarChart3 } from 'lucide-react';

// Update mainNavItems (around line 49)
const mainNavItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Pulse' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  {
    to: '/analyze',
    icon: Search,
    label: 'Analyze',
    matchPaths: ['/analyze', '/ai-studio', '/custom-reports', '/create']
  },
  {
    to: '/reports',
    icon: FileText,
    label: 'Reports',
    matchPaths: ['/reports', '/scheduled-reports', '/ai-reports']
  },
  { to: '/carriers', icon: Building2, label: 'Carriers' },
];
```

---

## Summary

After pasting this code:

1. **Analytics Hub** will show all widgets organized by section:
   - **Geographic**: Flow Map, Cost by State
   - **Volume**: Total Shipments, In Transit, Delivered
   - **Financial**: Total Cost, Avg Cost, Monthly Spend
   - **Performance**: On-Time %, Avg Transit Days
   - **Breakdowns**: Mode, Carrier Mix, Top Lanes

2. **Same functionality** as original dashboard:
   - Drag to reorder
   - Resize widgets (Small/Medium/Large)
   - Edit mode with save/cancel
   - Add widgets from gallery
   - Layouts persist per customer

3. **Navigation**: Sidebar shows Pulse → Analytics path

4. **Pulse Dashboard** remains as the quick health check with core KPIs
