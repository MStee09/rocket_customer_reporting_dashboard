import { useState, useMemo, useEffect, createElement } from 'react';
import {
  X, Search, Plus, Star, TrendingUp,
  Package, DollarSign, PieChart, BarChart3, Map, Table, Globe,
  ChevronRight, ChevronDown, Sparkles, Lock, Paintbrush
} from 'lucide-react';
import { widgetLibrary, WidgetDefinition, WidgetCategory, WidgetScope, WidgetType, WidgetSize } from '../../config/widgetLibrary';
import { WidgetSkeleton } from './WidgetSkeleton';
import {
  getWidgetConstraints,
  isValidWidgetSize,
  getSizeLabel,
  WidgetSizeConstraint
} from '../../config/widgetConstraints';
import { loadAllCustomWidgets } from '../../config/widgets/customWidgetStorage';
import { supabase } from '../../lib/supabase';

interface WidgetGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widgetId: string, size: WidgetSizeConstraint) => void;
  currentWidgets: string[];
  isAdmin: boolean;
  customerId?: number;
}

interface WidgetWithMeta extends WidgetDefinition {
  isNew?: boolean;
  isRecommended?: boolean;
  isCustom?: boolean;
}

const typeIcons: Record<string, typeof Star> = {
  kpi: TrendingUp,
  featured_kpi: Star,
  bar_chart: BarChart3,
  line_chart: TrendingUp,
  pie_chart: PieChart,
  table: Table,
  map: Map,
  custom: Paintbrush,
};

const NEW_WIDGET_IDS = ['carrier_performance', 'cost_by_state'];
const RECOMMENDED_WIDGET_IDS = ['total_shipments', 'total_cost', 'monthly_spend', 'flow_map', 'carrier_mix', 'on_time_pct'];

export function WidgetGalleryModal({
  isOpen,
  onClose,
  onAddWidget,
  currentWidgets,
  isAdmin,
  customerId,
}: WidgetGalleryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWidget, setSelectedWidget] = useState<WidgetDefinition | null>(null);
  const [selectedSize, setSelectedSize] = useState<WidgetSizeConstraint>(1);
  const [expandedRecommended, setExpandedRecommended] = useState(true);
  const [expandedNew, setExpandedNew] = useState(true);
  const [expandedCustom, setExpandedCustom] = useState(true);
  const [showAllWidgets, setShowAllWidgets] = useState(false);

  const [customWidgetDefs, setCustomWidgetDefs] = useState<WidgetWithMeta[]>([]);
  const [loadingCustomWidgets, setLoadingCustomWidgets] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedWidget(null);
      setSelectedSize(1);
      setExpandedRecommended(true);
      setExpandedNew(true);
      setExpandedCustom(true);
      setShowAllWidgets(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const loadCustomWidgetsForGallery = async () => {
      if (!isOpen) return;

      setLoadingCustomWidgets(true);
      try {
        const customWidgets = await loadAllCustomWidgets(
          supabase,
          isAdmin,
          customerId
        );

        console.log('[WidgetGallery] Loaded custom widgets:', customWidgets.length);

        const widgetDefs: WidgetWithMeta[] = customWidgets.map(cw => ({
          id: cw.id,
          name: cw.name || 'Custom Widget',
          description: cw.description || 'Custom widget created in Visual Builder',
          category: 'breakdown' as WidgetCategory,
          scope: cw.createdBy?.customerName ? 'customer' : 'global' as WidgetScope,
          type: mapChartTypeToWidgetType(cw.chartType),
          size: 'medium' as WidgetSize,
          icon: 'Paintbrush',
          iconColor: 'bg-purple-500',
          adminOnly: false,
          isCustom: true,
          isNew: false,
          isRecommended: false,
          calculate: async () => null,
        }));

        setCustomWidgetDefs(widgetDefs);
      } catch (error) {
        console.error('[WidgetGallery] Error loading custom widgets:', error);
      } finally {
        setLoadingCustomWidgets(false);
      }
    };

    loadCustomWidgetsForGallery();
  }, [isOpen, isAdmin, customerId]);

  const mapChartTypeToWidgetType = (chartType?: string): WidgetType => {
    const mapping: Record<string, WidgetType> = {
      'bar': 'bar_chart',
      'line': 'line_chart',
      'pie': 'pie_chart',
      'kpi': 'kpi',
      'table': 'table',
      'grouped_bar': 'bar_chart',
    };
    return mapping[chartType || ''] || 'bar_chart';
  };

  useEffect(() => {
    if (selectedWidget) {
      const constraints = getWidgetConstraints(selectedWidget.id, selectedWidget.type);
      setSelectedSize(constraints.optimalSize);
    }
  }, [selectedWidget]);

  const allWidgets = useMemo((): WidgetWithMeta[] => {
    const libraryWidgets = Object.values(widgetLibrary)
      .filter(w => !(w.adminOnly && !isAdmin))
      .map(w => ({
        ...w,
        isNew: NEW_WIDGET_IDS.includes(w.id),
        isRecommended: RECOMMENDED_WIDGET_IDS.includes(w.id),
        isCustom: false,
      }));

    return [...libraryWidgets, ...customWidgetDefs];
  }, [isAdmin, customWidgetDefs]);

  const searchFilteredWidgets = useMemo(() => {
    if (!searchQuery) return allWidgets;
    const query = searchQuery.toLowerCase();
    return allWidgets.filter(w =>
      w.name.toLowerCase().includes(query) ||
      w.description.toLowerCase().includes(query) ||
      w.category.toLowerCase().includes(query)
    );
  }, [allWidgets, searchQuery]);

  const recommendedWidgets = useMemo(() =>
    searchFilteredWidgets.filter(w => w.isRecommended && !currentWidgets.includes(w.id)),
    [searchFilteredWidgets, currentWidgets]
  );

  const newWidgets = useMemo(() =>
    searchFilteredWidgets.filter(w => w.isNew && !w.isCustom && !currentWidgets.includes(w.id)),
    [searchFilteredWidgets, currentWidgets]
  );

  const customWidgets = useMemo(() =>
    searchFilteredWidgets.filter(w => w.isCustom && !currentWidgets.includes(w.id)),
    [searchFilteredWidgets, currentWidgets]
  );

  const standardWidgets = useMemo(() =>
    searchFilteredWidgets.filter(w => !w.isCustom),
    [searchFilteredWidgets]
  );

  const handleAdd = () => {
    if (selectedWidget) {
      onAddWidget(selectedWidget.id, selectedSize);
      onClose();
    }
  };

  const renderWidgetCard = (widget: WidgetWithMeta) => {
    const Icon = widget.isCustom ? Paintbrush : (typeIcons[widget.type] || Package);
    const isOnDashboard = currentWidgets.includes(widget.id);
    const isSelected = selectedWidget?.id === widget.id;

    return (
      <button
        key={widget.id}
        onClick={() => !isOnDashboard && setSelectedWidget(widget)}
        disabled={isOnDashboard}
        className={`
          p-4 rounded-xl border-2 text-left transition-all relative
          ${isOnDashboard
            ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
            : isSelected
              ? 'border-orange-500 bg-orange-50'
              : widget.isCustom
                ? 'border-purple-200 bg-purple-50 hover:border-purple-300'
                : widget.isNew
                  ? 'border-teal-200 bg-teal-50 hover:border-teal-300'
                  : widget.isRecommended
                    ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                    : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50'
          }
        `}
      >
        {widget.isNew && !isOnDashboard && !widget.isCustom && (
          <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-teal-500 text-white text-xs font-bold">
            NEW
          </span>
        )}
        {widget.isCustom && !isOnDashboard && (
          <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-bold">
            CUSTOM
          </span>
        )}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 ${widget.isCustom ? 'bg-purple-500' : widget.iconColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 text-sm">{widget.name}</span>
              {isOnDashboard && (
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Added</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{widget.description}</p>
          </div>
        </div>
      </button>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Widget Gallery</h2>
              <p className="text-sm text-slate-500">Choose widgets to add to your dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search widgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">

              {customWidgets.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedCustom(!expandedCustom)}
                    className="flex items-center gap-2 mb-3 w-full text-left"
                  >
                    <Paintbrush className="w-4 h-4 text-purple-500" />
                    <h3 className="text-sm font-semibold text-slate-700">My Custom Widgets</h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 text-xs font-semibold">
                      {customWidgets.length}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${expandedCustom ? '' : '-rotate-90'}`} />
                  </button>
                  {expandedCustom && (
                    <div className="grid grid-cols-2 gap-3">
                      {customWidgets.map(renderWidgetCard)}
                    </div>
                  )}
                </div>
              )}

              {loadingCustomWidgets && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  Loading custom widgets...
                </div>
              )}

              {recommendedWidgets.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedRecommended(!expandedRecommended)}
                    className="flex items-center gap-2 mb-3 w-full text-left"
                  >
                    <Star className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Recommended for You</h3>
                    <span className="text-xs text-slate-400">({recommendedWidgets.length})</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${expandedRecommended ? '' : '-rotate-90'}`} />
                  </button>
                  {expandedRecommended && (
                    <div className="grid grid-cols-2 gap-3">
                      {recommendedWidgets.slice(0, 6).map(renderWidgetCard)}
                    </div>
                  )}
                </div>
              )}

              {newWidgets.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedNew(!expandedNew)}
                    className="flex items-center gap-2 mb-3 w-full text-left"
                  >
                    <Sparkles className="w-4 h-4 text-teal-500" />
                    <h3 className="text-sm font-semibold text-slate-700">New Widgets</h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-600 text-xs font-semibold">
                      {newWidgets.length} new
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${expandedNew ? '' : '-rotate-90'}`} />
                  </button>
                  {expandedNew && (
                    <div className="grid grid-cols-2 gap-3">
                      {newWidgets.map(renderWidgetCard)}
                    </div>
                  )}
                </div>
              )}

              <div>
                <button
                  onClick={() => setShowAllWidgets(!showAllWidgets)}
                  className="flex items-center gap-2 mb-3 w-full text-left pt-4 border-t border-slate-200"
                >
                  <Package className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">All Standard Widgets</h3>
                  <span className="text-xs text-slate-400">({standardWidgets.length})</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${showAllWidgets ? '' : '-rotate-90'}`} />
                </button>
                {showAllWidgets && (
                  <div className="grid grid-cols-2 gap-3">
                    {standardWidgets.map(renderWidgetCard)}
                  </div>
                )}
              </div>

              {searchFilteredWidgets.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No widgets found</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-80 border-l border-slate-200 p-4 bg-slate-50 flex-shrink-0 flex flex-col">
            {selectedWidget ? (
              <>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Preview</div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
                    <div className={`w-6 h-6 ${(selectedWidget as WidgetWithMeta).isCustom ? 'bg-purple-500' : selectedWidget.iconColor} rounded-lg flex items-center justify-center`}>
                      {createElement((selectedWidget as WidgetWithMeta).isCustom ? Paintbrush : (typeIcons[selectedWidget.type] || Package), { className: 'w-3 h-3 text-white' })}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{selectedWidget.name}</span>
                    {(selectedWidget as WidgetWithMeta).isCustom && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 text-xs">Custom</span>
                    )}
                  </div>
                  <div className="p-3">
                    <WidgetSkeleton widgetType={selectedWidget.type} size={selectedSize} showHeader={false} />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-medium text-slate-500 mb-2">Size</div>
                  <div className="flex gap-2">
                    {([1, 2, 3] as WidgetSizeConstraint[]).map((size) => {
                      const isValid = isValidWidgetSize(size, selectedWidget.id, selectedWidget.type);
                      const isActive = selectedSize === size;
                      const constraints = getWidgetConstraints(selectedWidget.id, selectedWidget.type);
                      const isOptimal = size === constraints.optimalSize;

                      return (
                        <button
                          key={size}
                          onClick={() => isValid && setSelectedSize(size)}
                          disabled={!isValid}
                          className={`
                            flex-1 py-2.5 rounded-lg text-sm font-medium transition-all relative
                            ${isActive ? 'bg-orange-500 text-white' : isValid ? 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                          `}
                        >
                          {!isValid && <Lock className="w-3 h-3 absolute top-1 right-1 text-slate-400" />}
                          {getSizeLabel(size)}
                          {isOptimal && isValid && !isActive && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-sm text-slate-600 mb-4">{selectedWidget.description}</div>

                <button
                  onClick={handleAdd}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors mt-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add to Dashboard
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ChevronRight className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">Select a widget</p>
                  <p className="text-sm text-slate-400 mt-1">Click any widget to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
