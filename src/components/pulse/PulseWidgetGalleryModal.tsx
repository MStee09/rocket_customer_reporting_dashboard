import { useState, useMemo, useEffect, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Search, Plus, Star, TrendingUp,
  Package, DollarSign, PieChart, BarChart3, Map, Table,
  ChevronRight, ChevronDown, Sparkles, ExternalLink, Layers
} from 'lucide-react';
import { widgetLibrary, WidgetDefinition } from '../../config/widgetLibrary';
import { loadAllCustomWidgets } from '../../config/widgets/customWidgetStorage';
import { CustomWidgetDefinition } from '../../config/widgets/customWidgetTypes';
import { supabase } from '../../lib/supabase';
import { WidgetSkeleton } from '../dashboard/WidgetSkeleton';
import {
  getWidgetConstraints,
  isValidWidgetSize,
  getSizeLabel,
  WidgetSizeConstraint
} from '../../config/widgetConstraints';

interface PulseWidgetGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widgetId: string) => void;
  currentWidgets: string[];
  customerId: number;
  isAdmin: boolean;
}

interface WidgetWithMeta extends WidgetDefinition {
  isNew?: boolean;
  isRecommended?: boolean;
}

interface CustomWidgetWithMeta extends CustomWidgetDefinition {
  isCustom: true;
}

type AnyWidget = WidgetWithMeta | CustomWidgetWithMeta;

const typeIcons: Record<string, typeof Star> = {
  kpi: TrendingUp,
  featured_kpi: Star,
  bar_chart: BarChart3,
  line_chart: TrendingUp,
  pie_chart: PieChart,
  table: Table,
  map: Map,
};

const RECOMMENDED_WIDGET_IDS = ['total_shipments', 'total_cost', 'monthly_spend', 'carrier_mix', 'on_time_pct'];

function isCustomWidgetType(widget: AnyWidget): widget is CustomWidgetWithMeta {
  return 'isCustom' in widget && widget.isCustom === true;
}

export function PulseWidgetGalleryModal({
  isOpen,
  onClose,
  onAddWidget,
  currentWidgets,
  customerId,
  isAdmin,
}: PulseWidgetGalleryModalProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWidget, setSelectedWidget] = useState<AnyWidget | null>(null);
  const [expandedRecommended, setExpandedRecommended] = useState(true);
  const [expandedCustom, setExpandedCustom] = useState(true);
  const [showAllWidgets, setShowAllWidgets] = useState(false);
  const [customWidgets, setCustomWidgets] = useState<CustomWidgetDefinition[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedWidget(null);
      setExpandedRecommended(true);
      setExpandedCustom(true);
      setShowAllWidgets(false);
      loadCustomWidgets();
    }
  }, [isOpen, customerId, isAdmin]);

  const loadCustomWidgets = async () => {
    setIsLoadingCustom(true);
    try {
      const widgets = await loadAllCustomWidgets(supabase, isAdmin, customerId);
      setCustomWidgets(widgets);
    } catch (err) {
      console.error('Error loading custom widgets:', err);
      setCustomWidgets([]);
    } finally {
      setIsLoadingCustom(false);
    }
  };

  const systemWidgets = useMemo((): WidgetWithMeta[] => {
    return Object.values(widgetLibrary)
      .filter(w => !(w.adminOnly && !isAdmin))
      .map(w => ({
        ...w,
        isRecommended: RECOMMENDED_WIDGET_IDS.includes(w.id),
      }));
  }, [isAdmin]);

  const customWidgetsWithMeta = useMemo((): CustomWidgetWithMeta[] => {
    return customWidgets.map(w => ({ ...w, isCustom: true as const }));
  }, [customWidgets]);

  const allWidgets = useMemo((): AnyWidget[] => {
    return [...systemWidgets, ...customWidgetsWithMeta];
  }, [systemWidgets, customWidgetsWithMeta]);

  const searchFilteredWidgets = useMemo(() => {
    if (!searchQuery) return allWidgets;
    const query = searchQuery.toLowerCase();
    return allWidgets.filter(w =>
      w.name.toLowerCase().includes(query) ||
      w.description.toLowerCase().includes(query) ||
      ('category' in w && w.category.toLowerCase().includes(query))
    );
  }, [allWidgets, searchQuery]);

  const recommendedWidgets = useMemo(() =>
    searchFilteredWidgets.filter(w =>
      !isCustomWidgetType(w) && w.isRecommended && !currentWidgets.includes(w.id)
    ) as WidgetWithMeta[],
    [searchFilteredWidgets, currentWidgets]
  );

  const filteredCustomWidgets = useMemo(() =>
    searchFilteredWidgets.filter(w =>
      isCustomWidgetType(w) && !currentWidgets.includes(w.id)
    ) as CustomWidgetWithMeta[],
    [searchFilteredWidgets, currentWidgets]
  );

  const handleAdd = () => {
    if (selectedWidget) {
      onAddWidget(selectedWidget.id);
      onClose();
    }
  };

  const handleBrowseLibrary = () => {
    onClose();
    navigate('/widget-library');
  };

  const getWidgetIcon = (widget: AnyWidget) => {
    if (isCustomWidgetType(widget)) {
      return typeIcons[widget.type] || Package;
    }
    return typeIcons[widget.type] || Package;
  };

  const getWidgetIconColor = (widget: AnyWidget) => {
    if (isCustomWidgetType(widget)) {
      return widget.display?.iconColor || 'bg-slate-500';
    }
    return widget.iconColor || 'bg-slate-500';
  };

  const renderWidgetCard = (widget: AnyWidget) => {
    const Icon = getWidgetIcon(widget);
    const isOnDashboard = currentWidgets.includes(widget.id);
    const isSelected = selectedWidget?.id === widget.id;
    const isCustom = isCustomWidgetType(widget);
    const iconColor = getWidgetIconColor(widget);

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
              : isCustom
                ? 'border-teal-200 bg-teal-50 hover:border-teal-300'
                : !isCustomWidgetType(widget) && widget.isRecommended
                  ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                  : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50'
          }
        `}
      >
        {isCustom && !isOnDashboard && (
          <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-teal-500 text-white text-xs font-bold">
            CUSTOM
          </span>
        )}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 ${iconColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
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
              <h2 className="text-lg font-semibold text-slate-900">Add Widget</h2>
              <p className="text-sm text-slate-500">Choose widgets to customize your view</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBrowseLibrary}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Layers className="w-4 h-4" />
              Browse Widget Library
              <ExternalLink className="w-3 h-3" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
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

              {recommendedWidgets.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedRecommended(!expandedRecommended)}
                    className="flex items-center gap-2 mb-3 w-full text-left"
                  >
                    <Star className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Recommended</h3>
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

              {filteredCustomWidgets.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedCustom(!expandedCustom)}
                    className="flex items-center gap-2 mb-3 w-full text-left"
                  >
                    <Sparkles className="w-4 h-4 text-teal-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Custom Widgets</h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-600 text-xs font-semibold">
                      {filteredCustomWidgets.length}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${expandedCustom ? '' : '-rotate-90'}`} />
                  </button>
                  {expandedCustom && (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredCustomWidgets.map(renderWidgetCard)}
                    </div>
                  )}
                </div>
              )}

              {isLoadingCustom && filteredCustomWidgets.length === 0 && (
                <div className="text-center py-4">
                  <div className="animate-pulse flex items-center justify-center gap-2 text-slate-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">Loading custom widgets...</span>
                  </div>
                </div>
              )}

              <div>
                <button
                  onClick={() => setShowAllWidgets(!showAllWidgets)}
                  className="flex items-center gap-2 mb-3 w-full text-left pt-4 border-t border-slate-200"
                >
                  <Package className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">All System Widgets</h3>
                  <span className="text-xs text-slate-400">({systemWidgets.length})</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${showAllWidgets ? '' : '-rotate-90'}`} />
                </button>
                {showAllWidgets && (
                  <div className="grid grid-cols-2 gap-3">
                    {systemWidgets.map(renderWidgetCard)}
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
                    <div className={`w-6 h-6 ${getWidgetIconColor(selectedWidget)} rounded-lg flex items-center justify-center`}>
                      {createElement(getWidgetIcon(selectedWidget), { className: 'w-3 h-3 text-white' })}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{selectedWidget.name}</span>
                  </div>
                  <div className="p-3">
                    <WidgetSkeleton widgetType={selectedWidget.type} size={2} showHeader={false} />
                  </div>
                </div>

                <div className="text-sm text-slate-600 mb-4">{selectedWidget.description}</div>

                {isCustomWidgetType(selectedWidget) && selectedWidget.createdBy && (
                  <div className="text-xs text-slate-400 mb-4">
                    Created by {selectedWidget.createdBy.customerName || selectedWidget.createdBy.userEmail}
                  </div>
                )}

                <button
                  onClick={handleAdd}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors mt-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add Widget
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
