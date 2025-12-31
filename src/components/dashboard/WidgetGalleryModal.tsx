import { useState, useMemo, useEffect, createElement } from 'react';
import {
  X, Search, Plus, Star, TrendingUp,
  Package, DollarSign, PieChart, BarChart3, Map, Table, Globe,
  ChevronRight, Sparkles, Lock
} from 'lucide-react';
import { widgetLibrary, WidgetDefinition } from '../../config/widgetLibrary';
import { WidgetSkeleton } from './WidgetSkeleton';
import {
  getWidgetConstraints,
  isValidWidgetSize,
  getSizeLabel,
  WidgetSizeConstraint
} from '../../config/widgetConstraints';

interface WidgetGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widgetId: string, size: WidgetSizeConstraint) => void;
  currentWidgets: string[];
  isAdmin: boolean;
}

type CollectionId = 'popular' | 'financial' | 'geographic' | 'performance' | 'all';

interface Collection {
  id: CollectionId;
  name: string;
  description: string;
  icon: typeof Star;
  filter: (widget: WidgetDefinition) => boolean;
}

const collections: Collection[] = [
  {
    id: 'popular',
    name: 'Popular',
    description: 'Most used widgets',
    icon: Star,
    filter: (w) => ['total_shipments', 'total_cost', 'monthly_spend', 'flow_map', 'carrier_mix'].includes(w.id),
  },
  {
    id: 'financial',
    name: 'Financial',
    description: 'Cost and revenue metrics',
    icon: DollarSign,
    filter: (w) => w.category === 'financial',
  },
  {
    id: 'geographic',
    name: 'Geographic',
    description: 'Maps and location data',
    icon: Globe,
    filter: (w) => w.category === 'geographic',
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'KPIs and metrics',
    icon: TrendingUp,
    filter: (w) => w.category === 'performance' || w.category === 'volume',
  },
  {
    id: 'all',
    name: 'All Widgets',
    description: 'Browse everything',
    icon: Package,
    filter: () => true,
  },
];

const typeIcons: Record<string, typeof Star> = {
  kpi: TrendingUp,
  featured_kpi: Star,
  bar_chart: BarChart3,
  line_chart: TrendingUp,
  pie_chart: PieChart,
  table: Table,
  map: Map,
};

export function WidgetGalleryModal({
  isOpen,
  onClose,
  onAddWidget,
  currentWidgets,
  isAdmin,
}: WidgetGalleryModalProps) {
  const [activeCollection, setActiveCollection] = useState<CollectionId>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWidget, setSelectedWidget] = useState<WidgetDefinition | null>(null);
  const [selectedSize, setSelectedSize] = useState<WidgetSizeConstraint>(1);

  useEffect(() => {
    if (isOpen) {
      setActiveCollection('popular');
      setSearchQuery('');
      setSelectedWidget(null);
      setSelectedSize(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedWidget) {
      const constraints = getWidgetConstraints(selectedWidget.id, selectedWidget.type);
      setSelectedSize(constraints.optimalSize);
    }
  }, [selectedWidget]);

  const allWidgets = useMemo(() => {
    return Object.values(widgetLibrary).filter(w => {
      if (w.adminOnly && !isAdmin) return false;
      return true;
    });
  }, [isAdmin]);

  const filteredWidgets = useMemo(() => {
    let widgets = allWidgets;

    const collection = collections.find(c => c.id === activeCollection);
    if (collection) {
      widgets = widgets.filter(collection.filter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      widgets = widgets.filter(w =>
        w.name.toLowerCase().includes(query) ||
        w.description.toLowerCase().includes(query)
      );
    }

    return widgets;
  }, [allWidgets, activeCollection, searchQuery]);

  const handleAdd = () => {
    if (selectedWidget) {
      onAddWidget(selectedWidget.id, selectedSize);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

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
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 border-r border-slate-200 p-4 flex-shrink-0">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Collections
            </div>
            <nav className="space-y-1">
              {collections.map((collection) => {
                const Icon = collection.icon;
                const isActive = activeCollection === collection.id;

                return (
                  <button
                    key={collection.id}
                    onClick={() => setActiveCollection(collection.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                      ${isActive
                        ? 'bg-orange-50 text-orange-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {collection.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search widgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredWidgets.map((widget) => {
                  const Icon = typeIcons[widget.type] || Package;
                  const isOnDashboard = currentWidgets.includes(widget.id);
                  const isSelected = selectedWidget?.id === widget.id;

                  return (
                    <button
                      key={widget.id}
                      onClick={() => !isOnDashboard && setSelectedWidget(widget)}
                      disabled={isOnDashboard}
                      className={`
                        p-4 rounded-xl border-2 text-left transition-all
                        ${isOnDashboard
                          ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                          : isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${widget.iconColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
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
                })}
              </div>

              {filteredWidgets.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No widgets found</p>
                  <p className="text-sm text-slate-400 mt-1">Try adjusting your search</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-80 border-l border-slate-200 p-4 bg-slate-50 flex-shrink-0 flex flex-col">
            {selectedWidget ? (
              <>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                  Preview
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
                    <div className={`w-6 h-6 ${selectedWidget.iconColor} rounded-lg flex items-center justify-center`}>
                      {createElement(typeIcons[selectedWidget.type] || Package, {
                        className: 'w-3 h-3 text-white'
                      })}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{selectedWidget.name}</span>
                  </div>
                  <div className="p-3">
                    <WidgetSkeleton
                      widgetType={selectedWidget.type}
                      size={selectedSize}
                      showHeader={false}
                    />
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
                            ${isActive
                              ? 'bg-orange-500 text-white'
                              : isValid
                                ? 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }
                          `}
                        >
                          {!isValid && (
                            <Lock className="w-3 h-3 absolute top-1 right-1 text-slate-400" />
                          )}
                          {getSizeLabel(size)}
                          {isOptimal && isValid && !isActive && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-sm text-slate-600 mb-4">
                  <p>{selectedWidget.description}</p>
                </div>

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
